import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import { IgeNetSchema, IgeNetSchemaSet, igeNetSchemaHash, type IgeNetFieldDef, type IgeNetKindOptions } from "@/engine/network/replication/IgeNetSchema";
import {
	IGE_NET_PACKET_SNAPSHOT,
	type IgeNetDetail,
	igeNetPacketType,
	igeNetReadSnapshotBody,
	igeNetReadSnapshotHeader,
	igeNetWriteInputPacket,
	IgeNetSliceAssembly,
	type IgeNetHandleEntry,
	type IgeNetInputFrameBinary
} from "@/engine/network/replication/igeNetReplicationProtocol";
import { IGE_NET_JSON_MISSING, IgeNetJsonStore, IgeNetJsonWire } from "@/engine/network/replication/igeNetJsonDelta";
import type { IgeNetConnection } from "@/engine/network/sync/IgeNetTransport";
import type { IgeNetWelcome } from "@/engine/network/sync/igeNetSyncProtocol";

export interface IgeNetReplicationClientOptions {
	/** The kinds of object, the same as the host's. */
	schemas: IgeNetSchemaSet | Record<string, Record<string, IgeNetFieldDef>>;
	/** Kind options (relevance, position, blip), when `schemas` is plain definitions: the same as the host's. */
	kinds?: Record<string, IgeNetKindOptions>;
	/** What one player's input is, the same as the host's. */
	inputSchema?: IgeNetSchema | Record<string, IgeNetFieldDef>;
	/** How far behind the newest state other objects are drawn, in ms (default 100). */
	interpolationDelay?: number;
	/** Input frames repeated in each packet, so a lost one costs nothing (default 3). */
	inputRedundancy?: number;
	/** Ticks of each object's past kept for interpolation (default 32). */
	history?: number;
	now?: () => number;
	/** Ping interval in ms (default 1000; 0 turns pinging off). */
	pingInterval?: number;
	/** Give up on the authority when nothing's been heard for this long, in ms (default 10000; 0 waits forever). */
	timeout?: number;
	/** How transfer() connects to another zone's url (default: a WebSocket). */
	connect?: (url: string) => IgeNetConnection | Promise<IgeNetConnection>;
}

/** One state of an object at an authority tick. */
export interface IgeNetObjectState {
	tick: number;
	values: Record<string, unknown>;
}

/** A replicated object as this machine has it: its recent states, newest last. */
export interface IgeNetClientObject {
	id: string;
	kind: string;
	schema: IgeNetSchema;
	states: IgeNetObjectState[];
	/** The handle the authority knows it by. */
	handle: number;
	/**
	 * How much of it the authority is sending: "full", or "blip": an unidentified contact. A blip
	 * has no real id or kind here (`id` is a handle of this machine's own, `kind` is "blip") and its
	 * states hold the blip fields alone. When the authority sends it in full the same object
	 * continues under its real id and kind (a "revealed" event), so its position stays smooth.
	 * Going back out of range destroys it and, if it's a blip kind, makes a new anonymous contact.
	 */
	detail: IgeNetDetail;
	/** True while it's an anonymous blip. */
	anon?: boolean;
	held: Record<string, unknown>;
	/** The newest packet that set each field, so packets arriving out of order never put back older data. */
	fieldSeq: number[];
	/** Its json fields' recent versions (patches arrive against one of them). */
	json?: IgeNetJsonStore;
	levelSeq: number;
}

const UNANSWERED_PINGS = 3;
const RESYNC_MS = 500;

/**
 * A machine in a real-time game run by an IgeNetReplicationHost: what IgeNetSyncClient is for
 * IgeNetSyncHost, on binary packets. It joins with its local players, sends their inputs every
 * tick (quantised, the last few frames repeated, acknowledging the newest packets it has seen) and
 * keeps the objects the authority tells it of: created, updated field by field, destroyed. Each
 * object keeps its recent states, so:
 *
 * - interpolated(): every object a little in the past (interpolationDelay), blended between
 *   states (angle fields the short way round, fields marked `blend: false` stepping);
 * - predict(): one of this machine's own players, from its newest state with the inputs the
 *   authority hasn't applied yet replayed on top through the game's own rule.
 *
 * Objects that aren't written stay as they were (the authority sends nothing about them), so one
 * with a single state costs nothing to interpolate.
 *
 * Events: "welcome", "snapshot" (tick: after each packet), "created" (object), "destroyed" (id, kind),
 * "event" (data, tick), "error" (message), "disconnected", "transfer" ({ url }), "transferred"
 * (IgeNetWelcome), "transferFailed" (Error).
 * @example #Join and draw the world
 *     const client = new IgeNetReplicationClient(connection, { schemas, inputSchema });
 *     const welcome = await client.join([{ name: "Ann" }]);
 *     client.sendInput([{ thrust: 1 }]); // every tick
 *     const world = client.interpolated(); // every frame: id to fields
 *     const me = client.predict(welcome.players[0], 0, (state, input, dt) => move(state, input, dt));
 */
