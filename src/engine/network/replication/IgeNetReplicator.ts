import { IgeNetBitWriter, igeNetBitsFor } from "@/engine/network/replication/IgeNetBits";
import type { IgeNetSchema, IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { IGE_NET_PACKET_SNAPSHOT } from "@/engine/network/replication/igeNetReplicationProtocol";

/** Where an object is seen and by whom. */
export interface IgeNetObjectOptions {
	/** The scope it belongs to (a star system, a deck): every viewer subscribed to the scope sees it. */
	scope?: string;
	/** Only this viewer sees it (a player's private state); `scope` is then ignored. */
	owner?: IgeNetViewer;
	/** Not seen through its scope: only by viewers it's revealed to (a hidden station a pilot has charted). */
	hidden?: boolean;
}

/** Bytes of an encoded create or update, in the round's arena (shared by every viewer that needs them). */
interface Payload {
	byte: number;
	bits: number;
}

/** What one viewer has of one object: a handle, and the epoch of the state it's known to hold. */
export interface IgeNetViewState {
	obj: IgeNetObject;
	viewer: IgeNetViewer;
	/** The small integer the viewer knows the object by. */
	handle: number;
	/** The viewer has the object (its create was sent on a reliable transport, or acknowledged). */
	known: boolean;
	/** The epoch of the state the viewer is known to have (changes after it are sent). */
	acked: number;
	/** A create has been sent, so a destroy is owed when the object goes. */
	sentEver: boolean;
	dead: boolean;
}

/**
 * One replicated object on the authority: its current field values, and for each field the epoch
 * it last changed in. Games write to it (`write`); the replicator does the rest. Nothing is kept
 * per viewer but a small IgeNetViewState, so an object nobody writes costs nothing per send.
 */
export class IgeNetObject {
	readonly id: string;
	readonly kind: string;
	readonly schema: IgeNetSchema;
	/** Current canonical values, by field name. Read them; change them with write(). */
	readonly values: Record<string, unknown>;
	scope?: string;
	readonly owner?: IgeNetViewer;
	readonly hidden: boolean;
	destroyed = false;
	/** Anything the game wants to keep on the object. */
	data: Record<string, unknown> = {};
	/** Each field's epoch of last change. */
	_changed: Float64Array;
	_lastChange: number;
	_dirty = false;
	_json: (string | undefined)[];
	_rep: IgeNetReplicator;
	/** Viewers that see it. */
	_seenBy: Map<IgeNetViewer, IgeNetViewState> = new Map();
	_revealed: Set<IgeNetViewer> = new Set();
	_excluded: Set<IgeNetViewer> = new Set();
	_round = -1;
	_create?: Payload;
	_updates: Map<number, Payload> = new Map();
	_masks: Map<number, number> = new Map();

	constructor (rep: IgeNetReplicator, schema: IgeNetSchema, id: string, fields: Record<string, unknown>, options: IgeNetObjectOptions) {
		this._rep = rep;
		this.schema = schema;
		this.kind = schema.name;
		this.id = id;
		this.scope = options.scope;
		this.owner = options.owner;
		this.hidden = !!options.hidden;
		this.values = schema.canonical(fields);
		this._json = schema.fields.map((f) => (f.type === "json" && this.values[f.name] !== undefined ? JSON.stringify(this.values[f.name]) ?? "null" : undefined));
		this._changed = new Float64Array(schema.fields.length).fill(rep._epoch);
		this._lastChange = rep._epoch;
	}

	/**
	 * Sets fields. Each is made canonical (quantised) and compared with the current value, once, here
	 * (not per connection); only changed ones are stamped to go out. Json fields are compared as text.
	 * Returns whether anything changed.
	 */
	write (fields: Record<string, unknown>): boolean {
		if (this.destroyed) throw new Error(`${this.id} is destroyed`);
		const epoch = this._rep._epoch;
		let any = false;
		for (const name in fields) {
			const field = this.schema.byName.get(name);
			if (!field) throw new Error(`${this.kind} has no field "${name}"`);
			const raw = fields[name];
			if (field.type === "json") {
				const text = raw === undefined ? undefined : JSON.stringify(raw) ?? "null";
				if (raw === undefined && !field.optional) throw new Error(`Field ${name} isn't optional`);
				if (text === this._json[field.index]) continue;
				this._json[field.index] = text;
				this.values[name] = raw;
			} else {
				const value = field.canonical(raw);
				if (value === this.values[name]) continue;
				this.values[name] = value;
			}
			this._changed[field.index] = epoch;
			any = true;
		}
		if (any) this._markDirty(epoch);
		return any;
	}

	/** Says a json field was changed in place (the object `values[field]` holds): it's compared again and sent if different. */
	touch (name: string): boolean {
		const field = this.schema.byName.get(name);
		if (!field || field.type !== "json") throw new Error(`${this.kind}.${name} isn't a json field`);
		const value = this.values[name];
		const text = value === undefined ? undefined : JSON.stringify(value) ?? "null";
		if (text === this._json[field.index]) return false;
		this._json[field.index] = text;
		this._changed[field.index] = this._rep._epoch;
		this._markDirty(this._rep._epoch);
		return true;
	}

	get (name: string): unknown {
		return this.values[name];
	}

	/** Moves the object to another scope: viewers of the old one lose it, viewers of the new one gain it. */
	moveTo (scope: string | undefined): void {
		this._rep._moveTo(this, scope);
	}

	destroy (): void {
		this._rep.destroy(this);
	}

	_markDirty (epoch: number): void {
		this._lastChange = epoch;
		if (!this._dirty) {
			this._dirty = true;
			this._rep._dirty.push(this);
		}
	}
}

/** Packet bookkeeping for a viewer on a lossy transport: what an acknowledgement of it confirms. */
interface SentPacket {
	epoch: number;
	states: IgeNetViewState[];
	destroys: number[];
}

export interface IgeNetViewerStats {
	bytes: number;
	packets: number;
	/** Bytes by object kind (entries only; headers aren't attributed). */
	byKind: Record<string, number>;
}

/**
 * One connection's view of the replicator: the scopes it's subscribed to, the objects it sees (each
 * a small handle and the epoch of the baseline it holds) and what it's owed. The replicator builds
 * one binary packet per viewer per flush.
 */
export class IgeNetViewer {
	readonly scopes: Set<string> = new Set();
	/** Anything the game wants to keep per viewer. */
	data: Record<string, unknown> = {};
	/** Whether packets are made for it (false until the machine is welcomed). */
	enabled = true;
	/** The machine's newest input frame applied, for the packet header. */
	inputAck = 0;
	readonly lossy: boolean;
	stats: IgeNetViewerStats = { bytes: 0, packets: 0, byKind: {} };
	/** Bytes per second over the last full second. */
	bytesPerSecond = 0;
	_rep: IgeNetReplicator;
	_send: (bytes: Uint8Array) => void;
	_states: Map<IgeNetObject, IgeNetViewState> = new Map();
	_work: Set<IgeNetViewState> = new Set();
	_free: number[] = [];
	_high = 0;
	_seq = 0;
	/** Destroys owed: handle to the state that went. */
	_destroys: Map<number, IgeNetViewState> = new Map();
	_packets: Map<number, SentPacket> = new Map();
	_closed = false;
	_window = 0;
	// Per-packet scratch
	_cHandles: number[] = [];
	_cPayloads: Payload[] = [];
	_cStates: IgeNetViewState[] = [];
	_uHandles: number[] = [];
	_uPayloads: Payload[] = [];
	_uStates: IgeNetViewState[] = [];

	constructor (rep: IgeNetReplicator, send: (bytes: Uint8Array) => void, options: { lossy?: boolean } = {}) {
		this._rep = rep;
		this._send = send;
		this.lossy = !!options.lossy;
	}

	/** How many objects it sees. */
	get visibleCount (): number {
		return this._states.size;
	}

	/** Whether it sees an object. */
	sees (obj: IgeNetObject): boolean {
		return this._states.has(obj);
	}

	/** Sees every object of a scope (those that are hidden aside). */
	subscribe (scope: string): void {
		if (this.scopes.has(scope) || this._closed) return;
		this.scopes.add(scope);
		const entry = this._rep._scope(scope);
		entry.viewers.add(this);
		for (const obj of entry.objects) this._rep._reconcile(obj, this);
	}

	unsubscribe (scope: string): void {
		if (!this.scopes.delete(scope)) return;
		const entry = this._rep._scope(scope);
		entry.viewers.delete(this);
		for (const obj of entry.objects) this._rep._reconcile(obj, this);
	}

	/** Sees one object whatever its scope (a charted hidden station). */
	reveal (obj: IgeNetObject): void {
		obj._excluded.delete(this);
		obj._revealed.add(this);
		this._rep._reconcile(obj, this);
	}

	/** Stops seeing one object that was revealed, or that it saw through its scope. */
	hide (obj: IgeNetObject): void {
		obj._revealed.delete(this);
		if (!obj.hidden) obj._excluded.add(this);
		this._rep._reconcile(obj, this);
	}

	/** Takes the viewer out of the replicator. */
	close (): void {
		if (this._closed) return;
		this._closed = true;
		for (const state of this._states.values()) {
			state.dead = true;
			state.obj._seenBy.delete(this);
			state.obj._revealed.delete(this);
			state.obj._excluded.delete(this);
		}
		this._states.clear();
		this._work.clear();
		for (const scope of this.scopes) this._rep._scope(scope).viewers.delete(this);
		this.scopes.clear();
		this._rep._viewers.delete(this);
	}

	_add (obj: IgeNetObject): void {
		const handle = this._free.length ? this._free.pop()! : ++this._high;
		const state: IgeNetViewState = { obj, viewer: this, handle, known: false, acked: -1, sentEver: false, dead: false };
		this._states.set(obj, state);
		obj._seenBy.set(this, state);
		this._work.add(state);
	}

	_remove (obj: IgeNetObject): void {
		const state = this._states.get(obj);
		if (!state) return;
		state.dead = true;
		this._states.delete(obj);
		obj._seenBy.delete(this);
		this._work.delete(state);
		// The viewer only needs telling if it was ever sent
		if (state.sentEver) this._destroys.set(state.handle, state);
		else this._free.push(state.handle);
	}

	/**
	 * Records which of its packets a machine has seen (newest `seq`, and the 32 before it as bits),
	 * moving the baselines of what they carried forward. A no-op on a reliable transport, where
	 * sending is acknowledging.
	 */
	ack (seq: number, bits = 0): void {
		if (!this.lossy) return;
		for (const [packetSeq, packet] of this._packets) {
			const distance = seq - packetSeq;
			if (distance < 0) continue;
			if (distance === 0 || (distance <= 32 && ((bits >>> (distance - 1)) & 1) === 1)) {
				for (const state of packet.states) {
					if (state.dead) continue;
					state.known = true;
					if (packet.epoch > state.acked) state.acked = packet.epoch;
				}
				for (const handle of packet.destroys) {
					if (this._destroys.delete(handle)) this._free.push(handle);
				}
				this._packets.delete(packetSeq);
			} else if (distance > 32) {
				// Too old to be acknowledged now: lost. Its objects stay unacknowledged, so they're sent again.
				this._packets.delete(packetSeq);
			}
		}
	}

	/** Builds and sends this viewer's packet for the round. Returns its size in bytes. */
	_build (epoch: number, tick: number): number {
		const rep = this._rep;
		const w = rep._msg;
		w.reset();
		const cH = this._cHandles, cP = this._cPayloads, cS = this._cStates;
		const uH = this._uHandles, uP = this._uPayloads, uS = this._uStates;
		cH.length = cP.length = cS.length = uH.length = uP.length = uS.length = 0;

		for (const state of this._work) {
			const obj = state.obj;
			if (!state.known) {
				cH.push(state.handle);
				cP.push(rep._createPayload(obj));
				cS.push(state);
			} else {
				if (obj._lastChange <= state.acked) {
					this._work.delete(state);
					continue;
				}
				const mask = rep._maskFor(obj, state.acked);
				if (!mask) {
					this._work.delete(state);
					continue;
				}
				uH.push(state.handle);
				uP.push(rep._updatePayload(obj, mask));
				uS.push(state);
			}
		}
		const destroyCount = this._destroys.size;
		let flags = 0;
		if (destroyCount) flags |= 1;
		if (cH.length) flags |= 2;
		if (uH.length) flags |= 4;

		const seq = ++this._seq;
		w.writeBits(IGE_NET_PACKET_SNAPSHOT, 4);
		w.writeBits(flags, 4);
		w.writeVarUint(seq);
		w.writeVarUint(tick);
		w.writeVarUint(this.inputAck);
		const kinds = this.stats.byKind;
		if (flags) {
			const handleBits = igeNetBitsFor(this._high + 1);
			w.writeBits(handleBits, 6);
			if (destroyCount) {
				w.writeVarUint(destroyCount);
				for (const handle of this._destroys.keys()) w.writeBits(handle, handleBits);
			}
			const arena = rep._arena.buffer;
			if (cH.length) {
				w.writeVarUint(cH.length);
				for (let i = 0; i < cH.length; i++) {
					w.writeBits(cH[i], handleBits);
					w.writeBitsFrom(arena, cP[i].byte, cP[i].bits);
					const kind = cS[i].obj.kind;
					kinds[kind] = (kinds[kind] ?? 0) + (cP[i].bits + handleBits) / 8;
				}
			}
			if (uH.length) {
				w.writeVarUint(uH.length);
				for (let i = 0; i < uH.length; i++) {
					w.writeBits(uH[i], handleBits);
					w.writeBitsFrom(arena, uP[i].byte, uP[i].bits);
					const kind = uS[i].obj.kind;
					kinds[kind] = (kinds[kind] ?? 0) + (uP[i].bits + handleBits) / 8;
				}
			}
		}

		// What this packet owes, and what a reliable transport now counts as delivered
		if (this.lossy) {
			const destroys = destroyCount ? [...this._destroys.keys()] : [];
			this._packets.set(seq, { epoch, states: [...cS, ...uS], destroys });
			if (this._packets.size > 128) this._packets.delete(this._packets.keys().next().value!);
			for (const state of cS) state.sentEver = true;
		} else {
			for (const state of cS) {
				state.sentEver = true;
				state.known = true;
				state.acked = epoch;
				this._work.delete(state);
			}
			for (const state of uS) {
				state.acked = epoch;
				this._work.delete(state);
			}
			for (const handle of this._destroys.keys()) this._free.push(handle);
			this._destroys.clear();
		}
		rep.stats.creates += cH.length;
		rep.stats.updates += uH.length;
		rep.stats.destroys += destroyCount;

		const bytes = w.toBytes();
		this.stats.bytes += bytes.length;
		this.stats.packets++;
		this._window += bytes.length;
		this._send(bytes);
		return bytes.length;
	}
}

/** Counters for the replicator, over its life. */
export interface IgeNetReplicatorStats {
	bytes: number;
	packets: number;
	creates: number;
	updates: number;
	destroys: number;
	/** Payloads reused for another viewer in the same round, and payloads encoded. */
	cacheHits: number;
	cacheMisses: number;
	/** Milliseconds spent in flush() in all, and the last. */
	flushMs: number;
	lastFlushMs: number;
	flushes: number;
}

/** Figures over the last full second. */
export interface IgeNetReplicatorRates {
	bytesPerSecond: number;
	/** Milliseconds of flush() work per second. */
	flushMsPerSecond: number;
	packetsPerSecond: number;
}

export interface IgeNetReplicatorOptions {
	/** Clock in ms for timing (default performance.now), for tests. */
	now?: () => number;
}

/**
 * The authority's registry of replicated objects. The game creates objects of the kinds its
 * schemas declare and writes to them as the world changes; viewers (one per connection) subscribe
 * to scopes, own private objects or have objects revealed; flush() makes each viewer one binary
 * packet: creates for what it newly sees, destroys for what it no longer does, and for objects
 * changed since its baseline, only the changed fields.
 *
 * What makes it cheap:
 * - Changes are found at the source: write() compares each field once and stamps what changed
 *   with an epoch. Objects nobody wrote are never visited (a static rock costs nothing after its
 *   create), and nothing is copied per viewer.
 * - Visibility is kept up to date as things happen (create, destroy, subscribe, reveal), never
 *   recomputed per send.
 * - An update is encoded once per set of changed fields and shared by every viewer that needs
 *   those bytes (usually all that see the object); only the small handle in front is per viewer.
 *
 * Baselines: each viewer holds, per object, the epoch of the state it's known to have. On a
 * reliable transport (WebSocket) a send counts as delivered at once. On a lossy one (viewer
 * `lossy`) an update carries everything changed since the last epoch the machine acknowledged
 * (ack()), so any packet can be lost or arrive late.
 * @example #Replicate ships in a star system
 *     const replicator = new IgeNetReplicator(new IgeNetSchemaSet({ ship: { x: { type: "number", precision: 0.1 } } }));
 *     const ship = replicator.create("ship", "ship-1", { x: 10 }, { scope: "sol" });
 *     viewer.subscribe("sol");
 *     ship.write({ x: 12 }); // only changed fields go out
 *     replicator.flush();
 */
export class IgeNetReplicator {
	readonly schemas: IgeNetSchemaSet;
	/** The authority's tick, put in each packet. The host sets it before the game steps. */
	tick = 0;
	readonly stats: IgeNetReplicatorStats = {
		bytes: 0, packets: 0, creates: 0, updates: 0, destroys: 0, cacheHits: 0, cacheMisses: 0, flushMs: 0, lastFlushMs: 0, flushes: 0
	};
	_objects: Map<string, IgeNetObject> = new Map();
	_viewers: Set<IgeNetViewer> = new Set();
	_scopes: Map<string, { objects: Set<IgeNetObject>; viewers: Set<IgeNetViewer> }> = new Map();
	_dirty: IgeNetObject[] = [];
	/** Changes are stamped with the current epoch; flush() sends everything up to it, then moves on. */
	_epoch = 1;
	_round = 0;
	_arena = new IgeNetBitWriter(1 << 16);
	_msg = new IgeNetBitWriter(1 << 12);
	_now: () => number;
	_rates: IgeNetReplicatorRates = { bytesPerSecond: 0, flushMsPerSecond: 0, packetsPerSecond: 0 };
	_windowStart = 0;
	_windowBytes = 0;
	_windowPackets = 0;
	_windowMs = 0;

	constructor (schemas: IgeNetSchemaSet, options: IgeNetReplicatorOptions = {}) {
		this.schemas = schemas;
		this._now = options.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
		this._windowStart = this._now();
	}

	/** A new viewer: `send` is given each packet's bytes. */
	addViewer (send: (bytes: Uint8Array) => void, options: { lossy?: boolean } = {}): IgeNetViewer {
		const viewer = new IgeNetViewer(this, send, options);
		this._viewers.add(viewer);
		return viewer;
	}

	viewers (): IgeNetViewer[] {
		return [...this._viewers];
	}

	get (id: string): IgeNetObject | undefined {
		return this._objects.get(id);
	}

	objects (): IterableIterator<IgeNetObject> {
		return this._objects.values();
	}

	get size (): number {
		return this._objects.size;
	}

	/** Makes an object of a kind from the schemas, with the given fields (the rest take defaults). */
	create (kind: string, id: string, fields: Record<string, unknown> = {}, options: IgeNetObjectOptions = {}): IgeNetObject {
		if (this._objects.has(id)) throw new Error(`There's an object "${id}" already`);
		const obj = new IgeNetObject(this, this.schemas.kind(kind), id, fields, options);
		this._objects.set(id, obj);
		if (obj.scope && !obj.owner) this._scope(obj.scope).objects.add(obj);
		// Who sees it now
		if (obj.owner) this._reconcile(obj, obj.owner);
		else if (obj.scope && !obj.hidden) for (const viewer of this._scope(obj.scope).viewers) this._reconcile(obj, viewer);
		return obj;
	}

	destroy (target: IgeNetObject | string): void {
		const obj = typeof target === "string" ? this._objects.get(target) : target;
		if (!obj || obj.destroyed) return;
		obj.destroyed = true;
		this._objects.delete(obj.id);
		if (obj.scope) this._scope(obj.scope).objects.delete(obj);
		for (const viewer of [...obj._seenBy.keys()]) viewer._remove(obj);
		obj._revealed.clear();
		obj._excluded.clear();
	}

	_scope (name: string): { objects: Set<IgeNetObject>; viewers: Set<IgeNetViewer> } {
		let scope = this._scopes.get(name);
		if (!scope) this._scopes.set(name, (scope = { objects: new Set(), viewers: new Set() }));
		return scope;
	}

	_moveTo (obj: IgeNetObject, scope: string | undefined): void {
		if (obj.destroyed || obj.scope === scope) return;
		const affected = new Set<IgeNetViewer>(obj._seenBy.keys());
		if (obj.scope) this._scope(obj.scope).objects.delete(obj);
		obj.scope = scope;
		if (scope && !obj.owner) {
			const entry = this._scope(scope);
			entry.objects.add(obj);
			for (const viewer of entry.viewers) affected.add(viewer);
		}
		for (const viewer of affected) this._reconcile(obj, viewer);
	}

	_visible (obj: IgeNetObject, viewer: IgeNetViewer): boolean {
		if (obj._revealed.has(viewer)) return true;
		if (obj.owner) return obj.owner === viewer;
		if (obj.hidden || obj._excluded.has(viewer)) return false;
		return !!obj.scope && viewer.scopes.has(obj.scope);
	}

	/** Brings a viewer's sight of an object in line with the rules: adds or removes it. */
	_reconcile (obj: IgeNetObject, viewer: IgeNetViewer): void {
		if (obj.destroyed || viewer._closed) return;
		const sees = viewer._states.has(obj);
		const should = this._visible(obj, viewer);
		if (should && !sees) viewer._add(obj);
		else if (!should && sees) viewer._remove(obj);
	}

	/** The fields of an object that changed after `epoch`, as a mask (worked out once per round per epoch). */
	_maskFor (obj: IgeNetObject, epoch: number): number {
		this._roundOf(obj);
		let mask = obj._masks.get(epoch);
		if (mask === undefined) {
			mask = 0;
			const changed = obj._changed;
			for (let i = 0; i < changed.length; i++) if (changed[i] > epoch) mask |= 1 << i;
			mask >>>= 0;
			obj._masks.set(epoch, mask);
		}
		return mask;
	}

	/** Drops an object's payloads from an earlier round. */
	_roundOf (obj: IgeNetObject): void {
		if (obj._round === this._round) return;
		obj._round = this._round;
		obj._create = undefined;
		obj._updates.clear();
		obj._masks.clear();
	}

	_createPayload (obj: IgeNetObject): Payload {
		this._roundOf(obj);
		if (obj._create) {
			this.stats.cacheHits++;
			return obj._create;
		}
		this.stats.cacheMisses++;
		const arena = this._arena;
		arena.align();
		const start = arena.bitLength;
		arena.writeBits(this.schemas.kinds.indexOf(obj.schema), this.schemas.kindBits);
		arena.writeString(obj.id);
		obj.schema.writeAll(arena, obj.values, obj._json);
		return (obj._create = { byte: start >> 3, bits: arena.bitLength - start });
	}

	_updatePayload (obj: IgeNetObject, mask: number): Payload {
		this._roundOf(obj);
		let payload = obj._updates.get(mask);
		if (payload) {
			this.stats.cacheHits++;
			return payload;
		}
		this.stats.cacheMisses++;
		const arena = this._arena;
		arena.align();
		const start = arena.bitLength;
		obj.schema.writeMasked(arena, mask, obj.values, obj._json);
		payload = { byte: start >> 3, bits: arena.bitLength - start };
		obj._updates.set(mask, payload);
		return payload;
	}

	/**
	 * Makes and sends every enabled viewer's packet for the changes since the last flush. Call it at
	 * the send rate, after the game has written its tick. Returns the bytes sent.
	 */
	flush (): number {
		const started = this._now();
		this._round++;
		this._arena.reset();
		const epoch = this._epoch;
		for (const obj of this._dirty) {
			obj._dirty = false;
			if (obj.destroyed) continue;
			for (const state of obj._seenBy.values()) state.viewer._work.add(state);
		}
		this._dirty.length = 0;
		let total = 0;
		for (const viewer of this._viewers) {
			if (!viewer.enabled) continue;
			total += viewer._build(epoch, this.tick);
			this.stats.packets++;
			this._windowPackets++;
		}
		// Later writes belong to the next flush
		this._epoch++;
		const now = this._now();
		const spent = now - started;
		this.stats.bytes += total;
		this.stats.flushes++;
		this.stats.flushMs += spent;
		this.stats.lastFlushMs = spent;
		this._windowBytes += total;
		this._windowMs += spent;
		if (now - this._windowStart >= 1000) {
			const seconds = (now - this._windowStart) / 1000;
			this._rates = {
				bytesPerSecond: this._windowBytes / seconds,
				flushMsPerSecond: this._windowMs / seconds,
				packetsPerSecond: this._windowPackets / seconds
			};
			for (const viewer of this._viewers) {
				viewer.bytesPerSecond = viewer._window / seconds;
				viewer._window = 0;
			}
			this._windowStart = now;
			this._windowBytes = this._windowMs = this._windowPackets = 0;
		}
		return total;
	}

	/** Figures over the last full second (all zero until a second has passed). */
	rates (): IgeNetReplicatorRates {
		return this._rates;
	}

	/** Bytes sent so far, by object kind, over every viewer. */
	bytesByKind (): Record<string, number> {
		const out: Record<string, number> = {};
		for (const viewer of this._viewers) for (const kind in viewer.stats.byKind) out[kind] = (out[kind] ?? 0) + viewer.stats.byKind[kind];
		return out;
	}
}
