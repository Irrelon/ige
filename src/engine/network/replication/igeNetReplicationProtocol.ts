import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import type { IgeNetSchema, IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";

/**
 * Messages of IGE's replication layer (IgeNetReplicationHost / IgeNetReplicationClient).
 *
 * Control messages (join, welcome, ping, pong, reliable events, errors) are small JSON objects.
 * The two that flow every tick are binary (Uint8Array):
 *
 * Snapshot packet, authority to machine (bit-packed, most significant bit first):
 *     4 bits  type (1)            4 bits flags (1 destroys, 2 creates, 4 updates)
 *     varuint seq                 the packet's sequence number (the machine acks it)
 *     varuint tick                the authority's tick when it was made
 *     varuint inputAck            the machine's newest input frame the authority has applied
 *     6 bits  handleBits          (only when any flag is set) bits in a handle
 *     per section present: varuint count, then
 *         destroys:  handle
 *         creates:   handle, kind (kindBits), id (string), every field in order
 *         updates:   handle, field mask (a bit per field), the masked fields
 *
 * Input packet, machine to authority:
 *     4 bits type (2), 4 spare    varuint newest frame seq
 *     varuint ackSeq              newest snapshot packet seen (0: none)
 *     32 bits ackBits             bit i: packet ackSeq - 1 - i was seen too
 *     8 bits  frame count         then each frame, oldest first: varuint (newest - seq),
 *                                 then each local player's input, every field in order
 */
export const IGE_NET_PACKET_SNAPSHOT = 1;
export const IGE_NET_PACKET_INPUT = 2;

export interface IgeNetSnapshotHeader {
	seq: number;
	tick: number;
	inputAck: number;
	flags: number;
}

/** What a client knows of a handle. */
export interface IgeNetHandleEntry {
	id: string;
	schema: IgeNetSchema;
}

export interface IgeNetDecodedSnapshot extends IgeNetSnapshotHeader {
	/** The ids of objects gone, as the table knew them. */
	destroys: { handle: number; id?: string }[];
	creates: { handle: number; id: string; kind: string; values: Record<string, unknown> }[];
	/** Changed fields only. */
	updates: { handle: number; id: string; kind: string; values: Record<string, unknown> }[];
}

export function igeNetPacketType (bytes: Uint8Array): number {
	return bytes.length ? bytes[0] >>> 4 : 0;
}

export function igeNetReadSnapshotHeader (r: IgeNetBitReader): IgeNetSnapshotHeader {
	const type = r.readBits(4);
	if (type !== IGE_NET_PACKET_SNAPSHOT) throw new RangeError("Not a snapshot packet");
	const flags = r.readBits(4);
	return { flags, seq: r.readVarUint(), tick: r.readVarUint(), inputAck: r.readVarUint() };
}

/**
 * Reads the sections after a header, keeping `table` (handle to object) in step: destroys remove
 * from it, creates add. Throws on a malformed packet or a handle the table doesn't have.
 */
export function igeNetReadSnapshotBody (
	r: IgeNetBitReader,
	header: IgeNetSnapshotHeader,
	schemas: IgeNetSchemaSet,
	table: Map<number, IgeNetHandleEntry>
): IgeNetDecodedSnapshot {
	const out: IgeNetDecodedSnapshot = { ...header, destroys: [], creates: [], updates: [] };
	if (!header.flags) return out;
	const handleBits = r.readBits(6);
	if (header.flags & 1) {
		const count = r.readVarUint();
		for (let i = 0; i < count; i++) {
			const handle = r.readBits(handleBits);
			out.destroys.push({ handle, id: table.get(handle)?.id });
			table.delete(handle);
		}
	}
	if (header.flags & 2) {
		const count = r.readVarUint();
		for (let i = 0; i < count; i++) {
			const handle = r.readBits(handleBits);
			const kindIndex = r.readBits(schemas.kindBits);
			const schema = schemas.kinds[kindIndex];
			if (!schema) throw new RangeError("Unknown kind");
			const id = r.readString();
			const values = schema.readAll(r);
			table.set(handle, { id, schema });
			out.creates.push({ handle, id, kind: schema.name, values });
		}
	}
	if (header.flags & 4) {
		const count = r.readVarUint();
		for (let i = 0; i < count; i++) {
			const handle = r.readBits(handleBits);
			const entry = table.get(handle);
			if (!entry) throw new RangeError(`Update for unknown handle ${handle}`);
			out.updates.push({ handle, id: entry.id, kind: entry.schema.name, values: entry.schema.readMasked(r) });
		}
	}
	return out;
}

export interface IgeNetInputFrameBinary<Input> {
	seq: number;
	inputs: Input[];
}

export interface IgeNetInputPacket<Input> {
	/** The newest snapshot packet the machine has seen, and the 32 before it as bits. */
	ackSeq: number;
	ackBits: number;
	frames: IgeNetInputFrameBinary<Input>[];
}

/** Writes an input packet: frames oldest first, `slots` inputs in each. */
export function igeNetWriteInputPacket<Input extends Record<string, unknown>> (
	w: IgeNetBitWriter,
	schema: IgeNetSchema,
	ackSeq: number,
	ackBits: number,
	frames: IgeNetInputFrameBinary<Input>[]
): void {
	const newest = frames.length ? frames[frames.length - 1].seq : 0;
	w.writeBits(IGE_NET_PACKET_INPUT, 4);
	w.writeBits(0, 4);
	w.writeVarUint(newest);
	w.writeVarUint(ackSeq);
	w.writeBits(ackBits >>> 0, 32);
	w.writeBits(frames.length, 8);
	for (const frame of frames) {
		w.writeVarUint(newest - frame.seq);
		for (const input of frame.inputs) schema.writeAll(w, input);
	}
}

export function igeNetReadInputPacket (r: IgeNetBitReader, schema: IgeNetSchema, slots: number): IgeNetInputPacket<Record<string, unknown>> {
	if (r.readBits(4) !== IGE_NET_PACKET_INPUT) throw new RangeError("Not an input packet");
	r.readBits(4);
	const newest = r.readVarUint();
	const ackSeq = r.readVarUint();
	const ackBits = r.readBits(32);
	const count = r.readBits(8);
	const frames: IgeNetInputFrameBinary<Record<string, unknown>>[] = [];
	for (let i = 0; i < count; i++) {
		const seq = newest - r.readVarUint();
		const inputs: Record<string, unknown>[] = [];
		for (let slot = 0; slot < slots; slot++) inputs.push(schema.readAll(r));
		frames.push({ seq, inputs });
	}
	return { ackSeq, ackBits, frames };
}

/**
 * Turns binary replication messages into readable JSON, for debugging and tests (log what a
 * connection sends). Updates name their object by the handle table the earlier packets built, so
 * feed it a connection's packets in order from the start; one it can't follow comes back with an
 * `error`.
 * @example #See what the authority sends a machine
 *     const inspector = new IgeNetPacketInspector(schemas, inputSchema);
 *     console.log(JSON.stringify(inspector.describe(bytes)));
 */
export class IgeNetPacketInspector {
	_schemas: IgeNetSchemaSet;
	_inputSchema?: IgeNetSchema;
	_table: Map<number, IgeNetHandleEntry> = new Map();

	constructor (schemas: IgeNetSchemaSet, inputSchema?: IgeNetSchema) {
		this._schemas = schemas;
		this._inputSchema = inputSchema;
	}

	/** Forget the handles seen (a new connection). */
	reset (): void {
		this._table.clear();
	}

	describe (bytes: Uint8Array, options: { slots?: number } = {}): Record<string, unknown> {
		const type = igeNetPacketType(bytes);
		const base = { type: type === IGE_NET_PACKET_SNAPSHOT ? "snapshot" : type === IGE_NET_PACKET_INPUT ? "input" : "unknown", bytes: bytes.length };
		try {
			const r = new IgeNetBitReader(bytes);
			if (type === IGE_NET_PACKET_SNAPSHOT) {
				const header = igeNetReadSnapshotHeader(r);
				return { ...base, ...igeNetReadSnapshotBody(r, header, this._schemas, this._table) };
			}
			if (type === IGE_NET_PACKET_INPUT && this._inputSchema) {
				return { ...base, ...igeNetReadInputPacket(r, this._inputSchema, options.slots ?? 1) };
			}
			return base;
		} catch (error) {
			return { ...base, error: (error as Error).message };
		}
	}
}
