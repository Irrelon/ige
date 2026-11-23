import { IgeNetBitWriter, igeNetBitsFor } from "@/engine/network/replication/IgeNetBits";
import { IgeNetGrid } from "@/engine/network/replication/IgeNetGrid";
import { igeNetMaskEmpty, igeNetMaskKey, type IgeNetJsonWriter, type IgeNetMask, type IgeNetSchema, type IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { IGE_NET_JSON_VERSIONS, igeNetJsonDiff, igeNetWriteJsonPatch, igeNetWriteJsonWhole } from "@/engine/network/replication/igeNetJsonDelta";
import { IGE_NET_PACKET_SNAPSHOT, IGE_NET_PACKET_SNAPSHOT_EVENTS, igeNetEventBits, igeNetWriteEvent, type IgeNetEventWire } from "@/engine/network/replication/igeNetReplicationProtocol";

/** Where an object is seen and by whom. */
export interface IgeNetObjectOptions {
	/** The scope it belongs to (a star system, a deck): every viewer subscribed to the scope sees it. */
	scope?: string;
	/** Only this viewer sees it (a player's private state); `scope` is then ignored. */
	owner?: IgeNetViewer;
	/** Not seen through its scope: only by viewers it's revealed to (a hidden station a pilot has charted). */
	hidden?: boolean;
}

/** One version of a json field on the authority: the epoch it was written in, its number and JSON text (parsed when a patch needs it). */
interface JsonVersion {
	epoch: number;
	ver: number;
	text: string | undefined;
	parsed?: unknown;
	has: boolean;
}

const NO_VERSIONS: (JsonVersion[] | undefined)[] = [];

const NO_EVENTS: EventEntry[] = [];

/** The smallest slice worth its header (bytes), unless it finishes its entry. */
const MIN_SLICE = 32;

/** A piece of a transfer as sent; a lossy transport keeps it until it's acknowledged. */
interface Piece {
	off: number;
	len: number;
	round: number;
	acked: boolean;
	lost: boolean;
}

/**
 * An entry too big to send at once (a join's create, a big change), going to one viewer in slices
 * over the next rounds. The classes it carries wait for it (no newer change of them goes until it's
 * delivered); the object's other classes go on as usual.
 */
interface Transfer {
	state: IgeNetViewState;
	/** Rising per viewer, so the machine can tell a late piece of an older transfer. */
	id: number;
	create: boolean;
	classes: number;
	/** The epoch of the state it carries. */
	epoch: number;
	gen: number;
	bytes: Uint8Array;
	/** The next byte not yet sent. */
	next: number;
	/** Lossy: the pieces sent, and how many bytes of them are acknowledged. */
	pieces?: Piece[];
	ackedBytes: number;
	/** One of the viewer's own objects (owner): a slice of it goes first each round. */
	own: boolean;
	done: boolean;
}

/** A slice of a transfer in this round's packets. */
interface Slice {
	xfer: Transfer;
	off: number;
	len: number;
	piece?: Piece;
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
	/** Per field class, the epoch of the state the viewer is known to have (changes after it are sent). */
	acked: number[];
	/** A create has been sent, so a destroy is owed when the object goes. */
	sentEver: boolean;
	dead: boolean;
	/** The removal reason (an index in the kind's removeReasons) sent with the destroy, or -1. */
	reason: number;
	/** The object is placed in space for this viewer: its detail depends on distance. */
	spatial: boolean;
	/** The detail the viewer should have (true: full). Non-spatial objects are always full. */
	full: boolean;
	/** The detail last sent, and the detail the viewer is known to have (lossy transports acknowledge it). */
	levelSent?: boolean;
	levelAcked?: boolean;
	levelSeq: number;
	levelRound: number;
	/** Counts changes of detail (a blip named, or a full object gone back to a blip) so late acknowledgements of the old one are ignored. */
	gen: number;
	/** Priority gathered while it waits to be sent. */
	priority: number;
	/** The round it first had something to send that wasn't sent, or -1. */
	pendingSince: number;
	/**
	 * While changes wait (the budget, a rate): the tick of the last round before the first of them, when the viewer's copy was
	 * still current; -1 when nothing's been held back since the last send. Sent with the update so the machine blends across the
	 * wait instead of holding the object still and then jumping it.
	 */
	heldTick: number;
	/** Its entry going out in slices, if one is. */
	xfer?: Transfer;
	/** Per class: the epoch and round of the last send (only kept where rates or resend gaps need them). */
	se?: number[];
	sr?: number[];
	lastRound: number;
	createRound: number;
	_slot?: Set<IgeNetViewState>;
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
	/** Each field class's epoch of last change (kinds with more than one class). */
	_classLast?: Float64Array;
	_lastChange: number;
	_dirty = false;
	_json: (string | undefined)[];
	/** Per json field, its last few versions (oldest first): a change goes as a patch against the one a viewer has. */
	_jh: (JsonVersion[] | undefined)[];
	/** This round's patches, by field and base version (null: whole is smaller). */
	_jd?: Map<string, { bytes: Uint8Array; bits: number } | null>;
	_rep: IgeNetReplicator;
	/** Viewers that see it. */
	_seenBy: Map<IgeNetViewer, IgeNetViewState> = new Map();
	_revealed: Set<IgeNetViewer> = new Set();
	_excluded: Set<IgeNetViewer> = new Set();
	_round = -1;
	_create?: Payload;
	_createBlip?: Payload;
	_updates: Map<number | string, Payload> = new Map();
	_masks: Map<number, IgeNetMask> = new Map();
	_cm?: Map<number, IgeNetMask>[];
	/** In a scope's grid (a spatial kind in a scope, not private). */
	_spatial = false;
	_cell = -1;
	_cellIdx = -1;
	/** The position fields' values, kept as plain numbers (NaN for a kind without a position). */
	_px = NaN;
	_pz = NaN;
	_py = NaN;

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
		this._jh = schema.jsonIdx.length ? schema.fields.map((f, i) => (f.type === "json" ? [{ epoch: rep._epoch, ver: 1, text: this._json[i], has: false }] : undefined)) : NO_VERSIONS;
		this._changed = new Float64Array(schema.fields.length).fill(rep._epoch);
		if (schema.classCount > 1) this._classLast = new Float64Array(schema.classCount).fill(rep._epoch);
		this._lastChange = rep._epoch;
		this._readPosition();
	}

	_readPosition (): void {
		const pos = this.schema.options.position;
		if (!pos) return;
		this._px = this.values[pos[0]] as number;
		this._pz = this.values[pos[1]] as number;
		this._py = pos.length > 2 ? (this.values[pos[2]] as number) : NaN;
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
		let moved = false;
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
				this._jsonChanged(field.index);
			} else {
				const value = field.canonical(raw);
				if (value === this.values[name]) continue;
				this.values[name] = value;
				if (field.positional) moved = true;
			}
			this._changed[field.index] = epoch;
			if (this._classLast) this._classLast[this.schema.classOf[field.index]] = epoch;
			any = true;
		}
		if (any) this._markDirty(epoch);
		if (moved) {
			this._readPosition();
			if (this._spatial) this._rep._placed(this);
		}
		return any;
	}

	/**
	 * Sets one json field whose JSON text the game already has (the same value written to many objects: the text is made once).
	 * Returns whether it changed.
	 */
	writeJson (name: string, value: unknown, text: string): boolean {
		if (this.destroyed) throw new Error(`${this.id} is destroyed`);
		const field = this.schema.byName.get(name);
		if (!field || field.type !== "json") throw new Error(`${this.kind}.${name} isn't a json field`);
		if (text === this._json[field.index]) return false;
		this._json[field.index] = text;
		this.values[name] = value;
		this._jsonChanged(field.index);
		this._stamp(field.index);
		return true;
	}

	/** Says a json field was changed in place (the object `values[field]` holds): it's compared again and sent if different. */
	touch (name: string): boolean {
		const field = this.schema.byName.get(name);
		if (!field || field.type !== "json") throw new Error(`${this.kind}.${name} isn't a json field`);
		const value = this.values[name];
		const text = value === undefined ? undefined : JSON.stringify(value) ?? "null";
		if (text === this._json[field.index]) return false;
		this._json[field.index] = text;
		this._jsonChanged(field.index);
		this._stamp(field.index);
		return true;
	}

	/** A json field has new text: a new version (or, written again in the same round, the same version changed). */
	_jsonChanged (index: number): void {
		const hist = this._jh[index]!;
		const last = hist[hist.length - 1];
		const epoch = this._rep._epoch;
		const text = this._json[index];
		if (last.epoch === epoch) {
			last.text = text;
			last.parsed = undefined;
			last.has = false;
			return;
		}
		hist.push({ epoch, ver: last.ver + 1, text, has: false });
		if (hist.length > IGE_NET_JSON_VERSIONS) hist.shift();
	}

	_stamp (index: number): void {
		const epoch = this._rep._epoch;
		this._changed[index] = epoch;
		if (this._classLast) this._classLast[this.schema.classOf[index]] = epoch;
		this._markDirty(epoch);
	}

	get (name: string): unknown {
		return this.values[name];
	}

	/** Moves the object to another scope: viewers of the old one lose it, viewers of the new one gain it. */
	/**
	 * Moves it to another scope (or none). Viewers that lose it by this and held it in full detail are sent `reason` (one of
	 * the kind's removeReasons) with the removal, as destroy() does: a ship that jumped out of a system, one that cloaked.
	 */
	moveTo (scope: string | undefined, reason?: string): void {
		let index = -1;
		if (reason !== undefined) {
			index = this.schema.options.removeReasons?.indexOf(reason) ?? -1;
			if (index < 0) throw new Error(`${this.kind}: "${reason}" isn't one of its removeReasons`);
		}
		this._rep._moveTo(this, scope, index);
	}

	/** Removes it; `reason` (one of the kind's removeReasons) goes to viewers that hold it in full detail. */
	destroy (reason?: string): void {
		this._rep.destroy(this, reason);
	}

	_markDirty (epoch: number): void {
		this._lastChange = epoch;
		if (!this._dirty) {
			this._dirty = true;
			this._rep._dirty.push(this);
		}
	}
}

/** What one packet carried of one object, for acknowledging it. */
interface SentEntry {
	state: IgeNetViewState;
	/** The classes it carried (a bit each). */
	classes: number;
	create: boolean;
	level?: boolean;
	/** The state's generation when it was sent: an acknowledgement of an earlier one (before it went to full or back to a blip) means nothing now. */
	gen: number;
}

