import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";
import type {
	IgeNetClientMessage,
	IgeNetEntities,
	IgeNetEntityState,
	IgeNetInputFrame,
	IgeNetServerMessage
} from "@/engine/network/sync/igeNetSyncProtocol";

/** A machine connected to the authority, with its local players. */
export interface IgeNetMachine {
	id: string;
	/** The ids the game gave this machine's players, in slot order. */
	players: string[];
	/** Round-trip time in ms, from the machine's pings. */
	rtt: number;
	/** Anything the game wants to keep per machine. */
	data: Record<string, unknown>;
}

export interface IgeNetSyncHostOptions<Input> {
	/** Simulation steps per second (default 30). */
	tickRate?: number;
	/** Snapshots per second to each machine (default 20, at most the tick rate). */
	snapshotRate?: number;
	/**
	 * A machine wants to join with these players (game-defined descriptions:
	 * names, looks...). Return the id the game gives each one, in the same
	 * order (they become the ids in snapshots and step inputs), or an error
	 * message to turn the machine away. A machine arriving from another zone
	 * (IgeNetSyncClient.transfer) brings a ticket instead of descriptions:
	 * `ticket` is what `acceptTicket` made of it (who they are, where they
	 * arrive).
	 *
	 * It may return a Promise (loading the players from a store): the machine
	 * is welcomed once it resolves, and nothing it sends counts until then.
	 * A machine that disconnects meanwhile is seen out through `leave` once
	 * it does resolve. If it throws (or rejects) the machine is told it
	 * couldn't join, and the error is emitted as "joinFailed" (return a
	 * string to give the player a reason).
	 */
	join: (machine: IgeNetMachine, players: unknown[], ticket?: unknown) => string[] | string | Promise<string[] | string>;
	/**
	 * Checks a ticket a machine joins with (a zone server: IgeZoneHost's
	 * acceptTicket): whatever it carries, or a string to turn the machine
	 * away (or a Promise of either). Without it, joins with a ticket are
	 * refused.
	 */
	acceptTicket?: (token: string, machine: IgeNetMachine) => unknown;
	/** A machine left or disconnected: remove its players. */
	leave?: (machine: IgeNetMachine) => void;
	/**
	 * Advance the game by one fixed step. `inputs` holds each player's input
	 * for this step: their next unused input, or their last one while none
	 * has arrived (a held stick stays held).
	 */
	step: (dt: number, tick: number, inputs: Map<string, Input>) => void;
	/**
	 * The world as one machine should see it: entities by id, each a flat
	 * object of plain values. Leave out what's far from its players
	 * (interest management) to save bandwidth.
	 */
	snapshot: (machine: IgeNetMachine) => IgeNetEntities;
	/** Game-defined information sent to each machine as it joins (the seed, the level...). */
	info?: (machine: IgeNetMachine) => unknown;
	/** Input frames a player may have queued before older ones are dropped (default 8), to stay responsive. */
	maxQueuedInputs?: number;
}

interface MachineState<Input> {
	machine: IgeNetMachine;
	connection: IgeNetConnection;
	/** Unapplied input frames, oldest first. */
	queue: IgeNetInputFrame<Input>[];
	/** The last frame received (de-duplicating the repeats). */
	received: number;
	/** The last frame applied. */
	applied: number;
	/** The inputs in use (held until the next frame). */
	current: Input[];
	/** Snapshots sent, by tick, kept until acknowledged or old. */
	sent: Map<number, IgeNetEntities>;
	/** The newest snapshot the machine has acknowledged. */
	acked: number;
}

let nextMachine = 1;

/** How a join reaches back to its connection: whether it's gone, and its state once it's in. */
interface JoinLink<Input> {
	closed: () => boolean;
	joined: (state: MachineState<Input>) => void;
}

function isThenable (value: unknown): value is PromiseLike<unknown> {
	return !!value && (typeof value === "object" || typeof value === "function") && typeof (value as { then?: unknown }).then === "function";
}