export class IgeNetReplicationClient<Input = Record<string, unknown>> extends IgeEventingClass {
	classId = "IgeNetReplicationClient";
	machine?: string;
	players: string[] = [];
	tickRate = 30;
	rtt = 0;
	info: unknown;
	readonly schemas: IgeNetSchemaSet;
	readonly inputSchema: IgeNetSchema;
	/** The objects it knows of, by id. */
	objects: Map<string, IgeNetClientObject> = new Map();
	transferring = false;
	/** Bytes received in snapshot packets, and how many packets. */
	bytesReceived = 0;
	packetsReceived = 0;
	_connection: IgeNetConnection;
	_options: IgeNetReplicationClientOptions;
	_now: () => number;
	_hash: string;
	_lastHeard = 0;
	_unanswered = 0;
	_seq = 0;
	_pending: IgeNetInputFrameBinary<Input>[] = [];
	_ticks: Map<string, { seq: number; previous: Record<string, unknown>; current: Record<string, unknown> }> = new Map();
	/** handle to object, as the packets define them. */
	_table: Map<number, IgeNetHandleEntry> = new Map();
	_dead: Map<number, IgeNetHandleEntry> = new Map();
	/** Big entries arriving in slices. */
	_slices = new IgeNetSliceAssembly();
	/** The newest snapshot packet applied, the newest seen (for acks) and the bits before it. */
	_applied = 0;
	_recvSeq = 0;
	_recvBits = 0;
	_latestTick = 0;
	/** The tick of the round before the newest one. */
	_priorTick = 0;
	_offset?: number;
	_ref = 0;
	_joining?: { ref: number; resolve: (w: IgeNetWelcome) => void; reject: (e: Error) => void };
	_pingTimer?: ReturnType<typeof setInterval>;
	_generation = 0;
	_writer = new IgeNetBitWriter(256);

	constructor (connection: IgeNetConnection, options: IgeNetReplicationClientOptions) {
		super();
		this._connection = connection;
		this._options = options;
		this._now = options.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
		this.schemas = options.schemas instanceof IgeNetSchemaSet ? options.schemas : new IgeNetSchemaSet(options.schemas, options.kinds);
		this.inputSchema = options.inputSchema instanceof IgeNetSchema ? options.inputSchema : new IgeNetSchema("input", options.inputSchema ?? {});
		this._hash = igeNetSchemaHash(this.schemas, this.inputSchema);
		this._attach(connection);
	}

	_attach (connection: IgeNetConnection): void {
		const generation = ++this._generation;
		this._connection = connection;
		connection.onMessage((data) => {
			if (generation === this._generation) this._onMessage(data);
		});
		connection.onClose(() => {
			if (generation !== this._generation) return;
			this._stopPing();
			this._joining?.reject(new Error("Disconnected"));
			this._joining = undefined;
			this.emit("disconnected");
		});
	}

	/**
	 * Moves to another zone's authority with a ticket (see IgeNetSyncClient.transfer): the old
	 * connection closes, the new one is joined, and the world starts afresh from its packets (its
	 * objects, clock and unapplied inputs are dropped).
	 */
	async transfer (target: { url: string; ticket?: string; players?: unknown[] }): Promise<IgeNetWelcome> {
		this.transferring = true;
		this.emit("transfer", { url: target.url });
		const old = this._connection;
		this._stopPing();
		this._joining?.reject(new Error("Transferred"));
		this._joining = undefined;
		this._generation++;
		try {
			old.send({ t: "leave" });
			old.close();
		} catch {
			// Gone already
		}
		this._reset();
		try {
			const connect = this._options.connect ?? (async (url: string) => (await import("@/engine/network/sync/igeNetWebSocket")).igeNetWebSocketConnect(url));
			this._attach(await connect(target.url));
			const ref = ++this._ref;
			const welcome = await new Promise<IgeNetWelcome>((resolve, reject) => {
				this._joining = { ref, resolve, reject };
				this._send(target.ticket === undefined ? { t: "join", ref, players: target.players ?? [] } : { t: "join", ref, players: [], ticket: target.ticket });
			});
			this.transferring = false;
			this.emit("transferred", welcome);
			return welcome;
		} catch (error) {
			this.transferring = false;
			this.emit("transferFailed", error);
			throw error;
		}
	}