/** Packet bookkeeping for a viewer on a lossy transport: what an acknowledgement of it confirms. */
interface SentPacket {
	seq: number;
	epoch: number;
	entries: SentEntry[];
	destroys: number[];
	slices?: Slice[];
	/** Reliable events it carried (acknowledged with it). */
	events?: EventEntry[];
}

/** An event queued for one viewer (the wire form is shared by every viewer it's for). */
interface EventEntry {
	wire: IgeNetEventWire;
	reliable: boolean;
	/** The viewer's sequence number of a reliable event. */
	seq: number;
	/** The round it was last sent in (a lossy transport sends a reliable event again after a gap, until acknowledged). */
	sentRound: number;
	/** Acknowledged, or sent for good (unreliable events, and everything on a reliable transport). */
	done: boolean;
}

/** Who an event is for (see IgeNetReplicator.event): none of these means every viewer. */
export interface IgeNetEventTarget {
	/** Viewers that hold any of these objects in full detail now (or are in range of one that isn't sent yet). Ids work too. */
	on?: IgeNetObject | string | (IgeNetObject | string)[];
	/** Viewers in the scope for whom a spatial object at this point would be in full detail (the test relevance uses). */
	at?: { scope: string; x: number; z: number; y?: number };
	/** Every viewer subscribed to the scope. */
	scope?: string;
	/** These viewers, whatever they see. */
	to?: IgeNetViewer | IgeNetViewer[];
	/** Default true: resent on a lossy transport until acknowledged, delivered once and in order. False: sent once, never again. */
	reliable?: boolean;
}

/** One thing to put in this round's packets for a viewer. */
interface Candidate {
	state: IgeNetViewState;
	create: boolean;
	classes: number;
	level: boolean;
	payload: Payload;
	/** Pending changes were held back (a rate, a resend gap): the object stays in the work set. */
	gated: boolean;
	/** An update after a wait: ticks back from this round's to the one the viewer's copy was last current at (0: the last round). */
	still: number;
}

export interface IgeNetViewerStats {
	/** Bytes of events sections sent (they're part of `bytes`). */
	eventBytes: number;
	bytes: number;
	packets: number;
	/** Bytes by object kind (entries only; headers aren't attributed). */
	byKind: Record<string, number>;
	/** Entries held back last round (budget), and how long the oldest unsent change has waited, in seconds. */
	deferred: number;
	oldestPendingAge: number;
	/** Entries sent last round. */
	entries: number;
}

/** What a viewer is interested in: a point in space, or an object it follows. */
export class IgeNetInterest {
	/** An object to follow (its position fields), or none for a fixed point. */
	target?: IgeNetObject;
	x = 0;
	z = 0;
	y?: number;
	/** How far from the point objects are in full detail (default: the viewer's `nearRadius`). Change it whenever. */
	radius?: number;
	_viewer: IgeNetViewer;

	constructor (viewer: IgeNetViewer) {
		this._viewer = viewer;
	}

	remove (): void {
		const list = this._viewer._interests;
		const at = list.indexOf(this);
		if (at >= 0) list.splice(at, 1);
	}
}

/** The shape of one viewer's report: see IgeNetViewer.report(). */
export interface IgeNetViewerReport {
	/** Bytes per second over the last full second, the budget, and the share used. */
	bytesPerSecond: number;
	bandwidth: number;
	budgetUse: number;
	/** Entries held back last round, and the age in seconds of the oldest change still unsent. */
	deferred: number;
	oldestPendingAge: number;
	visible: number;
	/** Objects seen at each detail level (kinds without levels count as full). */
	detail: { full: number; blip: number };
	byKind: Record<string, number>;
	/** Entries going out in slices, and their bytes still to go. */
	transfers: number;
	transferBytes: number;
}

/** The bytes a varuint takes. */
/** The bits a candidate takes in a packet: its handle, an update's wait marker, its payload. */
function entryBits (cand: Candidate, handleBits: number): number {
	return cand.payload.bits + handleBits + (cand.create ? 0 : cand.still ? 1 + 8 * varBytes(cand.still) : 1);
}

/** A json version's value, parsed from its text the first time it's needed (the authority's own copy: never the game's live object). */
function parsedOf (v: JsonVersion): unknown {
	if (!v.has) {
		v.parsed = v.text === undefined ? undefined : JSON.parse(v.text);
		v.has = true;
	}
	return v.parsed;
}

/** The bits a slice takes in a packet. */
function sliceCost (slice: Slice, handleBits: number): number {
	const x = slice.xfer;
	return handleBits + 1 + 8 * (varBytes(x.id) + varBytes(x.bytes.length) + varBytes(slice.off) + varBytes(slice.len) + slice.len);
}

function varBytes (n: number): number {
	return n < 128 ? 1 : n < 16384 ? 2 : n < 2097152 ? 3 : n < 268435456 ? 4 : 5;
}

function orMask (a: IgeNetMask, b: IgeNetMask): IgeNetMask {
	if (typeof a === "number") return (a | (b as number)) >>> 0;
	const out = a.slice();
	for (let i = 0; i < out.length; i++) out[i] = (out[i] | (b as number[])[i]) >>> 0;
	return out;
}

const KEEP = 1;

