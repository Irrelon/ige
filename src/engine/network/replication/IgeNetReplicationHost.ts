import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeNetBitReader } from "@/engine/network/replication/IgeNetBits";
import { IgeNetSchema, IgeNetSchemaSet, igeNetSchemaHash, type IgeNetFieldDef, type IgeNetKindOptions } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetReplicator, type IgeNetReplicatorOptions, type IgeNetViewer } from "@/engine/network/replication/IgeNetReplicator";
import { IGE_NET_PACKET_INPUT, igeNetPacketType, igeNetReadInputPacket } from "@/engine/network/replication/igeNetReplicationProtocol";
import type { IgeNetMachine } from "@/engine/network/sync/IgeNetSyncHost";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";
import type { IgeNetClientMessage } from "@/engine/network/sync/igeNetSyncProtocol";

/** A machine connected to a replication host: the sync layer's machine, and what it sees. */
export interface IgeNetReplicationMachine extends IgeNetMachine {
	/** Subscribe it to scopes, reveal objects to it, make objects private to it. */
	viewer: IgeNetViewer;
}

export interface IgeNetReplicationHostOptions<Input> {
	/** The kinds of object the game replicates: a set, or definitions to make one from. The clients need the same. */
	schemas: IgeNetSchemaSet | Record<string, Record<string, IgeNetFieldDef>>;
	/** Kind options (relevance, position, blip, priorities, rates), by kind, when `schemas` is plain definitions. The clients need the same. */
	kinds?: Record<string, IgeNetKindOptions>;
	/**
	 * Relevance and budget settings, passed to the replicator (see IgeNetReplicatorOptions):
	 * `bandwidth` per machine in bytes/s (default 32768 when any kind declares relevance, else no limit),
	 * `maxPacketBytes`, `nearRadius`, `blipRate`, `cellSize`, `hysteresis`, `carry`, `resendAfter`, `weights`.
	 * Per machine: `machine.viewer.bandwidth`, `.nearRadius`, `.maxPacketBytes`, `addInterest()`, `focus()`.
	 */
	relevance?: Omit<IgeNetReplicatorOptions, "now" | "sendRate">;
	/** What one player's input is (fields as in a schema). The clients need the same. Default: none. */
	inputSchema?: IgeNetSchema | Record<string, IgeNetFieldDef>;
	/** Simulation steps per second (default 30). */
	tickRate?: number;
	/** Packets per second to each machine (default 20, at most the tick rate). */
	sendRate?: number;
	/**
	 * The transport loses and reorders packets (a datagram channel): changes are then sent again,
	 * against the last packet the machine acknowledged, until it acknowledges them. Default false
	 * (WebSocket: a send counts as delivered). Acknowledgements ride on the machine's input
	 * packets, so it must send inputs every tick.
	 */
	lossy?: boolean;
	/**
	 * A machine wants to join with these players (game-defined descriptions). Return the id the
	 * game gives each one, in order (they key the step's inputs), or an error message to turn it
	 * away; a Promise of either works. Subscribe `machine.viewer` to its scopes here (or later) and
	 * create its private objects. As in IgeNetSyncHost, a machine arriving with a zone ticket has
	 * had it checked by `acceptTicket`, and `ticket` is what that made of it.
	 */
	join: (machine: IgeNetReplicationMachine, players: unknown[], ticket?: unknown) => string[] | string | Promise<string[] | string>;
	/** Checks a ticket a machine joins with (see IgeZoneHost.acceptTicket): what it carries, or a string to refuse. Without it, tickets are refused. */
	acceptTicket?: (token: string, machine: IgeNetReplicationMachine) => unknown;
	/** A machine left or disconnected: remove its players and objects. */
	leave?: (machine: IgeNetReplicationMachine) => void;
	/**
	 * Advance the game by one fixed step: write the world's changes to `host.replicator`'s objects.
	 * `inputs` holds each player's next unused input, or their last one while none has arrived.
	 */
	step: (dt: number, tick: number, inputs: Map<string, Input>) => void;
	/** Game-defined information sent to each machine as it joins. */
	info?: (machine: IgeNetReplicationMachine) => unknown;
	/** Input frames a player may have queued before older ones are dropped (default 8). */
	maxQueuedInputs?: number;
	/** Clock for timing (ms), for tests. */
	now?: () => number;
	/** A replicator the game keeps its objects in already (made before the host, so the world can be built without one). Default: a new one. */
	replicator?: IgeNetReplicator;
}