	/** Forget everything of the authority being left. */
	_reset (): void {
		this.objects.clear();
		this._table.clear();
		this._dead.clear();
		this._slices.clear();
		this._pending = [];
		this._ticks.clear();
		this._applied = this._recvSeq = this._recvBits = this._latestTick = this._priorTick = 0;
		this._offset = undefined;
		this._lastHeard = this._now();
		this._unanswered = 0;
	}

	/** Join with this machine's local players (game-defined descriptions), and a zone ticket if it has one. */
	join (players: unknown[], ticket?: string): Promise<IgeNetWelcome> {
		const ref = ++this._ref;
		return new Promise((resolve, reject) => {
			this._joining = { ref, resolve, reject };
			this._send(ticket === undefined ? { t: "join", ref, players } : { t: "join", ref, players, ticket });
		});
	}

	leave (): void {
		this._send({ t: "leave" });
		this._stopPing();
	}

	/**
	 * Send this tick's inputs for the machine's players (in slot order), once per tick. Also
	 * acknowledges the authority's packets: a lossy transport needs it every tick. Returns the
	 * frame's sequence number.
	 */
	sendInput (inputs: Input[]): number {
		const slots = this.players.length;
		const canonical: Input[] = [];
		for (let slot = 0; slot < slots; slot++) canonical.push(this.inputSchema.canonical(inputs[slot] as Record<string, unknown>) as Input);
		const frame: IgeNetInputFrameBinary<Input> = { seq: ++this._seq, inputs: canonical };
		this._pending.push(frame);
		if (this._pending.length > 256) this._pending.shift();
		const redundancy = Math.max(1, this._options.inputRedundancy ?? 3);
		const w = this._writer;
		w.reset();
		igeNetWriteInputPacket(w, this.inputSchema, this._recvSeq, this._recvBits, this._pending.slice(-redundancy) as IgeNetInputFrameBinary<Record<string, unknown>>[]);
		this._connection.send(w.toBytes(), false);
		return frame.seq;
	}

	/** Input frames the authority hasn't applied yet, oldest first. */
	pendingInputs (): IgeNetInputFrameBinary<Input>[] {
		return this._pending;
	}

	/** The tick of the newest packet applied. */
	latestTick (): number {
		return this._latestTick;
	}

	/** An object's newest values (the client's own: don't change them). */
	latest (id: string): Record<string, unknown> | undefined {
		const states = this.objects.get(id)?.states;
		return states?.[states.length - 1].values;
	}

	/** How much of an object the authority is sending: "full" or "blip" (see IgeNetClientObject.detail). */
	detailOf (id: string): IgeNetDetail | undefined {
		return this.objects.get(id)?.detail;
	}

	kindOf (id: string): string | undefined {
		return this.objects.get(id)?.kind;
	}

	/** The authority's current tick as this machine estimates it (fractional). */
	serverTick (): number {
		if (this._offset === undefined) return this._latestTick;
		return ((this._now() - this._offset) * this.tickRate) / 1000;
	}

	/**
	 * Every object as it was interpolationDelay ms ago, blended between the states either side of
	 * that time. The map is the caller's (put a predicted player in it); the values in it may be the
	 * client's own, so replace them rather than changing them.
	 */
	interpolated (): Record<string, Record<string, unknown>> {
		const out: Record<string, Record<string, unknown>> = {};
		if (!this.objects.size) return out;
		const renderTick = this.serverTick() - ((this._options.interpolationDelay ?? 100) * this.tickRate) / 1000;
		for (const [id, obj] of this.objects) {
			const states = obj.states;
			if (states.length === 1) {
				out[id] = states[0].values;
				continue;
			}
			let i = states.length - 1;
			while (i >= 0 && states[i].tick > renderTick) i--;
			if (i < 0) out[id] = states[0].values;
			else if (i === states.length - 1) out[id] = states[i].values;
			else {
				const a = states[i], b = states[i + 1];
				out[id] = blendValues(obj.schema, a.values, b.values, Math.min(1, (renderTick - a.tick) / (b.tick - a.tick)));
			}
		}
		return out;
	}