/**
 * One connection's view of the replicator: the scopes it's subscribed to, the objects it sees (each
 * a small handle and the epoch of the baseline it holds) and what it's owed. The replicator builds
 * one or more binary packets per viewer per flush.
 *
 * Relevance: objects of spatial kinds are seen in full detail near the viewer's interest points
 * (`addInterest`), or when it focuses on them (`focus`), and as blips (position only, at a low rate)
 * elsewhere. Priority and a bandwidth budget decide what goes into a round's packets.
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
	stats: IgeNetViewerStats = { bytes: 0, packets: 0, eventBytes: 0, byKind: {}, deferred: 0, oldestPendingAge: 0, entries: 0 };
	/** Bytes per second over the last full second. */
	bytesPerSecond = 0;
	/** Bytes per second this viewer may be sent (undefined: the replicator's; Infinity or 0: no limit). */
	bandwidth?: number;
	/** The largest packet in bytes (undefined: the replicator's; 0: any size). */
	maxPacketBytes?: number;
	/** How far from an interest point objects are in full detail, when the point has no radius of its own (undefined: the replicator's). */
	nearRadius?: number;
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
	_interests: IgeNetInterest[] = [];
	_focus: Set<IgeNetObject> = new Set();
	/** Objects this viewer's machine predicts (its own player): never held back, always in full. */
	_controlled: Set<IgeNetObject> = new Set();
	/** The tick of the last round built for this viewer. */
	_lastTick = -1;
	/** Objects of kinds with no blips that are in range (or focused): only these are seen. */
	_admitted: Set<IgeNetObject> = new Set();
	/** Spatial states at full detail by the last round's reckoning, and this round's. */
	_fullPrev: Set<IgeNetViewState> = new Set();
	_fullNow: Set<IgeNetViewState> = new Set();
	/** Blip states in slots of a period, so each round visits only the ones that are due. */
	_slots: { period: number; sets: Set<IgeNetViewState>[] }[] = [];
	_spatialCount = 0;
	_allow = -1;
	/** Events waiting to go (reliable ones until acknowledged). */
	_events: EventEntry[] = [];
	_eventSeq = 0;
	_eventMark = 0;
	/** Entries going out in slices, oldest first. */
	_xfers: Transfer[] = [];
	_xferId = 0;
	/** This round's slices. */
	_slices: Slice[] = [];
	_cands: Candidate[] = [];
	_pool: Candidate[] = [];
	_near: IgeNetObject[] = [];
	/** Scratch: the position of the interest last looked at. */
	_ix = 0;
	_iz = 0;
	_iy = NaN;

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

	/**
	 * Stops a reveal without excluding the viewer: it sees the object again only if the scope rules
	 * (or another reveal) let it. (`hide` is for taking a scope object away from one viewer.)
	 */
	unreveal (obj: IgeNetObject): void {
		obj._revealed.delete(this);
		this._rep._reconcile(obj, this);
	}

	/**
	 * Takes an interest in a place: objects of spatial kinds within `radius` of it are in full detail.
	 * Pass an object to follow (its position fields; usually the pilot's own ship) or a fixed point.
	 * A viewer may have several (a split screen, a remote camera). The returned interest can be
	 * moved (`x`, `z`), given another `radius` and removed.
	 * @example #Follow the pilot's ship with the scanner's range
	 *     const interest = viewer.addInterest(ship, { radius: 2200 });
	 *     interest.radius = 4000; // a better scanner
	 */
	addInterest (where: IgeNetObject | { x: number; z: number; y?: number }, options: { radius?: number } = {}): IgeNetInterest {
		const interest = new IgeNetInterest(this);
		if (where instanceof IgeNetObject) {
			if (where.schema.positionIdx.length < 2) throw new Error(`${where.kind} has no position to follow`);
			interest.target = where;
		} else {
			interest.x = where.x;
			interest.z = where.z;
			interest.y = where.y;
		}
		interest.radius = options.radius;
		this._interests.push(interest);
		return interest;
	}

	/** Drops every interest point. */
	clearInterests (): void {
		this._interests.length = 0;
	}

	interests (): IgeNetInterest[] {
		return [...this._interests];
	}

	/**
	 * Always sees this object in full detail, whatever the distance, and sends its changes first
	 * (a wing member, the current target, an enemy in a fight). Remembered while the object isn't
	 * visible to the viewer.
	 */
	focus (obj: IgeNetObject): void {
		this._focus.add(obj);
	}

	unfocus (obj: IgeNetObject): void {
		this._focus.delete(obj);
	}

	unfocusAll (): void {
		this._focus.clear();
	}

	isFocused (obj: IgeNetObject): boolean {
		return this._focus.has(obj);
	}

	/**
	 * The machine predicts this object (its own player: a ship it flies, a character it walks), so it needs every change as soon as
	 * it happens: its changes are never held back by the bandwidth budget or rates, go first in the round, and it's always in full
	 * detail. Prediction replays the inputs the authority hasn't applied on top of the newest state, so a state held back while the
	 * inputs before it are acknowledged would pull the player back. Keep it to the few objects that need it.
	 */
	control (obj: IgeNetObject): void {
		this._controlled.add(obj);
	}

	uncontrol (obj: IgeNetObject): void {
		this._controlled.delete(obj);
	}

	isControlled (obj: IgeNetObject): boolean {
		return this._controlled.has(obj);
	}

	/** The detail level the authority has an object at for this viewer: undefined if it doesn't see it. */
	detailOf (obj: IgeNetObject): "full" | "blip" | undefined {
		const state = this._states.get(obj);
		return state ? (state.full ? "full" : "blip") : undefined;
	}

	/**
	 * Works out what's in range now (a flush does this for each enabled viewer). Call it before
	 * `view()` or `sees()` on a viewer that isn't being sent to (a test, a tool), or after moving
	 * interests, to read the current answer without waiting for a flush.
	 */
	refresh (): void {
		this._relevance(this._rep._round);
	}

	/**
	 * Every object it sees now, as plain data: its id, kind and current (quantised) field values, the
	 * same ones its machine arrives at. For tests, tools and debugging. The values are the objects' own unless `copy` is set (then json fields are parsed afresh); don't change them.
	 */
	view (options: { copy?: boolean } = {}): { id: string; kind: string; values: Record<string, unknown> }[] {
		const out: { id: string; kind: string; values: Record<string, unknown> }[] = [];
		for (const obj of this._states.keys()) {
			let values = obj.values;
			if (options.copy) {
				// Json fields as the machine gets them (parsed from the text sent), not the game's own live objects
				values = { ...obj.values };
				for (const field of obj.schema.fields) {
					if (field.type !== "json") continue;
					const text = obj._json[field.index];
					values[field.name] = text === undefined ? undefined : JSON.parse(text);
				}
			}
			out.push({ id: obj.id, kind: obj.kind, values });
		}
		return out;
	}

	/**
	 * What the viewer is getting: bytes per second against its budget, what was held back last
	 * round, how long the oldest unsent change has waited, and how many objects are at each detail.
	 */
	report (): IgeNetViewerReport {
		let full = 0, blip = 0;
		for (const state of this._states.values()) {
			if (state.full) full++;
			else blip++;
		}
		const bandwidth = this._bandwidth();
		let transferBytes = 0;
		for (const x of this._xfers) if (!x.done) transferBytes += x.bytes.length - (x.pieces ? x.ackedBytes : x.next);
		return {
			transfers: this._xfers.filter((x) => !x.done).length,
			transferBytes,
			bytesPerSecond: this.bytesPerSecond,
			bandwidth,
			budgetUse: Number.isFinite(bandwidth) ? this.bytesPerSecond / bandwidth : 0,
			deferred: this.stats.deferred,
			oldestPendingAge: this.stats.oldestPendingAge,
			visible: this._states.size,
			detail: { full, blip },
			byKind: { ...this.stats.byKind }
		};
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
		this._fullPrev.clear();
		this._fullNow.clear();
		this._admitted.clear();
		this._slots.length = 0;
		this._interests.length = 0;
		this._focus.clear();
		this._controlled.clear();
		this._xfers.length = 0;
		for (const scope of this.scopes) this._rep._scope(scope).viewers.delete(this);
		this.scopes.clear();
		this._rep._viewers.delete(this);
	}

	/** Whether a spatial point is in full-detail range of one of this viewer's interests. */
	_nearPoint (x: number, z: number, y: number): boolean {
		for (const interest of this._interests) {
			if (!this._where(interest)) continue;
			const radius = interest.radius ?? this.nearRadius ?? this._rep.nearRadius;
			const dx = x - this._ix, dz = z - this._iz;
			let d2 = dx * dx + dz * dz;
			const dy = y - this._iy;
			if (dy === dy) d2 += dy * dy;
			if (d2 <= radius * radius) return true;
		}
		return false;
	}

	/**
	 * Whether the viewer holds the object in full detail (or would at the next send: in range of an interest, focused or
	 * controlled, even if the object is new). What an event `on` an object is sent by.
	 */
	holdsFull (obj: IgeNetObject): boolean {
		if (obj.destroyed || this._closed) return false;
		const state = this._states.get(obj);
		if (!obj._spatial) return !!state;
		if (state && state.full) return true;
		if (!state && !obj._revealed.has(this) && !this._rep._scopeSees(obj, this)) return false;
		if (this._focus.has(obj) || this._controlled.has(obj)) return true;
		return this._nearPoint(obj._px, obj._pz, obj._py);
	}

	/** The events to put in this round's packets: new ones, and on a lossy transport reliable ones not acknowledged and not sent lately. */
	_takeEvents (round: number): EventEntry[] {
		const out: EventEntry[] = [];
		const gap = this._rep._eventResend;
		const list = this._events;
		let k = 0;
		for (let i = 0; i < list.length; i++) {
			const e = list[i];
			if (e.done) continue;
			list[k++] = e;
			if (e.reliable && round - e.sentRound < gap) continue;
			out.push(e);
		}
		list.length = k;
		return out;
	}

	/** Queues an event for this viewer (nothing before it's welcomed). */
	_queueEvent (wire: IgeNetEventWire, reliable: boolean): void {
		if (this._closed || !this.enabled) return;
		if (this._events.length > 4096) this._events.splice(0, this._events.length - 4096);
		this._events.push({ wire, reliable, seq: reliable ? ++this._eventSeq : 0, sentRound: -1e9, done: false });
	}

	_bandwidth (): number {
		const value = this.bandwidth ?? this._rep.bandwidth;
		return value > 0 ? value : Infinity;
	}

	_add (obj: IgeNetObject): void {
		const handle = this._free.length ? this._free.pop()! : ++this._high;
		const schema = obj.schema;
		const spatial = obj._spatial;
		const rep = this._rep;
		const state: IgeNetViewState = {
			obj, viewer: this, handle, known: false, acked: new Array(schema.classCount).fill(-1), sentEver: false, dead: false, reason: -1,
			spatial, full: !spatial || !schema.blips, gen: 0, levelSeq: 0, levelRound: -1e9, priority: 0, pendingSince: -1, heldTick: -1, lastRound: -1e9, createRound: -1e9
		};
		if (schema.rated || schema.leveled || rep._resend > 0) {
			state.se = new Array(schema.classCount).fill(-1);
			state.sr = new Array(schema.classCount).fill(-1e9);
		}
		this._states.set(obj, state);
		obj._seenBy.set(this, state);
		this._work.add(state);
		if (spatial && schema.blips) {
			this._spatialCount++;
			this._slotAdd(state);
		}
	}

	_remove (obj: IgeNetObject, reason = this._rep._removeReason): void {
		const state = this._states.get(obj);
		if (!state) return;
		state.dead = true;
		// Only a viewer that holds it in full is told why (a blip is anonymous)
		if (reason >= 0 && state.full) state.reason = reason;
		this._states.delete(obj);
		obj._seenBy.delete(this);
		this._work.delete(state);
		if (state.spatial) {
			if (obj.schema.blips) {
				this._spatialCount--;
				this._slotDelete(state);
			}
			this._fullPrev.delete(state);
			this._fullNow.delete(state);
		}
		// The viewer only needs telling if it was ever sent
		if (state.sentEver) this._destroys.set(state.handle, state);
		else this._free.push(state.handle);
	}

	/** The object's placement changed (it moved scope): its state follows. */
	_respace (state: IgeNetViewState): void {
		const spatial = state.obj._spatial;
		if (spatial === state.spatial) return;
		state.spatial = spatial;
		const blips = state.obj.schema.blips;
		if (spatial) {
			if (blips) {
				this._spatialCount++;
				this._demote(state);
			}
		} else {
			if (blips) {
				this._spatialCount--;
				this._slotDelete(state);
				if (!state.full) this._promote(state);
			}
			this._fullPrev.delete(state);
			this._fullNow.delete(state);
			state.full = true;
		}
		this._work.add(state);
	}

	/** A blip named: the viewer is sent the object in full, a create at the handle the blip had. */
	_promote (state: IgeNetViewState): void {
		state.full = true;
		state.gen++;
		state.known = false;
		state.acked.fill(-1);
		state.createRound = -1e9;
		state.se?.fill(-1);
		state.sr?.fill(-1e9);
		this._work.add(state);
	}

	/**
	 * Full detail left behind: the viewer's object is destroyed and what it gets next is a new
	 * anonymous blip under a new handle, so nothing ties the contact to the object it was.
	 */
	_demote (state: IgeNetViewState): void {
		state.full = false;
		state.gen++;
		if (state.sentEver) {
			this._destroys.set(state.handle, state);
			state.handle = this._free.length ? this._free.pop()! : ++this._high;
		}
		state.sentEver = false;
		state.known = false;
		state.acked.fill(-1);
		state.createRound = -1e9;
		state.se?.fill(-1);
		state.sr?.fill(-1e9);
		this._slotAdd(state);
		this._work.add(state);
	}

	_period (schema: IgeNetSchema): number {
		const rate = schema.options.blipRate ?? this._rep.blipRate;
		return Math.max(1, Math.round(this._rep.sendRate / rate));
	}

	_slotAdd (state: IgeNetViewState): void {
		if (state._slot) return;
		const period = this._period(state.obj.schema);
		let slots = this._slots.find((s) => s.period === period);
		if (!slots) {
			slots = { period, sets: [] };
			for (let i = 0; i < period; i++) slots.sets.push(new Set());
			this._slots.push(slots);
		}
		state._slot = slots.sets[state.handle % period];
		state._slot.add(state);
	}

	_slotDelete (state: IgeNetViewState): void {
		state._slot?.delete(state);
		state._slot = undefined;
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
				for (const entry of packet.entries) {
					const state = entry.state;
					if (state.dead || entry.gen !== state.gen) continue;
					if (entry.create) state.known = true;
					for (let c = 0; c < state.acked.length; c++) {
						if (((entry.classes >>> c) & 1) && packet.epoch > state.acked[c]) state.acked[c] = packet.epoch;
					}
				}
				for (const handle of packet.destroys) {
					if (this._destroys.delete(handle)) this._free.push(handle);
				}
				if (packet.events) for (const e of packet.events) e.done = true;
				if (packet.slices) {
					for (const slice of packet.slices) {
						const piece = slice.piece!;
						if (piece.acked) continue;
						piece.acked = true;
						const xfer = slice.xfer;
						xfer.ackedBytes += piece.len;
						if (!xfer.done && xfer.ackedBytes >= xfer.bytes.length) this._xferDone(xfer);
					}
				}
				this._packets.delete(packetSeq);
			} else if (distance > 32) {
				// Too old to be acknowledged now: lost. Its objects stay unacknowledged, so they're sent again (and its slices).
				this._lost(packet);
				this._packets.delete(packetSeq);
			}
		}
	}

	/** Puts where an interest is in `_ix`, `_iz`, `_iy` (NaN: no height). False if what it follows is gone. */
	_where (interest: IgeNetInterest): boolean {
		const target = interest.target;
		if (!target) {
			this._ix = interest.x;
			this._iz = interest.z;
			this._iy = interest.y ?? NaN;
			return true;
		}
		if (target.destroyed) return false;
		this._ix = target._px;
		this._iz = target._pz;
		this._iy = target._py;
		return true;
	}

	/** Distance from an object to a point squared, using height when both have it. */
	_distance2 (obj: IgeNetObject, x: number, z: number, y: number): number {
		const dx = obj._px - x, dz = obj._pz - z;
		let d2 = dx * dx + dz * dz;
		const dy = obj._py - y;
		if (dy === dy) d2 += dy * dy;
		return d2;
	}

	/** How far an object is from the nearest interest, in units of that interest's radius (0: at it; 1: at the edge of range). */
	_distNorm (obj: IgeNetObject): number {
		let best = Infinity;
		for (const interest of this._interests) {
			if (!this._where(interest)) continue;
			const radius = interest.radius ?? this.nearRadius ?? this._rep.nearRadius;
			const d = Math.sqrt(this._distance2(obj, this._ix, this._iz, this._iy)) / radius;
			if (d < best) best = d;
		}
		return best;
	}

	/** Whether the state has changes the viewer lacks at the detail it's at. */
	_hasChanges (state: IgeNetViewState): boolean {
		const obj = state.obj;
		const cl = obj._classLast;
		if (!cl) return obj._lastChange > state.acked[0];
		const acked = state.acked;
		if (!state.full) return cl[obj.schema.blipClass] > acked[obj.schema.blipClass];
		for (let c = 0; c < cl.length; c++) if (cl[c] > acked[c]) return true;
		return false;
	}

	/**
	 * Works out who's near: which spatial objects are in full detail (within an interest's range
	 * or focused), moves the ones whose detail changed, and brings what has something to send
	 * into the work set. Costs the grid cells the ranges cover, the objects in them, and the blips due this round.
	 */
	_relevance (round: number): void {
		const rep = this._rep;
		const now = this._fullPrev;
		now.clear();
		this._fullPrev = this._fullNow;
		this._fullNow = now;
		const prev = this._fullPrev;
		for (const set of [this._focus, this._controlled]) {
			for (const obj of set) {
				let state = this._states.get(obj);
				if (!state && obj._spatial && !obj.schema.blips && !obj.destroyed && rep._scopeSees(obj, this)) {
					this._admitted.add(obj);
					rep._reconcile(obj, this);
					state = this._states.get(obj);
				}
				if (state && state.spatial) now.add(state);
			}
		}
		const near = this._near;
		const hysteresis = 1 + rep.hysteresis;
		for (const interest of this._interests) {
			if (!this._where(interest)) continue;
			const radius = interest.radius ?? this.nearRadius ?? rep.nearRadius;
			const x = this._ix, z = this._iz, y = this._iy;
			for (const scope of this.scopes) {
				const grid = rep._scopes.get(scope)?.grid;
				if (!grid) continue;
				near.length = 0;
				grid.query(x, z, radius * hysteresis, near);
				const enter2 = radius * radius, leave2 = enter2 * hysteresis * hysteresis;
				for (let i = 0; i < near.length; i++) {
					const obj = near[i];
					const d2 = this._distance2(obj, x, z, y);
					if (d2 > leave2) continue;
					let state = this._states.get(obj);
					if (!state) {
						// A kind with no blips is seen only in range: it's made for the viewer now
						if (obj.schema.blips || d2 > enter2 || !rep._scopeSees(obj, this)) continue;
						this._admitted.add(obj);
						rep._reconcile(obj, this);
						state = this._states.get(obj);
						if (!state) continue;
					}
					if (now.has(state)) continue;
					if (d2 <= enter2 || prev.has(state)) now.add(state);
				}
			}
		}
		near.length = 0;
		// Kinds with no blips that are out of range (and not focused) go
		for (const obj of this._admitted) {
			const state = this._states.get(obj);
			if (state && now.has(state)) continue;
			this._admitted.delete(obj);
			rep._reconcile(obj, this);
		}
		for (const state of now) {
			if (!prev.has(state)) {
				if (state.obj.schema.blips) this._promote(state);
				this._slotDelete(state);
				this._work.add(state);
			} else if (this._hasChanges(state)) {
				this._work.add(state);
			}
		}
		for (const state of prev) {
			if (now.has(state) || state.dead) continue;
			if (state.obj.schema.blips) this._demote(state);
		}
		// Blips due this round
		const slots = this._slots;
		for (let i = 0; i < slots.length; i++) {
			for (const state of slots[i].sets[round % slots[i].period]) {
				if (this._hasChanges(state)) this._work.add(state);
			}
		}
	}

	/**
	 * Looks at one state in the work set: makes a candidate for it if there's something to send now,
	 * drops it from the set if nothing's pending, keeps it if what's pending is held back.
	 */
	_candidate (state: IgeNetViewState, round: number, tick: number): void | typeof KEEP {
		const rep = this._rep;
		const obj = state.obj;
		const schema = obj.schema;
		// What the machine predicts isn't held back by rates (or the budget, in _build)
		const ctl = this._controlled.size > 0 && this._controlled.has(obj);
		let cand: Candidate;
		// An entry of it going in slices holds up the classes it carries (one left from before a change of detail is over)
		let xfer = state.xfer;
		if (xfer && (xfer.done || xfer.gen !== state.gen)) xfer = state.xfer = undefined;
		const busy = xfer ? xfer.classes : 0;
		if (!state.known) {
			if (xfer) return KEEP;
			if (rep._resend && state.sentEver && round - state.createRound < rep._resend) return KEEP;
			const level = state.full;
			cand = this._take(state);
			cand.create = true;
			cand.level = level;
			cand.classes = level ? (1 << schema.classCount) - 1 : 1 << schema.blipClass;
			cand.payload = rep._createPayload(obj, level);
			cand.gated = false;
			cand.still = 0;
			return;
		}
		const full = state.full;
		let gated = false;
		let pending = false;
		// The object's rate
		const maxRate = schema.options.maxRate;
		const objectGated = !ctl && !!maxRate && round - state.lastRound < rep.sendRate / maxRate - 1e-9;
		let classes = 0;
		let mask: IgeNetMask = schema.emptyMask;
		let blipUpdate = false;
		if (!full) {
			// An anonymous blip: its blip fields as they are, at the blip rate
			const bc = schema.blipClass;
			const changed = obj._classLast ? obj._classLast[bc] : obj._lastChange;
			if (changed > state.acked[bc]) {
				pending = true;
				const rate = schema.options.blipRate ?? rep.blipRate;
				if (objectGated || (busy >>> bc) & 1) gated = true;
				else if (rate && round - state.sr![bc] < rep.sendRate / rate - 1e-9) gated = true;
				else if (rep._resend && changed <= state.se![bc] && round - state.sr![bc] < rep._resend) gated = true;
				else {
					classes = 1 << bc;
					blipUpdate = true;
				}
			}
		} else if (schema.classCount === 1) {
			if (obj._lastChange > state.acked[0]) {
				const m = rep._maskFor(obj, state.acked[0]);
				if (!igeNetMaskEmpty(m)) {
					pending = true;
					if (objectGated || busy) gated = true;
					else if (rep._resend && obj._lastChange <= state.se![0] && round - state.sr![0] < rep._resend) gated = true;
					else if (!ctl && schema.classRate[0] && round - state.sr![0] < rep.sendRate / schema.classRate[0] - 1e-9) gated = true;
					else {
						mask = m;
						classes = 1;
					}
				}
			}
		} else {
			const cl = obj._classLast!;
			for (let c = 0; c < schema.classCount; c++) {
				if (cl[c] <= state.acked[c]) continue;
				pending = true;
				if (objectGated || (busy >>> c) & 1) {
					gated = true;
					continue;
				}
				const rate = schema.classRate[c];
				if (!ctl && rate && round - state.sr![c] < rep.sendRate / rate - 1e-9) {
					gated = true;
					continue;
				}
				if (rep._resend && cl[c] <= state.se![c] && round - state.sr![c] < rep._resend) {
					gated = true;
					continue;
				}
				mask = classes ? orMask(mask, rep._classMask(obj, c, state.acked[c])) : rep._classMask(obj, c, state.acked[c]);
				classes |= 1 << c;
			}
		}
		if (!classes) {
			if (!pending) {
				this._work.delete(state);
				state.priority = 0;
				state.pendingSince = -1;
				state.heldTick = -1;
				return;
			}
			// Everything pending waits (a rate, a resend gap)
			if (state.heldTick < 0) state.heldTick = this._lastTick;
			return KEEP;
		}
		cand = this._take(state);
		cand.create = false;
		cand.level = full;
		cand.classes = classes;
		cand.payload = blipUpdate ? rep._blipUpdatePayload(obj) : rep._updatePayload(obj, mask, state);
		cand.gated = gated;
		cand.still = state.heldTick >= 0 && state.heldTick < this._lastTick ? tick - state.heldTick : 0;
	}

	_take (state: IgeNetViewState): Candidate {
		const cands = this._cands;
		let cand = this._pool[cands.length];
		if (!cand) this._pool[cands.length] = cand = { state, create: false, classes: 0, level: true, payload: { byte: 0, bits: 0 }, gated: false, still: 0 };
		cand.state = state;
		cands.push(cand);
		return cand;
	}

	/** What a candidate adds to its object's priority this round: the kind and group, nearness, focus, ownership, creates. */
	_weigh (cand: Candidate): number {
		const rep = this._rep;
		const state = cand.state;
		const obj = state.obj;
		const schema = obj.schema;
		let weight = schema.priority;
		if (schema.classCount > 1 && cand.classes) {
			let best = 0;
			for (let c = 0; c < schema.classCount; c++) if (((cand.classes >>> c) & 1) && schema.classPriority[c] > best) best = schema.classPriority[c];
			weight *= best || 1;
		}
		if (state.spatial) {
			const d = this._distNorm(obj);
			weight *= Math.max(0.05, 1 / (1 + d * d));
		}
		if (obj.owner === this) weight *= rep.weights.owner;
		if (this._focus.size && this._focus.has(obj)) weight *= rep.weights.focus;
		if (cand.create) weight *= rep.weights.create;
		return weight;
	}

	/** Builds and sends this viewer's packets for the round. Returns the bytes sent. */
	_build (epoch: number, tick: number): number {
		const rep = this._rep;
		const round = rep._round;
		if (this._spatialCount || this._fullNow.size || this._admitted.size || this._focus.size || this._controlled.size || this._interests.length) this._relevance(round);
		const cands = this._cands;
		cands.length = 0;
		for (const state of this._work) this._candidate(state, round, tick);

		const bandwidth = this._bandwidth();
		const limited = Number.isFinite(bandwidth);
		const handleBits = igeNetBitsFor(this._high + 1);
		const destroyCount = this._destroys.size;
		const schemas = rep.schemas;
		let destroyBits = destroyCount * handleBits;
		if (schemas.hasReasons && destroyCount) for (const st of this._destroys.values()) destroyBits += 1 + (st.reason >= 0 ? schemas.reasonBits : 0);
		// Events go first, and what they take is out of the budget the entries have
		const evs = this._events.length ? this._takeEvents(round) : NO_EVENTS;
		let eventBits = 0;
		for (let i = 0; i < evs.length; i++) eventBits += igeNetEventBits(schemas, evs[i].wire, evs[i].reliable, i === 0, tick);
		const controlled = this._controlled;
		// Entries too big to send at once go in slices over the next rounds (with a budget to keep to; never what the machine predicts)
		const sliceBytes = rep.sliceBytes;
		if (limited && sliceBytes > 0) {
			let k = 0;
			for (let i = 0; i < cands.length; i++) {
				const cand = cands[i];
				if (cand.payload.bits > sliceBytes * 8 && !(controlled.size && controlled.has(cand.state.obj)) && !this._split(cand, sliceBytes, epoch, round)) continue;
				cands[k++] = cand;
			}
			cands.length = k;
		}
		let xfers = this._xfers;
		if (xfers.length) {
			// Done, or no longer wanted (the object went, or its detail changed)
			xfers = this._xfers = xfers.filter((x) => {
				const state = x.state;
				if (!x.done && state.xfer === x && !state.dead && x.gen === state.gen) return true;
				if (state.xfer === x) state.xfer = undefined;
				return false;
			});
		}
		const slices = this._slices;
		slices.length = 0;
		let sliceBits = 0;
		let selected: Candidate[] = cands;
		let oldest = Infinity;
		const perRound = limited ? bandwidth / rep.sendRate : Infinity;
		if (limited) {
			this._allow = this._allow < 0 ? perRound * rep.carry : Math.min(this._allow + perRound, perRound * rep.carry);
			const availBits = (this._allow - 12 - destroyBits / 8) * 8 - eventBits;
			// The machine's own records first: a slice of each
			for (const x of xfers) if (x.own) sliceBits += this._slice(x, sliceBytes, availBits - sliceBits, round, handleBits);
			// A share kept for the rest while any wait (none by default: they have what nothing else wants)
			let reserve = 0;
			if (rep.sliceShare > 0) {
				for (const x of xfers) {
					if (x.own) continue;
					reserve = Math.min(rep.sliceShare * perRound * 8, Math.max(0, availBits - sliceBits));
					break;
				}
			}
			const forEntries = availBits - sliceBits - reserve;
			let wanted = 0;
			for (const cand of cands) wanted += entryBits(cand, handleBits);
			let used = wanted;
			if (wanted > forEntries && cands.length > 1) {
				// More wanted than the budget holds: everything waiting gathers priority, and the budget is spent from the top
				for (const cand of cands) {
					const state = cand.state;
					state.priority += this._weigh(cand);
					if (state.pendingSince < 0) state.pendingSince = round;
				}
				cands.sort((a, b) => b.state.priority - a.state.priority);
				used = 0;
				selected = [];
				// What the machine predicts goes whatever the budget
				if (controlled.size) {
					for (const cand of cands) {
						if (!controlled.has(cand.state.obj)) continue;
						selected.push(cand);
						used += entryBits(cand, handleBits);
					}
				}
				let first = true;
				for (let i = 0; i < cands.length; i++) {
					const cand = cands[i];
					if (controlled.size && controlled.has(cand.state.obj)) continue;
					const cost = entryBits(cand, handleBits);
					// The first is always sent, so nothing is too big for ever
					if (first || used + cost <= forEntries) {
						selected.push(cand);
						used += cost;
						first = false;
					} else if (forEntries - used < 16) {
						break;
					}
				}
				if (selected.length < cands.length) {
					const chosen = new Set(selected);
					const last = this._lastTick;
					for (const cand of cands) {
						if (chosen.has(cand)) continue;
						const state = cand.state;
						const since = state.pendingSince;
						if (since >= 0 && since < oldest) oldest = since;
						// Held back: the viewer's copy was current at the last round
						if (!cand.create && state.heldTick < 0) state.heldTick = last;
					}
				}
			}
			// Slices have what's left, oldest transfer first
			let spare = availBits - sliceBits - used;
			for (const x of xfers) {
				while (spare > 0) {
					const bits = this._slice(x, sliceBytes, spare, round, handleBits);
					if (!bits) break;
					sliceBits += bits;
					spare -= bits;
				}
			}
		} else if (xfers.length) {
			// No budget (any more): the rest of each goes now
			for (const x of xfers) while (this._slice(x, sliceBytes || Infinity, Infinity, round, handleBits));
		}
		this.stats.deferred = cands.length - selected.length;
		this.stats.oldestPendingAge = oldest === Infinity ? 0 : (round - oldest) / rep.sendRate;
		this.stats.entries = selected.length;

		// Packets: destroys first, then entries in priority order, then slices, split where a packet would pass the size limit
		const maxPacket = this.maxPacketBytes ?? rep.maxPacketBytes;
		const items = selected.length + destroyCount + slices.length + evs.length;
		const destroyHandles = destroyCount ? [...this._destroys.keys()] : [];
		let total = 0;
		let next = 0;
		let nextDestroy = 0;
		let nextSlice = 0;
		let nextEvent = 0;
		const kinds = this.stats.byKind;
		const arena = rep._arena.buffer;
		const w = rep._msg;
		do {
			const seq = ++this._seq;
			w.reset();
			const remaining = items - next - nextDestroy - nextSlice - nextEvent;
			let bits = 8 + 8 * (varBytes(seq) + varBytes(tick) + varBytes(this.inputAck)) + 6 + 4 * 8 * varBytes(remaining);
			const dH: number[] = [];
			const cE: Candidate[] = [];
			const uE: Candidate[] = [];
			const sE: Slice[] = [];
			const eE: EventEntry[] = [];
			let count = 0;
			while (nextEvent < evs.length) {
				const e = evs[nextEvent];
				const cost = igeNetEventBits(schemas, e.wire, e.reliable, eE.length === 0, tick);
				if (maxPacket && count > 0 && (bits + cost + 7) >> 3 > maxPacket) break;
				eE.push(e);
				bits += cost;
				nextEvent++;
				count++;
			}
			while (nextEvent >= evs.length && nextDestroy < destroyHandles.length) {
				const st = this._destroys.get(destroyHandles[nextDestroy])!;
				const cost = handleBits + (schemas.hasReasons ? 1 + (st.reason >= 0 ? schemas.reasonBits : 0) : 0);
				if (maxPacket && count > 0 && (bits + cost + 7) >> 3 > maxPacket) break;
				dH.push(destroyHandles[nextDestroy++]);
				bits += cost;
				count++;
			}
			while (next < selected.length && nextDestroy >= destroyHandles.length) {
				const cand = selected[next];
				const cost = entryBits(cand, handleBits);
				if (maxPacket && count > 0 && (bits + cost + 7) >> 3 > maxPacket) break;
				(cand.create ? cE : uE).push(cand);
				bits += cost;
				next++;
				count++;
			}
			while (nextSlice < slices.length && next >= selected.length && nextDestroy >= destroyHandles.length) {
				const slice = slices[nextSlice];
				const cost = sliceCost(slice, handleBits);
				if (maxPacket && count > 0 && (bits + cost + 7) >> 3 > maxPacket) break;
				sE.push(slice);
				bits += cost;
				nextSlice++;
				count++;
			}
			let flags = 0;
			if (dH.length) flags |= 1;
			if (cE.length) flags |= 2;
			if (uE.length) flags |= 4;
			if (sE.length) flags |= 8;
			w.writeBits(eE.length ? IGE_NET_PACKET_SNAPSHOT_EVENTS : IGE_NET_PACKET_SNAPSHOT, 4);
			w.writeBits(flags, 4);
			w.writeVarUint(seq);
			w.writeVarUint(tick);
			w.writeVarUint(this.inputAck);
			if (eE.length) {
				const before = w.bitLength;
				w.writeVarUint(eE.length);
				let prevSeq = 0;
				for (const e of eE) {
					igeNetWriteEvent(w, schemas, e.wire, tick, e.reliable, e.seq, prevSeq);
					if (e.reliable) prevSeq = e.seq;
				}
				const eventBytes = (w.bitLength - before) / 8;
				this.stats.eventBytes += eventBytes;
				rep.stats.events += eE.length;
				rep.stats.eventBytes += eventBytes;
			}
			if (flags) {
				w.writeBits(handleBits, 6);
				if (dH.length) {
					w.writeVarUint(dH.length);
					for (const handle of dH) {
						w.writeBits(handle, handleBits);
						if (schemas.hasReasons) {
							const reason = this._destroys.get(handle)!.reason;
							if (reason >= 0) {
								w.writeBits(1, 1);
								w.writeBits(reason, schemas.reasonBits);
							} else {
								w.writeBits(0, 1);
							}
						}
					}
				}
				if (cE.length) {
					w.writeVarUint(cE.length);
					for (const cand of cE) {
						w.writeBits(cand.state.handle, handleBits);
						w.writeBitsFrom(arena, cand.payload.byte, cand.payload.bits);
						const kind = cand.state.obj.kind;
						kinds[kind] = (kinds[kind] ?? 0) + (cand.payload.bits + handleBits) / 8;
					}
				}
				if (uE.length) {
					w.writeVarUint(uE.length);
					for (const cand of uE) {
						w.writeBits(cand.state.handle, handleBits);
						// After a wait: how many ticks back the machine's copy was current (it blends across the wait)
						if (cand.still) {
							w.writeBits(1, 1);
							w.writeVarUint(cand.still);
						} else {
							w.writeBits(0, 1);
						}
						w.writeBitsFrom(arena, cand.payload.byte, cand.payload.bits);
						const kind = cand.state.obj.kind;
						kinds[kind] = (kinds[kind] ?? 0) + (cand.payload.bits + handleBits) / 8;
					}
				}
				if (sE.length) {
					w.writeVarUint(sE.length);
					for (const slice of sE) {
						const x = slice.xfer;
						w.writeBits(x.state.handle, handleBits);
						w.writeVarUint(x.id);
						w.writeBits(x.create ? 1 : 0, 1);
						w.writeVarUint(x.bytes.length);
						w.writeVarUint(slice.off);
						w.writeVarUint(slice.len);
						w.writeBitsFrom(x.bytes, slice.off, slice.len * 8);
						const kind = x.state.obj.kind;
						kinds[kind] = (kinds[kind] ?? 0) + sliceCost(slice, handleBits) / 8;
					}
				}
			}
			this._sent(seq, epoch, round, dH, cE, uE, sE, eE);
			rep.stats.creates += cE.length;
			rep.stats.updates += uE.length;
			rep.stats.destroys += dH.length;
			rep.stats.slices += sE.length;
			rep.stats.packets++;
			rep._windowPackets++;
			const bytes = w.toBytes();
			this.stats.bytes += bytes.length;
			this.stats.packets++;
			this._window += bytes.length;
			total += bytes.length;
			this._send(bytes);
		} while (next < selected.length || nextDestroy < destroyHandles.length || nextSlice < slices.length || nextEvent < evs.length);
		if (evs.length) this._events = this._events.filter((e) => !e.done);
		// Reliable: a transfer whose last byte went is delivered
		if (!this.lossy) for (const x of xfers) if (!x.done && x.next >= x.bytes.length) this._xferDone(x);
		if (limited) this._allow = Math.max(-perRound * rep.carry * 2, this._allow - total);
		this._lastTick = tick;
		return total;
	}

	/**
	 * A candidate too big to send at once: the classes (groups) too big on their own go in slices, the
	 * rest stays a candidate this round. Returns whether anything is left to send now.
	 */
	_split (cand: Candidate, sliceBytes: number, epoch: number, round: number): boolean {
		const rep = this._rep;
		const state = cand.state;
		const obj = state.obj;
		// Several classes in an update: only the big ones wait
		if (!cand.create && cand.level && cand.classes & (cand.classes - 1)) {
			let big = 0;
			let bigMask: IgeNetMask | undefined;
			let small = 0;
			let smallMask: IgeNetMask | undefined;
			for (let c = 0; c < obj.schema.classCount; c++) {
				if (!((cand.classes >>> c) & 1)) continue;
				const mask = rep._classMask(obj, c, state.acked[c]);
				if (rep._updatePayload(obj, mask, state).bits > sliceBytes * 8) {
					big |= 1 << c;
					bigMask = bigMask === undefined ? mask : orMask(bigMask, mask);
				} else {
					small |= 1 << c;
					smallMask = smallMask === undefined ? mask : orMask(smallMask, mask);
				}
			}
			if (big && small) {
				this._startTransfer(state, false, big, rep._updatePayload(obj, bigMask!, state), epoch, round);
				cand.classes = small;
				cand.payload = rep._updatePayload(obj, smallMask!, state);
				return true;
			}
		}
		this._startTransfer(state, cand.create, cand.classes, cand.payload, epoch, round);
		return false;
	}

	/** Starts sending an entry too big to go at once in slices: its bytes are kept, and the classes it carries wait for it. */
	_startTransfer (state: IgeNetViewState, create: boolean, classes: number, payload: Payload, epoch: number, round: number): void {
		const start = payload.byte;
		const x: Transfer = {
			state,
			id: ++this._xferId,
			create,
			classes,
			epoch,
			gen: state.gen,
			bytes: this._rep._arena.buffer.slice(start, start + ((payload.bits + 7) >> 3)),
			next: 0,
			pieces: this.lossy ? [] : undefined,
			ackedBytes: 0,
			own: state.obj.owner === this,
			done: false
		};
		state.xfer = x;
		this._xfers.push(x);
		state.priority = 0;
		state.pendingSince = -1;
		state.lastRound = round;
		if (create) {
			state.sentEver = true;
			state.createRound = round;
		}
		if (state.sr) {
			for (let c = 0; c < state.sr.length; c++) {
				if ((classes >>> c) & 1) {
					state.sr[c] = round;
					state.se![c] = epoch;
				}
			}
		}
		this._rep.stats.transfers++;
	}

	/**
	 * Adds the next slice of a transfer to this round's (a lost or long-unacknowledged piece again
	 * first, on a lossy transport) if one fits in `availBits`. Returns the bits it takes, 0 for none.
	 */
	_slice (x: Transfer, maxBytes: number, availBits: number, round: number, handleBits: number): number {
		const total = x.bytes.length;
		const head = handleBits + 1 + 8 * (varBytes(x.id) + varBytes(total) + 6);
		const room = Math.min(maxBytes, Math.floor((availBits - head) / 8));
		if (room <= 0) return 0;
		let off = -1;
		let len = 0;
		let piece: Piece | undefined;
		if (x.pieces) {
			const resend = this._rep._resend;
			for (const p of x.pieces) {
				if (p.acked || p.round === round || !(p.lost || round - p.round >= resend)) continue;
				if (p.len > room) return 0;
				piece = p;
				break;
			}
			if (piece) {
				off = piece.off;
				len = piece.len;
				piece.round = round;
				piece.lost = false;
			}
		}
		if (off < 0) {
			if (x.next >= total) return 0;
			len = Math.min(total - x.next, room);
			// Not worth a header for a crumb, unless it finishes the entry
			if (len < MIN_SLICE && len < total - x.next) return 0;
			off = x.next;
			x.next += len;
			if (x.pieces) {
				piece = { off, len, round, acked: false, lost: false };
				x.pieces.push(piece);
			}
		}
		const slice: Slice = { xfer: x, off, len, piece };
		this._slices.push(slice);
		return sliceCost(slice, handleBits);
	}

	/** A transfer delivered: the machine has the state it carried. */
	_xferDone (x: Transfer): void {
		x.done = true;
		const state = x.state;
		if (state.xfer === x) state.xfer = undefined;
		if (state.dead || x.gen !== state.gen) return;
		if (x.create) state.known = true;
		for (let c = 0; c < state.acked.length; c++) if ((x.classes >>> c) & 1 && x.epoch > state.acked[c]) state.acked[c] = x.epoch;
		// What changed meanwhile goes next
		this._work.add(state);
	}

	/** A packet given up on: its slices go again. */
	_lost (packet: SentPacket): void {
		// Reliable events it carried go again at once
		if (packet.events) for (const e of packet.events) if (!e.done) e.sentRound = -1e9;
		if (!packet.slices) return;
		for (const slice of packet.slices) if (!slice.piece!.acked) slice.piece!.lost = true;
	}

	/** Records what a packet carried: acknowledged at once on a reliable transport, remembered until acknowledged on a lossy one. */
	_sent (seq: number, epoch: number, round: number, destroys: number[], creates: Candidate[], updates: Candidate[], slices: Slice[], events: EventEntry[] = []): void {
		const lossy = this.lossy;
		const entries: SentEntry[] | undefined = lossy ? [] : undefined;
		const apply = (cand: Candidate) => {
			const state = cand.state;
			const schema = state.obj.schema;
			const level: boolean | undefined = undefined;
			if (cand.create) {
				state.sentEver = true;
				state.createRound = round;
			}
			state.priority = 0;
			state.pendingSince = -1;
			if (!cand.gated) state.heldTick = -1;
			state.lastRound = round;
			if (state.sr) {
				for (let c = 0; c < state.sr.length; c++) {
					if ((cand.classes >>> c) & 1) {
						state.sr[c] = round;
						state.se![c] = epoch;
					}
				}
			}
			if (lossy) {
				entries!.push({ state, classes: cand.classes, create: cand.create, level, gen: state.gen });
				return;
			}
			if (cand.create) state.known = true;
			for (let c = 0; c < state.acked.length; c++) if ((cand.classes >>> c) & 1) state.acked[c] = epoch;
			if (!cand.gated) this._work.delete(state);
		};
		for (const cand of creates) apply(cand);
		for (const cand of updates) apply(cand);
		let reliableEvents: EventEntry[] | undefined;
		for (const e of events) {
			if (e.reliable && lossy) {
				e.sentRound = round;
				(reliableEvents ??= []).push(e);
			} else {
				e.done = true;
			}
		}
		if (lossy) {
			this._packets.set(seq, { seq, epoch, entries: entries!, destroys, slices: slices.length ? slices.slice() : undefined, events: reliableEvents });
			if (this._packets.size > 128) {
				const oldest = this._packets.keys().next().value!;
				this._lost(this._packets.get(oldest)!);
				this._packets.delete(oldest);
			}
		} else {
			for (const handle of destroys) {
				this._destroys.delete(handle);
				this._free.push(handle);
			}
		}
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
	/** Json fields sent as a patch, and sent whole (creates included). */
	jsonPatches: number;
	jsonWhole: number;
	/** Entries sent in slices (begun), and slices sent. */
	transfers: number;
	slices: number;
	/** Events sent (counted once per viewer packet they were in, resends included) and the bytes of the events sections. */
	events: number;
	eventBytes: number;
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
	/** Flushes per second (default 20): rates, the bandwidth budget and ages count in flushes. The host sets it to its send rate. */
	sendRate?: number;
	/**
	 * Bytes per second each viewer may be sent (a viewer can have its own). Default: 32768 when any
	 * kind declares relevance, else no limit. Infinity (or 0) is no limit.
	 */
	bandwidth?: number;
	/** The largest packet in bytes; a round's output is split to fit (default 0: any size). An entry bigger than this goes in a packet alone. */
	maxPacketBytes?: number;
	/** The default near range for interest points without a radius (default 1000, in the units of the position fields). */
	nearRadius?: number;
	/** Blips per second for kinds that don't say (default 2). */
	blipRate?: number;
	/** The size of a grid cell (default 1000; a bit under the usual near range works well). Per scope: configureScope(). */
	cellSize?: number;
	/** An object that was in range stays in full detail until it's this much farther than the range (default 0.1: 10%), so one on the edge doesn't flip each round. */
	hysteresis?: number;
	/** How many rounds of unused bandwidth are kept for a big entry (default 2). */
	carry?: number;
	/**
	 * With a bandwidth budget, an entry bigger than this many bytes (a big record's create, a large
	 * change) goes in slices of at most this size over the next rounds instead of all at once, so it
	 * never holds the rest up; the machine applies it when the last slice is in. Default 512; 0: never.
	 */
	sliceBytes?: number;
	/**
	 * The part of each round's budget kept for slices while any are waiting (0 to 1). Default 0: they
	 * have only what nothing else wants. A viewer's own objects (owner) always get a slice first.
	 */
	sliceShare?: number;
	/** Lossy transports: rounds to wait before sending the same unacknowledged change again (default 0 without a bandwidth budget, else a sixth of a second's worth). */
	resendAfter?: number;
	/** Rounds before a reliable event is sent again on a lossy transport while unacknowledged (default 3). */
	eventResendAfter?: number;
	/** Multipliers on the priority of an object's changes: when the viewer focuses on it, when it's the viewer's own private object, when it's a create. */
	weights?: { focus?: number; owner?: number; create?: number };
}