interface MachineState<Input> {
	machine: IgeNetReplicationMachine;
	connection: IgeNetConnection;
	queue: { seq: number; inputs: Input[] }[];
	received: number;
	applied: number;
	current: Input[];
}

let nextMachine = 1;

interface JoinLink<Input> {
	closed: () => boolean;
	joined: (state: MachineState<Input>) => void;
}

function isThenable (value: unknown): value is PromiseLike<unknown> {
	return !!value && (typeof value === "object" || typeof value === "function") && typeof (value as { then?: unknown }).then === "function";
}

function after<T, R> (value: T | PromiseLike<T>, next: (value: T) => R | PromiseLike<R>): R | PromiseLike<R> {
	return isThenable(value) ? (value as PromiseLike<T>).then(next) : next(value as T);
}

/**
 * The authority of a real-time game on the replication layer. Like IgeNetSyncHost it runs a fixed
 * tick loop, queues each player's inputs (one applied per step, the last held), and welcomes
 * machines (with zone tickets as well as player descriptions). Unlike it, the game doesn't hand
 * over a snapshot per machine: it keeps replicated objects on `host.replicator`, writes them as the
 * world changes, and puts each machine's viewer in the scopes it should see.
 *
 * Drive it with update(ms) from a frame loop, or start() for its own timer.
 * Events: "join" (machine), "leave" (machine), "joinFailed" (error).
 * @example #A server with ships in star systems
 *     const host = new IgeNetReplicationHost(listener, {
 *         schemas: { ship: { x: { type: "number", precision: 0.1 }, heading: { type: "angle" } } },
 *         inputSchema: { thrust: { type: "number", precision: 0.01, min: -1, max: 1 } },
 *         join: (machine, players) => {
 *             machine.viewer.subscribe("sol");
 *             return players.map((p, i) => {
 *                 const id = `${machine.id}.${i}`;
 *                 host.replicator.create("ship", id, {}, { scope: "sol" });
 *                 return id;
 *             });
 *         },
 *         step: (dt, tick, inputs) => inputs.forEach((input, id) => host.replicator.get(id)!.write({ x: 1 })),
 *     });
 *     host.start();
 */
export class IgeNetReplicationHost<Input = Record<string, unknown>> extends IgeEventingClass {
	classId = "IgeNetReplicationHost";
	tick: number = 0;
	readonly tickRate: number;
	readonly sendRate: number;
	readonly schemas: IgeNetSchemaSet;
	readonly inputSchema: IgeNetSchema;
	readonly replicator: IgeNetReplicator;
	_options: IgeNetReplicationHostOptions<Input>;
	_machines: Map<string, MachineState<Input>> = new Map();
	_accumulator = 0;
	_sendAccumulator = 0;
	_timer?: ReturnType<typeof setInterval>;
	_lastTime = 0;
	_listener: IgeNetListener | null;