	_blendAt (obj: IgeNetClientObject, renderTick: number): Record<string, unknown> {
		const states = obj.states;
		let i = states.length - 1;
		while (i >= 0 && states[i].tick > renderTick) i--;
		if (i < 0) return states[0].values;
		if (i === states.length - 1) return states[i].values;
		const a = states[i], b = states[i + 1];
		return blendValues(obj.schema, a.values, b.values, Math.min(1, (renderTick - a.tick) / (b.tick - a.tick)));
	}

	/**
	 * One of this machine's own players, predicted: its newest state with every input the
	 * authority hasn't applied yet replayed through `apply` (the game's own movement rules). With
	 * `between` (how far this frame is into the next tick, 0 to 1) the state is blended from the
	 * previous tick's prediction to this one, smooth at any frame rate.
	 */
	predict<State extends Record<string, unknown>> (
		id: string,
		slot: number,
		apply: (state: State, input: Input, dt: number) => State,
		options: { between?: number } = {}
	): State | undefined {
		const obj = this.objects.get(id);
		if (!obj) return;
		const base = obj.states[obj.states.length - 1].values as State;
		const dt = 1 / this.tickRate;
		let state = { ...base };
		for (const frame of this._pending) {
			const input = frame.inputs[slot];
			if (input !== undefined) state = apply(state, input, dt);
		}
		if (options.between === undefined) return state;
		let ticks = this._ticks.get(id);
		if (!ticks) {
			ticks = { seq: this._seq, previous: state, current: state };
			this._ticks.set(id, ticks);
		} else if (ticks.seq !== this._seq) {
			ticks.previous = ticks.current;
			ticks.seq = this._seq;
		}
		ticks.current = state;
		return blendValues(obj.schema, ticks.previous, state, Math.max(0, Math.min(1, options.between))) as State;
	}

	destroy (): this {
		this._stopPing();
		this._connection.close();
		return this;
	}

	/** Start the clock again from the next packet (the page came back after being hidden). */
	resync (): void {
		this._offset = undefined;
		this._ticks.clear();
	}

	_send (message: unknown, reliable: boolean = true): void {
		this._connection.send(message, reliable);
	}

	_startPing (): void {
		const interval = this._options.pingInterval ?? 1000;
		if (interval <= 0 || this._pingTimer) return;
		const ping = () => {
			const timeout = this._options.timeout ?? 10000;
			if (timeout > 0 && this._unanswered >= UNANSWERED_PINGS && this._now() - this._lastHeard > timeout) {
				this._connection.close();
				return;
			}
			this._unanswered++;
			this._send({ t: "ping", time: this._now() }, false);
		};
		ping();
		this._pingTimer = setInterval(ping, interval);
	}

	_stopPing (): void {
		if (this._pingTimer) clearInterval(this._pingTimer);
		this._pingTimer = undefined;
	}

	_syncClock (tick: number, oneWay: number): void {
		const sample = this._now() - oneWay - (tick * 1000) / this.tickRate;
		if (this._offset === undefined || sample - this._offset > RESYNC_MS) {
			this._offset = sample;
			return;
		}
		this._offset = Math.min(sample, this._offset + (sample - this._offset) * 0.05);
	}

	/** Notes a snapshot packet's sequence number, for the acknowledgements in the next inputs. */
	_noteSeq (seq: number): void {
		if (seq > this._recvSeq) {
			const shift = seq - this._recvSeq;
			if (this._recvSeq === 0) this._recvBits = 0;
			else if (shift > 32) this._recvBits = 0;
			else if (shift === 32) this._recvBits = 0x80000000;
			else this._recvBits = ((this._recvBits << shift) | (1 << (shift - 1))) >>> 0;
			this._recvSeq = seq;
		} else {
			const distance = this._recvSeq - seq;
			if (distance >= 1 && distance <= 32) this._recvBits = (this._recvBits | (2 ** (distance - 1))) >>> 0;
		}
	}

