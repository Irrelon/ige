import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeNetConnection } from "@/engine/network/sync/IgeNetTransport";
import type {
	IgeNetClientMessage,
	IgeNetEntities,
	IgeNetEntityState,
	IgeNetInputFrame,
	IgeNetServerMessage,
	IgeNetWelcome
} from "@/engine/network/sync/igeNetSyncProtocol";

/** How a field is blended between snapshots: numbers (and arrays of them) linearly by default. */
export type IgeNetFieldBlend = "linear" | "angle" | "none";

export interface IgeNetSyncClientOptions {
	/** How far behind the newest snapshot other entities are drawn, in ms (default 100). */
	interpolationDelay?: number;
	/** Input frames repeated in each message, so a lost packet costs nothing (default 3). */
	inputRedundancy?: number;
	/** Per-field blending; fields not listed blend linearly if numeric, otherwise take the older value. */
	blend?: Record<string, IgeNetFieldBlend>;
	/** Full snapshots kept for deltas and interpolation (default 32). */
	history?: number;
	/** Clock (ms), for tests. */
	now?: () => number;
	/** Ping interval in ms (default 1000; 0 turns pinging off). */
	pingInterval?: number;
	/**
	 * After joining, give up on the authority when nothing has been heard
	 * from it for this long, in ms (default 10000; 0 waits forever): the
	 * connection is closed and "disconnected" fires. Catches hosts that
	 * vanish without closing (a frozen tab, a dropped network). Checked
	 * with each ping, so it needs pinging on.
	 */
	timeout?: number;
}

/** A full snapshot as the client rebuilt it. */
export interface IgeNetSnapshot {
	tick: number;
	/** The last of this machine's input frames the authority had applied. */
	ack: number;
	entities: IgeNetEntities;
}

/**
 * A machine in a real-time game run by an IgeNetSyncHost. It joins with
 * its local players (one to four, say, for split screen), sends their
 * inputs once per tick, and rebuilds the world from the authority's
 * snapshots. Two views of the world are offered:
 *
 * - interpolated(): every entity a little in the past (interpolationDelay),
 *   blended between snapshots, for drawing other players, enemies and props;
 * - predict(): one of this machine's own players, from the newest snapshot
 *   with the inputs the authority hasn't applied yet replayed on top (using
 *   the game's own movement code), so the player responds at once.
 *
 * Events: "welcome", "snapshot" (IgeNetSnapshot), "event" (data, tick),
 * "error" (message), "disconnected".
 * @example #Join with two local players and draw the world
 *     const client = new IgeNetSyncClient(connection, { blend: { facing: "angle" } });
 *     const welcome = await client.join([{ name: "Ann" }, { name: "Bob" }]);
 *     // every tick:
 *     client.sendInput([padInput(0), padInput(1)]);
 *     // every frame:
 *     const world = client.interpolated();
 *     const me = client.predict(welcome.players[0], 0, (state, input, dt) => move(state, input, dt));
 */
export class IgeNetSyncClient<Input = unknown> extends IgeEventingClass {
	classId = "IgeNetSyncClient";
	machine?: string;
	/** The ids of this machine's players, in slot order (after join()). */
	players: string[] = [];
	tickRate: number = 30;
	/** Round-trip time to the authority in ms. */
	rtt: number = 0;
	info: unknown;
	_connection: IgeNetConnection;
	/** When the authority was last heard from (ms, this machine's clock). */
	_lastHeard = 0;
	_options: IgeNetSyncClientOptions;
	_now: () => number;
	_seq: number = 0;
	/** Input frames not yet applied by the authority. */
	_pending: IgeNetInputFrame<Input>[] = [];
	/** Full snapshots by tick, with the local time each arrived. */
	_snapshots: { snapshot: IgeNetSnapshot; at: number }[] = [];
	/** Smoothed local time minus authority time (ms). */
	_offset?: number;
	_ref: number = 0;
	_joining?: { ref: number; resolve: (w: IgeNetWelcome) => void; reject: (e: Error) => void };
	_pingTimer?: ReturnType<typeof setInterval>;