/** `next(value)`, straight away for a plain value, or once a Promise resolves (keeping sync hooks sync). */
function after<T, R> (value: T | PromiseLike<T>, next: (value: T) => R | PromiseLike<R>): R | PromiseLike<R> {
	return isThenable(value) ? (value as PromiseLike<T>).then(next) : next(value as T);
}

/**
 * The authority of a real-time game: machines connect (each with one or
 * more local players), their players' inputs are queued and applied one per
 * fixed step, the game's step() runs, and each machine gets snapshots of
 * the world as deltas against the last snapshot it acknowledged, plus
 * reliable events. Runs anywhere: in a browser (the page hosting a game,
 * or offline play over igeNetLoopback()) or in Node (a dedicated server).
 *
 * Drive it with update(ms) from a frame loop, or start() for its own timer.
 * Events: "join" (machine), "leave" (machine), "joinFailed" (error: the
 * game's join or acceptTicket threw).
 * @example #A host with one moving dot per player
 *     const host = new IgeNetSyncHost(listener, {
 *         join: (machine, players) => players.map((p, i) => { const id = `${machine.id}.${i}`; dots[id] = { x: 0 }; return id; }),
 *         leave: (machine) => machine.players.forEach((id) => delete dots[id]),
 *         step: (dt, tick, inputs) => inputs.forEach((input, id) => { dots[id].x += input.dx * dt; }),
 *         snapshot: () => dots
 *     });
 *     host.start();
 */
export class IgeNetSyncHost<Input = unknown> extends IgeEventingClass {
	classId = "IgeNetSyncHost";
	tick: number = 0;
	readonly tickRate: number;
	readonly snapshotRate: number;
	_options: IgeNetSyncHostOptions<Input>;
	_machines: Map<string, MachineState<Input>> = new Map();
	_accumulator: number = 0;
	_snapshotAccumulator: number = 0;
	_timer?: ReturnType<typeof setInterval>;
	_lastTime: number = 0;
	_listener: IgeNetListener | null;

	constructor (listener: IgeNetListener | null, options: IgeNetSyncHostOptions<Input>) {
		super();
		this._options = options;
		this.tickRate = options.tickRate ?? 30;
		this.snapshotRate = Math.min(this.tickRate, options.snapshotRate ?? 20);
		this._listener = listener;
		listener?.onConnection((connection) => this.connect(connection));
	}

	/** The machines in the game. */
	machines (): IgeNetMachine[] {
		return [...this._machines.values()].map((m) => m.machine);
	}

	/** Take a connection from a transport not passed to the constructor. */
	connect (connection: IgeNetConnection): void {
		let state: MachineState<Input> | undefined;
		let joining = false;
		let closed = false;
		const link: JoinLink<Input> = { closed: () => closed, joined: (joined) => { state = joined; } };
		connection.onMessage((data) => {
			const message = data as IgeNetClientMessage;
			if (!message || typeof message !== "object") return;
			if (message.t === "join") {
				if (state || joining) return;
				joining = true;
				const failed = (error: unknown) => {
					// The game's hook threw: the machine hears only that it couldn't join
					this._send(connection, { t: "error", error: "Couldn't join.", ref: message.ref });
					this.emit("joinFailed", error);
				};
				let pending: void | PromiseLike<void> = undefined;
				try {
					pending = this._join(connection, message, link);
				} catch (error) {
					failed(error);
				}
				if (!isThenable(pending)) {
					joining = false;
					return;
				}
				pending.then(undefined, failed).then(() => {
					joining = false;
				});
				return;
			}
			if (!state) return;
			switch (message.t) {
				case "input": {
					for (const frame of message.frames || []) {
						if (frame.seq <= state.received) continue;
						state.queue.push(frame as IgeNetInputFrame<Input>);
						state.received = frame.seq;
					}
					const max = this._options.maxQueuedInputs ?? 8;
					if (state.queue.length > max) state.queue.splice(0, state.queue.length - max);
					if (message.snap > state.acked) {
						state.acked = message.snap;
						for (const tick of state.sent.keys()) if (tick < state.acked) state.sent.delete(tick);
					}
					break;
				}
				case "ping":
					this._send(connection, { t: "pong", time: message.time, tick: this.tick }, false);
					break;
				case "leave":
					connection.close();
					break;
			}
		});
		connection.onClose(() => {
			closed = true;
			if (!state) return;
			// Unless disconnect() has already seen it out
			if (this._machines.get(state.machine.id) === state) this._drop(state);
			state = undefined;
		});
	}