	_onMessage (data: unknown): void {
		if (data instanceof Uint8Array) {
			this._lastHeard = this._now();
			this._unanswered = 0;
			if (igeNetPacketType(data) === IGE_NET_PACKET_SNAPSHOT) this._onPacket(data);
			return;
		}
		const message = data as { t: string } & Record<string, any>;
		if (!message || typeof message !== "object") return;
		this._lastHeard = this._now();
		this._unanswered = 0;
		switch (message.t) {
			case "welcome": {
				if (message.schema !== this._hash) {
					const joining = this._joining;
					this._joining = undefined;
					joining?.reject(new Error("The authority's schemas differ from this client's"));
					this._connection.close();
					return;
				}
				this.machine = message.machine;
				this.players = message.players;
				this.tickRate = message.tickRate;
				this.info = message.info;
				this._syncClock(message.tick, 0);
				this._startPing();
				const joining = this._joining;
				this._joining = undefined;
				joining?.resolve(message as unknown as IgeNetWelcome);
				this.emit("welcome", message);
				break;
			}
			case "error":
				if (this._joining && message.ref === this._joining.ref) {
					this._joining.reject(new Error(message.error));
					this._joining = undefined;
				} else {
					this.emit("error", message.error);
				}
				break;
			case "pong":
				this.rtt = Math.max(0, this._now() - message.time);
				this._syncClock(message.tick, this.rtt / 2);
				break;
			case "event":
				this.emit("event", message.data, message.tick);
				break;
		}
	}