	constructor (connection: IgeNetConnection, options: IgeNetSyncClientOptions = {}) {
		super();
		this._connection = connection;
		this._options = options;
		this._now = options.now ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
		connection.onMessage((data) => this._onMessage(data as IgeNetServerMessage));
		connection.onClose(() => {
			this._stopPing();
			this._joining?.reject(new Error("Disconnected"));
			this._joining = undefined;
			this.emit("disconnected");
		});
	}

	/** Join the game with this machine's local players (game-defined descriptions). */
	join (players: unknown[]): Promise<IgeNetWelcome> {
		const ref = ++this._ref;
		return new Promise((resolve, reject) => {
			this._joining = { ref, resolve, reject };
			this._send({ t: "join", ref, players });
		});
	}

	/** Leave the game. */
	leave (): void {
		this._send({ t: "leave" });
		this._stopPing();
	}

	/**
	 * Send this tick's inputs for the machine's players (in slot order).
	 * Call once per tick (tickRate times a second). Returns the frame's
	 * sequence number.
	 */
	sendInput (inputs: Input[]): number {
		const frame: IgeNetInputFrame<Input> = { seq: ++this._seq, inputs };
		this._pending.push(frame);
		// Keep the backlog bounded if the authority stops acknowledging
		if (this._pending.length > 256) this._pending.shift();
		const redundancy = Math.max(1, this._options.inputRedundancy ?? 3);
		const frames = this._pending.slice(-redundancy);
		this._send({ t: "input", frames, snap: this.latest()?.tick ?? 0 }, false);
		return frame.seq;
	}

	/** Input frames the authority hasn't applied yet, oldest first. */
	pendingInputs (): IgeNetInputFrame<Input>[] {
		return this._pending;
	}

	/** The newest full snapshot. */
	latest (): IgeNetSnapshot | undefined {
		return this._snapshots[this._snapshots.length - 1]?.snapshot;
	}

	/** The authority's current tick as this machine estimates it (fractional). */
	serverTick (): number {
		if (this._offset === undefined) return this.latest()?.tick ?? 0;
		return ((this._now() - this._offset) * this.tickRate) / 1000;
	}

	/**
	 * Every entity as it was interpolationDelay ms ago, blended between the
	 * two snapshots either side of that time (or the newest, if time has
	 * run past it). Use it for everything except this machine's own players.
	 */
	interpolated (): IgeNetEntities {
		const snaps = this._snapshots;
		if (!snaps.length) return {};
		const delayTicks = ((this._options.interpolationDelay ?? 100) * this.tickRate) / 1000;
		const renderTick = this.serverTick() - delayTicks;
		let older = snaps[0].snapshot, newer = snaps[0].snapshot;
		for (let i = snaps.length - 1; i >= 0; i--) {
			if (snaps[i].snapshot.tick <= renderTick) {
				older = snaps[i].snapshot;
				newer = snaps[Math.min(i + 1, snaps.length - 1)].snapshot;
				break;
			}
		}
		if (renderTick < older.tick || newer === older) return older.entities;
		const f = Math.min(1, (renderTick - older.tick) / (newer.tick - older.tick));
		const out: IgeNetEntities = {};
		for (const id in newer.entities) {
			const a = older.entities[id], b = newer.entities[id];
			out[id] = a ? blendEntity(a, b, f, this._options.blend) : b;
		}
		return out;
	}

	/**
	 * One of this machine's players, predicted: its state in the newest
	 * snapshot with every input the authority hasn't applied yet replayed
	 * through `apply` (the game's own movement rules), so it moves the
	 * moment the stick does. `slot` is the player's local slot.
	 */
	predict<State extends IgeNetEntityState> (
		id: string,
		slot: number,
		apply: (state: State, input: Input, dt: number) => State
	): State | undefined {
		const latest = this.latest();
		const base = latest?.entities[id] as State | undefined;
		if (!base) return;
		const dt = 1 / this.tickRate;
		let state = { ...base };
		for (const frame of this._pending) {
			const input = frame.inputs[slot];
			if (input !== undefined) state = apply(state, input, dt);
		}
		return state;
	}

	destroy (): this {
		this._stopPing();
		this._connection.close();
		return this;
	}

	_send (message: IgeNetClientMessage, reliable: boolean = true): void {
		this._connection.send(message, reliable);
	}