/**
 * The authority's registry of replicated objects. The game creates objects of the kinds its
 * schemas declare and writes to them as the world changes; viewers (one per connection) subscribe
 * to scopes, own private objects or have objects revealed; flush() makes each viewer its packets:
 * creates for what it newly sees, destroys for what it no longer does, and for objects
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
 * - Relevance: objects of "spatial" kinds sit in a grid per scope; a viewer finds what's near by
 *   the cells its range covers, sends those in full detail and the rest as occasional blips, and
 *   fills a bandwidth budget in priority order (changes it can't fit wait and gather priority).
 *
 * Baselines: each viewer holds, per object and field class, the epoch of the state it's known to
 * have. On a reliable transport (WebSocket) a send counts as delivered at once. On a lossy one
 * (viewer `lossy`) an update carries everything changed since the last epoch the machine
 * acknowledged (ack()), so any packet can be lost or arrive late.
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
		bytes: 0, packets: 0, creates: 0, updates: 0, destroys: 0, cacheHits: 0, cacheMisses: 0, jsonPatches: 0, jsonWhole: 0, transfers: 0, slices: 0, events: 0, eventBytes: 0, flushMs: 0, lastFlushMs: 0, flushes: 0
	};
	sendRate: number;
	bandwidth: number;
	maxPacketBytes: number;
	nearRadius: number;
	blipRate: number;
	cellSize: number;
	hysteresis: number;
	carry: number;
	sliceBytes: number;
	sliceShare: number;
	weights: { focus: number; owner: number; create: number };
	_resend: number;
	/** Rounds before a reliable event is sent again on a lossy transport. */
	_eventResend: number;
	_eventMarks = 0;
	/** The reason a removal in progress (a scope move) carries. */
	_removeReason = -1;
	_evw = new IgeNetBitWriter(256);
	_objects: Map<string, IgeNetObject> = new Map();
	_viewers: Set<IgeNetViewer> = new Set();
	_scopes: Map<string, { objects: Set<IgeNetObject>; viewers: Set<IgeNetViewer>; grid?: IgeNetGrid<IgeNetObject>; cellSize?: number }> = new Map();
	_dirty: IgeNetObject[] = [];
	_beforeFlush: (() => void)[] = [];
	/** Changes are stamped with the current epoch; flush() sends everything up to it, then moves on. */
	_epoch = 1;
	_round = 0;
	_arena = new IgeNetBitWriter(1 << 16);
	_msg = new IgeNetBitWriter(1 << 12);
	/** Where json patches are encoded (copied out as bytes, kept for the round). */
	_jsonScratch = new IgeNetBitWriter(1 << 12);
	/** The object being encoded, and its json fields' base versions (update payloads). */
	_jwObj?: IgeNetObject;
	_jwBases?: (JsonVersion | undefined)[];
	_bases: (JsonVersion | undefined)[] = [];
	_jwFn: IgeNetJsonWriter = (w, index) => this._writeJson(w, index);
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
		this.sendRate = options.sendRate ?? 20;
		const bandwidth = options.bandwidth ?? (schemas.hasRelevance ? 32768 : Infinity);
		this.bandwidth = bandwidth > 0 ? bandwidth : Infinity;
		this.maxPacketBytes = options.maxPacketBytes ?? 0;
		this.nearRadius = options.nearRadius ?? 1000;
		this.blipRate = options.blipRate ?? 2;
		this.cellSize = options.cellSize ?? 1000;
		this.hysteresis = options.hysteresis ?? 0.1;
		this.carry = options.carry ?? 2;
		this.sliceBytes = options.sliceBytes ?? 512;
		this.sliceShare = Math.max(0, Math.min(1, options.sliceShare ?? 0));
		this._resend = options.resendAfter ?? (Number.isFinite(this.bandwidth) ? Math.max(1, Math.ceil(this.sendRate / 6)) : 0);
		this._eventResend = Math.max(1, options.eventResendAfter ?? 3);
		this.weights = { focus: options.weights?.focus ?? 8, owner: options.weights?.owner ?? 10, create: options.weights?.create ?? 4 };
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

	/**
	 * Runs `fn` at the very start of every flush(), before anything is sent: the place to read the
	 * game's own state into objects (see IgeNetEntityHost). Returns a function that removes it.
	 */
	beforeFlush (fn: () => void): () => void {
		this._beforeFlush.push(fn);
		return () => {
			const at = this._beforeFlush.indexOf(fn);
			if (at >= 0) this._beforeFlush.splice(at, 1);
		};
	}

	/**
	 * Sends an event (data with the schema set's event key, "t" by default) in the packets of the viewers it's for: see
	 * IgeNetEventTarget. A declared event goes in its binary shape; any other as JSON. It's stamped with the current
	 * tick, goes at the next flush ahead of object updates and counts against each viewer's budget.
	 */
	event (data: unknown, target: IgeNetEventTarget = {}): void {
		const reliable = target.reliable !== false;
		const wire = this._encodeEvent(data);
		const mark = ++this._eventMarks;
		const send = (v: IgeNetViewer) => {
			if (v._eventMark === mark) return;
			v._eventMark = mark;
			v._queueEvent(wire, reliable);
		};
		if (target.on === undefined && target.at === undefined && target.scope === undefined && target.to === undefined) {
			for (const v of this._viewers) send(v);
			return;
		}
		if (target.to) for (const v of Array.isArray(target.to) ? target.to : [target.to]) send(v);
		if (target.scope !== undefined) for (const v of this._scopes.get(target.scope)?.viewers ?? []) send(v);
		if (target.at) {
			const { scope, x, z, y } = target.at;
			for (const v of this._scopes.get(scope)?.viewers ?? []) if (v._nearPoint(x, z, y ?? NaN)) send(v);
		}
		if (target.on !== undefined) {
			for (const item of Array.isArray(target.on) ? target.on : [target.on]) {
				const obj = typeof item === "string" ? this._objects.get(item) : item;
				if (!obj || obj.destroyed) continue;
				for (const v of obj._seenBy.keys()) if (v.holdsFull(obj)) send(v);
				if (obj._spatial && obj.scope) for (const v of this._scopes.get(obj.scope)?.viewers ?? []) if (v.holdsFull(obj)) send(v);
			}
		}
	}

	_encodeEvent (data: unknown): IgeNetEventWire {
		const set = this.schemas;
		const w = this._evw;
		w.reset();
		const type = (data as Record<string, unknown> | undefined)?.[set.eventKey];
		const index = typeof type === "string" ? set.eventIndex.get(type) : undefined;
		let at: number;
		if (index !== undefined) {
			set.events[index].writeEvent(w, data as Record<string, unknown>);
			at = index;
		} else {
			w.writeString(JSON.stringify(data) ?? "null");
			at = set.events.length;
		}
		return { tick: this.tick, type: at, body: w.toBytes(), bits: w.bitLength };
	}

	/** Sets how a scope's grid is cut (the cell size), before objects are in it or after (they're placed again). */
	configureScope (scope: string, options: { cellSize?: number }): void {
		const entry = this._scope(scope);
		entry.cellSize = options.cellSize;
		if (entry.grid) {
			const old = entry.grid;
			entry.grid = undefined;
			for (const obj of old.all()) this._gridOf(scope).add(obj, obj._px, obj._pz);
		}
	}

	/** The grid of a scope (made when the first spatial object is in it), for tests and tools. */
	grid (scope: string): IgeNetGrid<IgeNetObject> | undefined {
		return this._scopes.get(scope)?.grid;
	}

	/** Makes an object of a kind from the schemas, with the given fields (the rest take defaults). */
	create (kind: string, id: string, fields: Record<string, unknown> = {}, options: IgeNetObjectOptions = {}): IgeNetObject {
		if (this._objects.has(id)) throw new Error(`There's an object "${id}" already`);
		const obj = new IgeNetObject(this, this.schemas.kind(kind), id, fields, options);
		this._objects.set(id, obj);
		if (obj.scope && !obj.owner) this._scope(obj.scope).objects.add(obj);
		this._place(obj);
		// Who sees it now
		if (obj.owner) this._reconcile(obj, obj.owner);
		else if (obj.scope && !obj.hidden) for (const viewer of this._scope(obj.scope).viewers) this._reconcile(obj, viewer);
		return obj;
	}

	/**
	 * Removes an object. `reason` (one of its kind's `removeReasons`) goes with the destroy to the viewers that hold it in
	 * full detail; viewers that lose it by going out of range or being unrevealed get no reason.
	 */
	destroy (target: IgeNetObject | string, reason?: string): void {
		const obj = typeof target === "string" ? this._objects.get(target) : target;
		if (!obj || obj.destroyed) return;
		let reasonIndex = -1;
		if (reason !== undefined) {
			reasonIndex = obj.schema.options.removeReasons?.indexOf(reason) ?? -1;
			if (reasonIndex < 0) throw new Error(`${obj.kind}: "${reason}" isn't one of its removeReasons`);
		}
		obj.destroyed = true;
		this._objects.delete(obj.id);
		if (obj.scope) {
			const entry = this._scope(obj.scope);
			entry.objects.delete(obj);
			if (obj._spatial) entry.grid?.remove(obj);
		}
		for (const viewer of [...obj._seenBy.keys()]) {
			viewer._admitted.delete(obj);
			viewer._remove(obj, reasonIndex);
		}
		obj._revealed.clear();
		obj._excluded.clear();
	}

	_scope (name: string): { objects: Set<IgeNetObject>; viewers: Set<IgeNetViewer>; grid?: IgeNetGrid<IgeNetObject>; cellSize?: number } {
		let scope = this._scopes.get(name);
		if (!scope) this._scopes.set(name, (scope = { objects: new Set(), viewers: new Set() }));
		return scope;
	}

	_gridOf (name: string): IgeNetGrid<IgeNetObject> {
		const scope = this._scope(name);
		return (scope.grid ??= new IgeNetGrid<IgeNetObject>(scope.cellSize ?? this.cellSize));
	}

	/** Puts a spatial object in its scope's grid (it's in one only if its kind is spatial and it's in a scope and not private). */
	_place (obj: IgeNetObject): void {
		if (!obj.schema.leveled || !obj.scope || obj.owner) return;
		obj._spatial = true;
		this._gridOf(obj.scope).add(obj, obj._px, obj._pz);
	}

	/** A spatial object's position changed: its cell follows, if it crossed a border. */
	_placed (obj: IgeNetObject): void {
		this._scopes.get(obj.scope!)?.grid?.move(obj, obj._px, obj._pz);
	}

	_moveTo (obj: IgeNetObject, scope: string | undefined, reason = -1): void {
		if (obj.destroyed || obj.scope === scope) return;
		const affected = new Set<IgeNetViewer>(obj._seenBy.keys());
		if (obj.scope) {
			const entry = this._scope(obj.scope);
			entry.objects.delete(obj);
			if (obj._spatial) entry.grid?.remove(obj);
		}
		const wasSpatial = obj._spatial;
		obj._spatial = false;
		obj.scope = scope;
		if (scope && !obj.owner) {
			const entry = this._scope(scope);
			entry.objects.add(obj);
			for (const viewer of entry.viewers) affected.add(viewer);
		}
		this._place(obj);
		if (wasSpatial !== obj._spatial) for (const state of obj._seenBy.values()) state.viewer._respace(state);
		this._removeReason = reason;
		for (const viewer of affected) this._reconcile(obj, viewer);
		this._removeReason = -1;
		// Anyone seeing it must be told its (possibly new) detail
		for (const state of obj._seenBy.values()) state.viewer._work.add(state);
	}

	_visible (obj: IgeNetObject, viewer: IgeNetViewer): boolean {
		if (obj._revealed.has(viewer)) return true;
		if (obj.owner) return obj.owner === viewer;
		if (obj.hidden || obj._excluded.has(viewer)) return false;
		if (!obj.scope || !viewer.scopes.has(obj.scope)) return false;
		// A spatial kind with no blips is seen only while it's in range or focused
		if (obj._spatial && !obj.schema.blips) return viewer._admitted.has(obj);
		return true;
	}

	/** Whether the scope rules would let the viewer see an object, range aside. */
	_scopeSees (obj: IgeNetObject, viewer: IgeNetViewer): boolean {
		if (obj.owner) return false;
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
	_maskFor (obj: IgeNetObject, epoch: number): IgeNetMask {
		this._roundOf(obj);
		let mask = obj._masks.get(epoch);
		if (mask === undefined) {
			mask = obj.schema.maskAfter(obj._changed, epoch);
			obj._masks.set(epoch, mask);
		}
		return mask;
	}

	/** The fields of one class that changed after `epoch`. */
	_classMask (obj: IgeNetObject, c: number, epoch: number): IgeNetMask {
		this._roundOf(obj);
		const cache = (obj._cm ??= []);
		const byEpoch = (cache[c] ??= new Map());
		let mask = byEpoch.get(epoch);
		if (mask === undefined) {
			mask = obj.schema.classMaskAfter(obj._changed, epoch, c);
			byEpoch.set(epoch, mask);
		}
		return mask;
	}

	/** Drops an object's payloads from an earlier round. */
	_roundOf (obj: IgeNetObject): void {
		if (obj._round === this._round) return;
		obj._round = this._round;
		obj._create = undefined;
		obj._createBlip = undefined;
		obj._updates.clear();
		obj._masks.clear();
		obj._cm = undefined;
		obj._jd = undefined;
	}

	/** The version of a json field current at `epoch` (what a viewer whose copy is of that epoch has), or undefined if it's no longer kept. */
	_jsonBase (obj: IgeNetObject, index: number, epoch: number): JsonVersion | undefined {
		const hist = obj._jh[index]!;
		for (let k = hist.length - 1; k >= 0; k--) if (hist[k].epoch <= epoch) return hist[k];
		return undefined;
	}

	/** Writes json field `index` of the object being encoded: a patch against its base version when that's smaller, else whole. */
	_writeJson (w: IgeNetBitWriter, index: number): void {
		const obj = this._jwObj!;
		const hist = obj._jh[index]!;
		const cur = hist[hist.length - 1];
		const base = this._jwBases?.[index];
		if (base && base.ver !== cur.ver && base.text !== undefined && cur.text !== undefined) {
			const patch = this._jsonPatch(obj, index, base, cur);
			if (patch) {
				w.writeVarUint(cur.ver);
				w.writeBits(1, 1);
				w.writeVarUint(cur.ver - base.ver);
				w.writeBitsFrom(patch.bytes, 0, patch.bits);
				this.stats.jsonPatches++;
				return;
			}
		}
		igeNetWriteJsonWhole(w, cur.ver, cur.text);
		this.stats.jsonWhole++;
	}

	/** The patch from one version of a field to another, encoded (once a round per pair), or null when whole is no bigger. */
	_jsonPatch (obj: IgeNetObject, index: number, base: JsonVersion, cur: JsonVersion): { bytes: Uint8Array; bits: number } | null {
		const key = `${index}:${base.ver}:${cur.ver}`;
		const cache = (obj._jd ??= new Map());
		const cached = cache.get(key);
		if (cached !== undefined) return cached;
		let out: { bytes: Uint8Array; bits: number } | null = null;
		const patch = igeNetJsonDiff(parsedOf(base), parsedOf(cur));
		// (A top-level replace is the whole value)
		if (patch && patch.t !== 0) {
			const sw = this._jsonScratch;
			sw.reset();
			igeNetWriteJsonPatch(sw, patch);
			const text = cur.text!;
			const wholeBits = 8 * (varBytes(text.length) + text.length);
			if (sw.bitLength + 8 * varBytes(cur.ver - base.ver) < wholeBits) out = { bytes: sw.toBytes(), bits: sw.bitLength };
		}
		cache.set(key, out);
		return out;
	}

	_createPayload (obj: IgeNetObject, full = true): Payload {
		this._roundOf(obj);
		const cached = full ? obj._create : obj._createBlip;
		if (cached) {
			this.stats.cacheHits++;
			return cached;
		}
		this.stats.cacheMisses++;
		const arena = this._arena;
		arena.align();
		const start = arena.bitLength;
		if (full) {
			arena.writeBits(this.schemas.kinds.indexOf(obj.schema), this.schemas.kindBits);
			arena.writeString(obj.id);
			this._jwObj = obj;
			this._jwBases = undefined;
			obj.schema.writeAll(arena, obj.values, obj._json, obj.schema.jsonIdx.length ? this._jwFn : undefined);
		} else {
			// An anonymous contact: not the id, not the kind, only the shape of a blip and its fields
			arena.writeBits(this.schemas.kinds.length, this.schemas.kindBits);
			arena.writeBits(obj.schema.blipLayout, this.schemas.layoutBits);
			this._jwObj = obj;
			this._jwBases = undefined;
			obj.schema.writeBlip(arena, obj.values, obj._json, obj.schema.jsonIdx.length ? this._jwFn : undefined);
		}
		const payload = { byte: start >> 3, bits: arena.bitLength - start };
		if (full) obj._create = payload;
		else obj._createBlip = payload;
		return payload;
	}

	/** An anonymous blip's update: every blip field, no mask (the machine doesn't know the kind). */
	_blipUpdatePayload (obj: IgeNetObject): Payload {
		this._roundOf(obj);
		let payload = obj._updates.get("blip");
		if (payload) {
			this.stats.cacheHits++;
			return payload;
		}
		this.stats.cacheMisses++;
		const arena = this._arena;
		arena.align();
		const start = arena.bitLength;
		this._jwObj = obj;
		this._jwBases = undefined;
		obj.schema.writeBlip(arena, obj.values, obj._json, obj.schema.jsonIdx.length ? this._jwFn : undefined);
		payload = { byte: start >> 3, bits: arena.bitLength - start };
		obj._updates.set("blip", payload);
		return payload;
	}

	/** The changed fields in `mask`, json ones as patches against what `state`'s viewer has (shared by viewers with the same). */
	_updatePayload (obj: IgeNetObject, mask: IgeNetMask, state?: IgeNetViewState): Payload {
		this._roundOf(obj);
		let key = igeNetMaskKey(mask);
		const schema = obj.schema;
		let bases: (JsonVersion | undefined)[] | undefined;
		if (schema.jsonIdx.length && state) {
			for (const i of schema.jsonIdx) {
				if (!(typeof mask === "number" ? (mask >>> i) & 1 : (mask[i >> 5] >>> (i & 31)) & 1)) continue;
				const base = this._jsonBase(obj, i, state.acked[schema.classOf[i]]);
				(bases = this._bases)[i] = base;
				key = `${key}|${i}:${base ? base.ver : 0}`;
			}
		}
		let payload = obj._updates.get(key);
		if (payload) {
			this.stats.cacheHits++;
			return payload;
		}
		this.stats.cacheMisses++;
		const arena = this._arena;
		arena.align();
		const start = arena.bitLength;
		this._jwObj = obj;
		this._jwBases = bases;
		schema.writeMasked(arena, mask, obj.values, obj._json, schema.jsonIdx.length ? this._jwFn : undefined);
		payload = { byte: start >> 3, bits: arena.bitLength - start };
		obj._updates.set(key, payload);
		return payload;
	}

	/**
	 * Makes and sends every enabled viewer's packets for the changes since the last flush. Call it at
	 * the send rate, after the game has written its tick. Returns the bytes sent.
	 */
	flush (): number {
		const started = this._now();
		for (const fn of this._beforeFlush.slice()) fn();
		this._round++;
		this._arena.reset();
		const epoch = this._epoch;
		for (const obj of this._dirty) {
			obj._dirty = false;
			if (obj.destroyed) continue;
			// Spatial objects are found by the viewers they're near (or due a blip), not pushed to all
			if (obj._spatial) continue;
			for (const state of obj._seenBy.values()) state.viewer._work.add(state);
		}
		this._dirty.length = 0;
		let total = 0;
		for (const viewer of this._viewers) {
			if (!viewer.enabled) continue;
			total += viewer._build(epoch, this.tick);
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

	/**
	 * Totals over every viewer: bytes by kind, entries held back last round, the longest an unsent
	 * change has waited (seconds), the busiest viewer's share of its budget, objects at each detail level, and the grids.
	 */
	report (): { viewers: number; byKind: Record<string, number>; deferred: number; oldestPendingAge: number; maxBudgetUse: number; detail: { full: number; blip: number }; grids: Record<string, { cells: number; objects: number }> } {
		let deferred = 0, oldest = 0, maxUse = 0, full = 0, blip = 0;
		for (const viewer of this._viewers) {
			const report = viewer.report();
			deferred += report.deferred;
			oldest = Math.max(oldest, report.oldestPendingAge);
			maxUse = Math.max(maxUse, report.budgetUse);
			full += report.detail.full;
			blip += report.detail.blip;
		}
		const grids: Record<string, { cells: number; objects: number }> = {};
		for (const [name, scope] of this._scopes) if (scope.grid) grids[name] = { cells: scope.grid.cells.size, objects: scope.grid.size };
		return { viewers: this._viewers.size, byKind: this.bytesByKind(), deferred, oldestPendingAge: oldest, maxBudgetUse: maxUse, detail: { full, blip }, grids };
	}
}
