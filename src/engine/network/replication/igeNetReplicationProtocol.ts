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
 *         creates:   handle, kind (kindBits), id (string), [level bit: kinds with relevance "spatial"
 *                    only: 1 full, 0 blip], then every field in order (a blip: just the blip fields)
 *         updates:   handle, [level bit, as above], field mask (a bit per field), the masked fields
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
	/** On a destroyed handle: the packet that destroyed it. */
	seq?: number;
}

/** The detail an object of a spatial kind is sent at: everything, or just its blip fields. */
export type IgeNetDetail = "full" | "blip";

export interface IgeNetDecodedSnapshot extends IgeNetSnapshotHeader {
	/** The ids of objects gone, as the table knew them. */
	destroys: { handle: number; id?: string }[];
	/** `level` is set for kinds with detail levels; `gone` when the object was destroyed already (an old packet arriving late): ignore it. */
	creates: { handle: number; id: string; kind: string; values: Record<string, unknown>; level?: IgeNetDetail; gone?: boolean }[];
	/** Changed fields only. */
	updates: { handle: number; id: string; kind: string; values: Record<string, unknown>; level?: IgeNetDetail; gone?: boolean }[];
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
	table: Map<number, IgeNetHandleEntry>,
	dead?: Map<number, IgeNetHandleEntry>
): IgeNetDecodedSnapshot {
	const out: IgeNetDecodedSnapshot = { ...header, destroys: [], creates: [], updates: [] };
	if (!header.flags) return out;
	const handleBits = r.readBits(6);
	if (header.flags & 1) {
		const count = r.readVarUint();
		for (let i = 0; i < count; i++) {
			const handle = r.readBits(handleBits);
			const entry = table.get(handle);
			out.destroys.push({ handle, id: entry?.id });
			// Remembered, so a packet from before the destroy arriving late can still be read (and ignored)
			if (entry && dead) dead.set(handle, { ...entry, seq: header.seq });
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
			const level: IgeNetDetail | undefined = schema.leveled ? (r.readBits(1) ? "full" : "blip") : undefined;
			const values = level === "blip" ? schema.readBlip(r) : schema.readAll(r);
			const tomb = dead?.get(handle);
			const gone = !!tomb && tomb.id === id && header.seq < (tomb.seq ?? 0);
			if (!gone) {
				table.set(handle, { id, schema });
				dead?.delete(handle);
			}
			out.creates.push({ handle, id, kind: schema.name, values, level, gone });
		}
	}
	if (header.flags & 4) {
		const count = r.readVarUint();
		for (let i = 0; i < count; i++) {
			const handle = r.readBits(handleBits);
			const entry = table.get(handle);
			const tomb = entry ? undefined : dead?.get(handle);
			const known = entry ?? tomb;
			if (!known) throw new RangeError(`Update for unknown handle ${handle}`);
			const level: IgeNetDetail | undefined = known.schema.leveled ? (r.readBits(1) ? "full" : "blip") : undefined;
			out.updates.push({ handle, id: known.id, kind: known.schema.name, values: known.schema.readMasked(r), level, gone: !entry });
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
	_dead: Map<number, IgeNetHandleEntry> = new Map();

	constructor (schemas: IgeNetSchemaSet, inputSchema?: IgeNetSchema) {
		this._schemas = schemas;
		this._inputSchema = inputSchema;
	}

	/** Forget the handles seen (a new connection). */
	reset (): void {
		this._table.clear();
		this._dead.clear();
	}

	describe (bytes: Uint8Array, options: { slots?: number } = {}): Record<string, unknown> {
		const type = igeNetPacketType(bytes);
		const base = { type: type === IGE_NET_PACKET_SNAPSHOT ? "snapshot" : type === IGE_NET_PACKET_INPUT ? "input" : "unknown", bytes: bytes.length };
		try {
			const r = new IgeNetBitReader(bytes);
			if (type === IGE_NET_PACKET_SNAPSHOT) {
				const header = igeNetReadSnapshotHeader(r);
				return { ...base, ...igeNetReadSnapshotBody(r, header, this._schemas, this._table, this._dead) };
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