	/**
	 * Disconnects one machine: its players leave at once (the leave hook
	 * runs before this returns), then its connection closes. A player
	 * reconnecting on a fresh connection while the old one lingers (a
	 * dropped network nobody's noticed yet) replaces it this way: call it
	 * from join for the machine that still has them.
	 */
	disconnect (machine: IgeNetMachine | string): void {
		const state = this._machines.get(typeof machine === "string" ? machine : machine.id);
		if (!state) return;
		this._drop(state);
		state.connection.close();
	}

	_drop (state: MachineState<Input>): void {
		this._machines.delete(state.machine.id);
		this._options.leave?.(state.machine);
		this.emit("leave", state.machine);
	}

	/**
	 * A machine joining (with player descriptions, or a ticket). Synchronous
	 * when the game's hooks are; a Promise when either returns one.
	 */
	_join (connection: IgeNetConnection, message: Extract<IgeNetClientMessage, { t: "join" }>, link: JoinLink<Input>): void | PromiseLike<void> {
		const machine: IgeNetMachine = { id: `m${nextMachine++}`, players: [], rtt: 0, data: {} };
		const refuse = (error: string): void => {
			this._send(connection, { t: "error", error, ref: message.ref });
		};
		const players = Array.isArray(message.players) ? message.players : [];
		const join = (ticket?: unknown) => after(this._options.join(machine, players, ticket), (result) => {
			if (typeof result === "string") return refuse(result);
			machine.players = result;
			this._welcome(connection, machine, message.ref, link);
		});
		if (typeof message.ticket !== "string") return join();
		// Arriving from another zone (or reconnecting): the ticket says who
		const accepted = this._options.acceptTicket ? this._options.acceptTicket(message.ticket, machine) : "Tickets aren't taken here.";
		return after(accepted, (ticket) => {
			if (typeof ticket === "string" || ticket === undefined) return refuse(typeof ticket === "string" ? ticket : "That ticket won't do.");
			machine.data.ticket = ticket;
			return join(ticket);
		});
	}

	/** The game has let a machine in: welcome it (unless it went while the game was deciding). */
	_welcome (connection: IgeNetConnection, machine: IgeNetMachine, ref: number, link: JoinLink<Input>): void {
		if (link.closed()) {
			// It left before its join finished: the game sees it out
			this._options.leave?.(machine);
			return;
		}
		const state: MachineState<Input> = {
			machine, connection, queue: [], received: 0, applied: 0, current: [], sent: new Map(), acked: 0
		};
		this._machines.set(machine.id, state);
		link.joined(state);
		this._send(connection, {
			t: "welcome", ref, machine: machine.id, players: machine.players,
			tick: this.tick, tickRate: this.tickRate, info: this._options.info?.(machine)
		});
		this.emit("join", machine);
	}

	/** Send a reliable event to every machine, or to one. */
	event (data: unknown, machine?: IgeNetMachine | string): void {
		const id = typeof machine === "string" ? machine : machine?.id;
		for (const state of this._machines.values()) {
			if (!id || state.machine.id === id) this._send(state.connection, { t: "event", tick: this.tick, data });
		}
	}