	constructor (listener: IgeNetListener | null, options: IgeNetReplicationHostOptions<Input>) {
		super();
		this._options = options;
		this.tickRate = options.tickRate ?? 30;
		this.sendRate = Math.min(this.tickRate, options.sendRate ?? 20);
		this.schemas = options.replicator?.schemas ?? (options.schemas instanceof IgeNetSchemaSet ? options.schemas : new IgeNetSchemaSet(options.schemas, options.kinds));
		this.inputSchema = options.inputSchema instanceof IgeNetSchema ? options.inputSchema : new IgeNetSchema("input", options.inputSchema ?? {});
		this.replicator = options.replicator ?? new IgeNetReplicator(this.schemas, { ...options.relevance, now: options.now, sendRate: this.sendRate });
		if (options.replicator) {
			// A replicator made before the host runs at the host's send rate
			this.replicator.sendRate = this.sendRate;
			const r = options.relevance;
			if (r?.bandwidth !== undefined) this.replicator.bandwidth = r.bandwidth > 0 ? r.bandwidth : Infinity;
			if (r?.maxPacketBytes !== undefined) this.replicator.maxPacketBytes = r.maxPacketBytes;
			if (r?.nearRadius !== undefined) this.replicator.nearRadius = r.nearRadius;
			if (r?.blipRate !== undefined) this.replicator.blipRate = r.blipRate;
		}
		this._listener = listener;
		listener?.onConnection((connection) => this.connect(connection));
	}

	machines (): IgeNetReplicationMachine[] {
		return [...this._machines.values()].map((m) => m.machine);
	}