	_startPing (): void {
		const interval = this._options.pingInterval ?? 1000;
		if (interval <= 0 || this._pingTimer) return;
		const ping = () => {
			const timeout = this._options.timeout ?? 10000;
			if (timeout > 0 && this._now() - this._lastHeard > timeout) {
				this._connection.close();
				return;
			}
			this._send({ t: "ping", time: this._now() }, false);
		};
		ping();
		this._pingTimer = setInterval(ping, interval);
	}

	_stopPing (): void {
		if (this._pingTimer) clearInterval(this._pingTimer);
		this._pingTimer = undefined;
	}

	/** Track local time minus authority time, from a tick known to be current when the message left. */
	_syncClock (tick: number, oneWay: number): void {
		const sample = this._now() - oneWay - (tick * 1000) / this.tickRate;
		// The smallest delay seen is the truest; drift slowly towards later samples
		this._offset = this._offset === undefined ? sample : Math.min(sample, this._offset + (sample - this._offset) * 0.05);
	}

	_onMessage (message: IgeNetServerMessage): void {
		if (!message || typeof message !== "object") return;
		this._lastHeard = this._now();
		switch (message.t) {
			case "welcome": {
				this.machine = message.machine;
				this.players = message.players;
				this.tickRate = message.tickRate;
				this.info = message.info;
				this._syncClock(message.tick, 0);
				this._startPing();
				const joining = this._joining;
				this._joining = undefined;
				joining?.resolve(message);
				this.emit("welcome", message);
				break;
			}
			case "error": {
				if (this._joining && message.ref === this._joining.ref) {
					this._joining.reject(new Error(message.error));
					this._joining = undefined;
				} else {
					this.emit("error", message.error);
				}
				break;
			}
			case "pong":
				this.rtt = Math.max(0, this._now() - message.time);
				this._syncClock(message.tick, this.rtt / 2);
				break;
			case "event":
				this.emit("event", message.data, message.tick);
				break;
			case "snap": {
				const latest = this.latest();
				if (latest && message.tick <= latest.tick) return; // stale or repeated
				let entities: IgeNetEntities;
				if (message.base) {
					const base = this._snapshots.find((s) => s.snapshot.tick === message.base)?.snapshot;
					if (!base) return; // we no longer have its base: the next full snapshot will do
					entities = {};
					for (const id in base.entities) entities[id] = { ...base.entities[id] };
					for (const id of message.del) delete entities[id];
					for (const id in message.set) entities[id] = { ...entities[id], ...message.set[id] };
				} else {
					entities = message.set;
				}
				const snapshot: IgeNetSnapshot = { tick: message.tick, ack: message.ack, entities };
				this._snapshots.push({ snapshot, at: this._now() });
				const history = this._options.history ?? 32;
				if (this._snapshots.length > history) this._snapshots.splice(0, this._snapshots.length - history);
				// Applied inputs need no replaying
				while (this._pending.length && this._pending[0].seq <= message.ack) this._pending.shift();
				this._syncClock(message.tick, this.rtt / 2);
				this.emit("snapshot", snapshot);
				break;
			}
		}
	}
}

/** Blend two states of an entity: numbers and numeric arrays linearly (or as angles), anything else steps. */
function blendEntity (a: IgeNetEntityState, b: IgeNetEntityState, f: number, rules?: Record<string, IgeNetFieldBlend>): IgeNetEntityState {
	const out: IgeNetEntityState = {};
	for (const key in b) {
		const rule = rules?.[key] ?? "linear";
		const va = a[key], vb = b[key];
		if (rule === "none") out[key] = f < 1 ? va ?? vb : vb;
		else if (typeof va === "number" && typeof vb === "number") out[key] = rule === "angle" ? lerpAngle(va, vb, f) : va + (vb - va) * f;
		else if (Array.isArray(va) && Array.isArray(vb) && va.length === vb.length && va.every((v) => typeof v === "number")) {
			out[key] = vb.map((v, i) => (rule === "angle" ? lerpAngle(va[i] as number, v as number, f) : (va[i] as number) + ((v as number) - (va[i] as number)) * f));
		} else out[key] = f < 1 && va !== undefined ? va : vb;
	}
	return out;
}

function lerpAngle (a: number, b: number, f: number): number {
	let d = (b - a) % (Math.PI * 2);
	if (d > Math.PI) d -= Math.PI * 2;
	if (d < -Math.PI) d += Math.PI * 2;
	return a + d * f;
}