	_onPacket (bytes: Uint8Array): void {
		let header;
		const r = new IgeNetBitReader(bytes);
		try {
			header = igeNetReadSnapshotHeader(r);
		} catch {
			return;
		}
		let packet;
		try {
			packet = igeNetReadSnapshotBody(r, header, this.schemas, this._table, this._dead, this._slices);
		} catch (error) {
			// Not acknowledged, so the authority sends it again
			this.emit("error", `Bad packet: ${(error as Error).message}`);
			return;
		}
		this._noteSeq(header.seq);
		const seq = header.seq;
		// An older packet may arrive after a newer one: what it holds that no newer packet set still counts, but it isn't a new state of the world
		const fresh = seq > this._applied;
		this.bytesReceived += bytes.length;
		this.packetsReceived++;
		// The tick of the last round before this one (a round split over packets shares one tick)
		if (fresh && header.tick !== this._latestTick) this._priorTick = this._latestTick;
		const previousTick = this._priorTick;
		if (fresh) {
			this._applied = seq;
			this._latestTick = header.tick;
			while (this._pending.length && this._pending[0].seq <= header.inputAck) this._pending.shift();
		}

		for (const gone of packet.destroys) {
			if (gone.id === undefined) continue;
			const obj = this.objects.get(gone.id);
			if (!obj || obj.handle !== gone.handle) continue;
			this.objects.delete(gone.id);
			this._ticks.delete(gone.id);
			this.emit("destroyed", gone.id, obj.kind);
		}
		const history = this._options.history ?? 32;
		const push = (obj: IgeNetClientObject, values: Record<string, unknown>, still = 0) => {
			const states = obj.states;
			const last = states[states.length - 1];
			if (!fresh) {
				last.values = values;
				return;
			}
			if (last.tick === header.tick) {
				last.values = values;
				return;
			}
			// Still until the last round (or, when its changes waited, until the tick the authority says), so blending towards this
			// state starts from then, not from the last change
			const stillAt = still ? header.tick - still : previousTick;
			if (stillAt > last.tick && stillAt < header.tick) states.push({ tick: stillAt, values: last.values });
			states.push({ tick: header.tick, values });
			const cutoff = header.tick - history;
			let drop = 0;
			while (states.length - drop > 2 && states[drop + 1].tick <= cutoff) drop++;
			if (drop) states.splice(0, drop);
		};
		/** Applies fields to an object, newest packet winning per field (json fields: newest version). Returns the new current values. */
		const apply = (obj: IgeNetClientObject, incoming: Record<string, unknown>, base: Record<string, unknown>, at: number) => {
			const schema = obj.schema;
			const values = { ...base };
			for (const name in incoming) {
				const field = schema.byName.get(name)!;
				let value = incoming[name];
				if (value instanceof IgeNetJsonWire) {
					// Kept among the field's versions even when it's not the newest (a later patch may be against it)
					const store = (obj.json ??= new IgeNetJsonStore());
					value = store.resolve(field.index, value);
					if (value === IGE_NET_JSON_MISSING) {
						this.emit("error", `${obj.id}.${name}: a patch against a version this machine doesn't have`);
						continue;
					}
					if (!store.newest) continue;
					if (at > obj.fieldSeq[field.index]) obj.fieldSeq[field.index] = at;
					values[name] = value;
					continue;
				}
				if (at <= obj.fieldSeq[field.index]) continue;
				obj.fieldSeq[field.index] = at;
				values[name] = value;
			}
			return values;
		};
		/** A created object's values, json fields made whole (a create sends them whole). */
		const made = (obj: { json?: IgeNetJsonStore; schema: IgeNetSchema }, incoming: Record<string, unknown>) => {
			const values = { ...incoming };
			const jsonIdx = obj.schema.jsonIdx;
			if (!jsonIdx.length) return values;
			obj.json = new IgeNetJsonStore();
			for (const i of jsonIdx) {
				const name = obj.schema.fields[i].name;
				const wire = values[name];
				if (wire instanceof IgeNetJsonWire) {
					const value = obj.json.resolve(i, wire);
					values[name] = value === IGE_NET_JSON_MISSING ? undefined : value;
				}
			}
			return values;
		};
		for (const created of packet.creates) {
			if (created.gone) continue;
			const schema = created.schema ?? this.schemas.kind(created.kind);
			const existing = this.objects.get(created.id);
			if (existing && existing.handle === created.handle && !created.from) {
				const last = existing.states[existing.states.length - 1];
				push(existing, apply(existing, created.values, last.values, created.seq));
				continue;
			}
			const from = created.from ? this.objects.get(created.from) : undefined;
			if (from && from.handle === created.handle) {
				// An anonymous contact now named: the same object goes on under its real id and kind
				this.objects.delete(from.id);
				this._ticks.delete(from.id);
				const anonId = from.id;
				from.id = created.id;
				from.kind = created.kind;
				from.schema = schema;
				from.anon = false;
				from.detail = "full";
				from.fieldSeq = new Array(schema.fields.length).fill(created.seq);
				from.levelSeq = created.seq;
				const old = this.objects.get(created.id);
				if (old) this._ticks.delete(created.id);
				this.objects.set(created.id, from);
				push(from, made(from, created.values));
				this.emit("revealed", from, anonId);
				this.emit("detail", from, "full");
				continue;
			}
			// A new object (or the same id under another handle: the old one is replaced)
			const obj: IgeNetClientObject = {
				id: created.id, kind: created.kind, schema, handle: created.handle, states: [],
				detail: created.anon ? "blip" : "full", anon: created.anon, held: {}, fieldSeq: new Array(schema.fields.length).fill(created.seq), levelSeq: created.seq
			};
			obj.states.push({ tick: header.tick, values: made(obj, created.values) });
			if (existing) this._ticks.delete(created.id);
			this.objects.set(created.id, obj);
			this.emit("created", obj);
		}
		for (const update of packet.updates) {
			if (update.gone) continue;
			const obj = this.objects.get(update.id);
			if (!obj || obj.handle !== update.handle) continue;
			const last = obj.states[obj.states.length - 1];
			push(obj, apply(obj, update.values, last.values, update.seq), update.still);
		}
		if (fresh) {
			this._syncClock(header.tick, this.rtt / 2);
			this.emit("snapshot", header.tick);
		}
	}
}

/** Blend two states of an object by its schema: numbers linearly, angles the short way, anything else steps. */
function blendValues (schema: IgeNetSchema, a: Record<string, unknown>, b: Record<string, unknown>, f: number): Record<string, unknown> {
	if (a === b) return b;
	const out: Record<string, unknown> = {};
	for (const field of schema.fields) {
		// A field the later state doesn't have (a blip has only some) isn't there to show
		if (!(field.name in b)) continue;
		const va = a[field.name], vb = b[field.name];
		if (field.blend !== "none" && typeof va === "number" && typeof vb === "number") {
			out[field.name] = field.blend === "angle" ? lerpAngle(va, vb, f) : va + (vb - va) * f;
		} else {
			out[field.name] = f < 1 && va !== undefined ? va : vb;
		}
	}
	return out;
}

function lerpAngle (a: number, b: number, f: number): number {
	let d = (b - a) % (Math.PI * 2);
	if (d > Math.PI) d -= Math.PI * 2;
	if (d < -Math.PI) d += Math.PI * 2;
	return a + d * f;
}