	/** Take a connection from a transport not passed to the constructor. */
	connect (connection: IgeNetConnection): void {
		let state: MachineState<Input> | undefined;
		let joining = false;
		let closed = false;
		const link: JoinLink<Input> = { closed: () => closed, joined: (joined) => { state = joined; } };
		connection.onMessage((data) => {
			if (data instanceof Uint8Array) {
				if (state) this._onInput(state, data);
				return;
			}
			const message = data as IgeNetClientMessage;
			if (!message || typeof message !== "object") return;
			if (message.t === "join") {
				if (state || joining) return;
				joining = true;
				const failed = (error: unknown) => {
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
			if (message.t === "ping") this._send(connection, { t: "pong", time: message.time, tick: this.tick });
			else if (message.t === "leave") connection.close();
		});
		connection.onClose(() => {
			closed = true;
			if (!state) return;
			if (this._machines.get(state.machine.id) === state) this._drop(state);
			state = undefined;
		});
	}

	/** Disconnects one machine at once (see IgeNetSyncHost.disconnect). */
	disconnect (machine: IgeNetReplicationMachine | string): void {
		const state = this._machines.get(typeof machine === "string" ? machine : machine.id);
		if (!state) return;
		this._drop(state);
		state.connection.close();
	}

	_drop (state: MachineState<Input>): void {
		this._machines.delete(state.machine.id);
		this._options.leave?.(state.machine);
		state.machine.viewer.close();
		this.emit("leave", state.machine);
	}

	/** Reads a binary input packet: acknowledgements for the viewer, frames for the queue. */
	_onInput (state: MachineState<Input>, bytes: Uint8Array): void {
		if (igeNetPacketType(bytes) !== IGE_NET_PACKET_INPUT) return;
		let packet;
		try {
			packet = igeNetReadInputPacket(new IgeNetBitReader(bytes), this.inputSchema, state.machine.players.length);
		} catch {
			return; // malformed: ignore it
		}
		state.machine.viewer.ack(packet.ackSeq, packet.ackBits);
		for (const frame of packet.frames) {
			if (frame.seq <= state.received) continue;
			state.queue.push(frame as { seq: number; inputs: Input[] });
			state.received = frame.seq;
		}
		const max = this._options.maxQueuedInputs ?? 8;
		if (state.queue.length > max) state.queue.splice(0, state.queue.length - max);
	}

	_join (connection: IgeNetConnection, message: Extract<IgeNetClientMessage, { t: "join" }>, link: JoinLink<Input>): void | PromiseLike<void> {
		const viewer = this.replicator.addViewer((bytes) => connection.send(bytes, !this._options.lossy), { lossy: this._options.lossy });
		viewer.enabled = false;
		const machine: IgeNetReplicationMachine = { id: `m${nextMachine++}`, players: [], rtt: 0, data: {}, viewer };
		const refuse = (error: string): void => {
			viewer.close();
			this._send(connection, { t: "error", error, ref: message.ref });
		};
		const players = Array.isArray(message.players) ? message.players : [];
		const join = (ticket?: unknown) => after(this._options.join(machine, players, ticket), (result) => {
			if (typeof result === "string") return refuse(result);
			machine.players = result;
			this._welcome(connection, machine, message.ref, link);
		});
		if (typeof message.ticket !== "string") return join();
		const accepted = this._options.acceptTicket ? this._options.acceptTicket(message.ticket, machine) : "Tickets aren't taken here.";
		return after(accepted, (ticket) => {
			if (typeof ticket === "string" || ticket === undefined) return refuse(typeof ticket === "string" ? ticket : "That ticket won't do.");
			machine.data.ticket = ticket;
			return join(ticket);
		});
	}

	_welcome (connection: IgeNetConnection, machine: IgeNetReplicationMachine, ref: number, link: JoinLink<Input>): void {
		if (link.closed()) {
			this._options.leave?.(machine);
			machine.viewer.close();
			return;
		}
		const state: MachineState<Input> = { machine, connection, queue: [], received: 0, applied: 0, current: [] };
		this._machines.set(machine.id, state);
		link.joined(state);
		this._send(connection, {
			t: "welcome", ref, machine: machine.id, players: machine.players,
			tick: this.tick, tickRate: this.tickRate, sendRate: this.sendRate, schema: igeNetSchemaHash(this.schemas, this.inputSchema),
			info: this._options.info?.(machine)
		});
		machine.viewer.enabled = true;
		this.emit("join", machine);
	}

	/** Send a reliable event to every machine, or to one. */
	event (data: unknown, machine?: IgeNetReplicationMachine | string): void {
		const id = typeof machine === "string" ? machine : machine?.id;
		for (const state of this._machines.values()) {
			if (!id || state.machine.id === id) this._send(state.connection, { t: "event", tick: this.tick, data });
		}
	}

	/** Advance by real time: runs whole fixed steps, sending packets when due. */
	update (ms: number): void {
		const stepMs = 1000 / this.tickRate;
		this._accumulator += Math.min(ms, 250);
		while (this._accumulator >= stepMs) {
			this._accumulator -= stepMs;
			this._step(stepMs / 1000);
		}
	}

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

	destroy (): this {
		this.stop();
		for (const state of [...this._machines.values()]) state.connection.close();
		this._listener?.close();
		return this;
	}

	_step (dt: number): void {
		this.tick++;
		this.replicator.tick = this.tick;
		const inputs = new Map<string, Input>();
		for (const state of this._machines.values()) {
			const frame = state.queue.shift();
			if (frame) {
				state.current = frame.inputs;
				state.applied = frame.seq;
			}
			state.machine.viewer.inputAck = state.applied;
			state.machine.players.forEach((id, slot) => {
				const input = state.current[slot];
				if (input !== undefined) inputs.set(id, input);
			});
		}
		this._options.step(dt, this.tick, inputs);

		this._sendAccumulator += this.sendRate / this.tickRate;
		if (this._sendAccumulator >= 1) {
			this._sendAccumulator -= 1;
			this.replicator.flush();
		}
	}

	/** Sent so far: totals, rates and per-kind bytes (see IgeNetReplicator). */
	stats () {
		return {
			...this.replicator.stats,
			rates: this.replicator.rates(),
			bytesByKind: this.replicator.bytesByKind(),
			machines: [...this._machines.values()].map((m) => ({ id: m.machine.id, bytes: m.machine.viewer.stats.bytes, ...m.machine.viewer.report() })),
			report: this.replicator.report()
		};
	}

	_send (connection: IgeNetConnection, message: unknown, reliable: boolean = true): void {
		connection.send(message, reliable);
	}
}