	/** Advance by real time: runs whole fixed steps and sends snapshots when due. */
	update (ms: number): void {
		const stepMs = 1000 / this.tickRate;
		this._accumulator += Math.min(ms, 250); // after a stall, don't try to catch up a long way
		while (this._accumulator >= stepMs) {
			this._accumulator -= stepMs;
			this._step(stepMs / 1000);
		}
	}

	/** Run on a timer (dedicated servers); update() is called for you. */
	start (): void {
		if (this._timer) return;
		this._lastTime = Date.now();
		this._timer = setInterval(() => {
			const now = Date.now();
			this.update(now - this._lastTime);
			this._lastTime = now;
		}, Math.max(1, Math.floor(1000 / this.tickRate / 2)));
	}

	stop (): void {
		if (this._timer) clearInterval(this._timer);
		this._timer = undefined;
	}

	/** Stop and disconnect every machine. */
	destroy (): this {
		this.stop();
		for (const state of [...this._machines.values()]) state.connection.close();
		this._listener?.close();
		return this;
	}

	_step (dt: number): void {
		this.tick++;
		const inputs = new Map<string, Input>();
		for (const state of this._machines.values()) {
			const frame = state.queue.shift();
			if (frame) {
				state.current = frame.inputs;
				state.applied = frame.seq;
			}
			state.machine.players.forEach((id, slot) => {
				const input = state.current[slot];
				if (input !== undefined) inputs.set(id, input);
			});
		}
		this._options.step(dt, this.tick, inputs);

		this._snapshotAccumulator += this.snapshotRate / this.tickRate;
		if (this._snapshotAccumulator >= 1) {
			this._snapshotAccumulator -= 1;
			for (const state of this._machines.values()) this._sendSnapshot(state);
		}
	}

	_sendSnapshot (state: MachineState<Input>): void {
		const entities = this._options.snapshot(state.machine);
		const base = state.sent.get(state.acked);
		const set: IgeNetEntities = {};
		const del: string[] = [];
		if (base) {
			for (const id in entities) {
				const changed = diffEntity(base[id], entities[id]);
				if (changed) set[id] = changed;
			}
			for (const id in base) if (!(id in entities)) del.push(id);
		} else {
			Object.assign(set, entities);
		}
		// Keep a copy to diff against (the game may reuse its objects)
		state.sent.set(this.tick, cloneEntities(entities));
		// Snapshots the machine never acknowledges (lost) don't pile up
		if (state.sent.size > this.snapshotRate * 2) {
			const oldest = state.sent.keys().next().value!;
			if (oldest !== state.acked) state.sent.delete(oldest);
		}
		this._send(state.connection, { t: "snap", tick: this.tick, base: base ? state.acked : 0, ack: state.applied, set, del }, false);
	}

	_send (connection: IgeNetConnection, message: IgeNetServerMessage, reliable: boolean = true): void {
		connection.send(message, reliable);
	}
}

/** The fields of `next` that differ from `prev` (all of them for a new entity), or undefined if none. */
function diffEntity (prev: IgeNetEntityState | undefined, next: IgeNetEntityState): IgeNetEntityState | undefined {
	if (!prev) return next;
	let changed: IgeNetEntityState | undefined;
	for (const key in next) {
		if (!sameValue(prev[key], next[key])) (changed ??= {})[key] = next[key];
	}
	return changed;
}

function sameValue (a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
	return JSON.stringify(a) === JSON.stringify(b);
}

function cloneEntities (entities: IgeNetEntities): IgeNetEntities {
	const out: IgeNetEntities = {};
	for (const id in entities) {
		const entity = entities[id];
		const copy: IgeNetEntityState = {};
		for (const key in entity) {
			const value = entity[key];
			copy[key] = typeof value === "object" && value !== null ? JSON.parse(JSON.stringify(value)) : value;
		}
		out[id] = copy;
	}
	return out;
}
