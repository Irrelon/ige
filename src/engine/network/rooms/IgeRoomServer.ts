import type { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import {
	IGE_ROOM_NETWORK_COMMAND,
	type IgeRoomChatLine,
	type IgeRoomClientMessage,
	type IgeRoomSeatInfo,
	type IgeRoomServerMessage
} from "@/engine/network/rooms/igeRoomProtocol";

/** How room messages reach clients (IgeNetIo by default, see igeRoomServerTransport()). */
export interface IgeRoomServerTransport {
	send (clientId: string, message: IgeRoomServerMessage): void;
	listen (onMessage: (clientId: string, message: IgeRoomClientMessage) => void, onDisconnect: (clientId: string) => void): void;
}

/** Room messages over an IgeNetIoServerController (create the room server before clients connect). */
export function igeRoomServerTransport (network: IgeNetIoServerController): IgeRoomServerTransport {
	return {
		send: (clientId, message) => network.send(IGE_ROOM_NETWORK_COMMAND, message as any, clientId),
		listen: (onMessage, onDisconnect) => {
			network.define(IGE_ROOM_NETWORK_COMMAND, ((data: IgeRoomClientMessage, clientId: string) => onMessage(clientId, data)) as any);
			network.on("disconnect", (clientId: string) => onDisconnect(clientId));
		}
	};
}

export interface IgeRoomServerOptions<State, Command, Options> {
	/** Seats per room (or per room's options). */
	seats: number | ((options: Options) => number);
	/** The starting game state of a new room. */
	createState: (options: Options) => State;
	/**
	 * Check a command and apply it to the room's state. Return an error
	 * message to reject it (only the sender hears about it); otherwise the
	 * command is broadcast to the room with the next sequence number.
	 */
	applyCommand: (room: IgeServerRoom<State, Command>, seat: number, command: Command) => string | void;
	/** What joiners receive to rebuild the state (default: the state itself). */
	snapshot?: (room: IgeServerRoom<State, Command>) => unknown;
	/** Reject bad options when a room is created (return an error message). */
	validateOptions?: (options: Options) => string | void;
	/** Called after anything in a room changes (commands, seats, info, chat), e.g. to save it. */
	onChange?: (room: IgeServerRoom<State, Command>) => void;
	/** Chat lines kept per room (default 100). */
	chatHistory?: number;
	/** Letters in a room code (default 5). */
	codeLength?: number;
}

/** A seat on the server, with its token. */
export interface IgeServerSeat {
	seat: number;
	name: string;
	token?: string;
	clientId?: string;
}

/** A room as saved by IgeRoomServer.save(): restore() takes it back. */
export interface IgeSavedRoom {
	code: string;
	seq: number;
	seats: IgeServerSeat[];
	host: number;
	snapshot: unknown;
	info: unknown;
	chat: IgeRoomChatLine[];
	options: unknown;
}

function randomToken (): string {
	const c = (globalThis as any).crypto;
	if (c?.randomUUID) return c.randomUUID();
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** One game room: its state, seats, command sequence, info and chat. */
export class IgeServerRoom<State = unknown, Command = unknown> {
	readonly code: string;
	readonly options: unknown;
	state: State;
	/** Sequence number of the last command applied. */
	seq: number = 0;
	seats: IgeServerSeat[];
	/** The host's seat. */
	host: number = 0;
	/** Game-defined room information sent to everyone (see setInfo()). */
	info: unknown = null;
	chat: IgeRoomChatLine[] = [];
	_server: IgeRoomServer<State, Command, any>;

	constructor (server: IgeRoomServer<State, Command, any>, code: string, options: unknown, state: State, seatCount: number) {
		this._server = server;
		this.code = code;
		this.options = options;
		this.state = state;
		this.seats = Array.from({ length: seatCount }, (_, seat) => ({ seat, name: "" }));
	}

	/** Client ids connected to the room. */
	clients (): string[] {
		return this.seats.filter((s) => s.clientId).map((s) => s.clientId!);
	}

	/** Seats as clients see them. */
	seatInfo (): IgeRoomSeatInfo[] {
		return this.seats.map((s) => ({ seat: s.seat, name: s.name, taken: !!s.token, connected: !!s.clientId, host: s.seat === this.host }));
	}

	/**
	 * Apply a command for a seat from the server (an AI's move, a timer
	 * running out): checked and broadcast exactly like a player's. Returns
	 * an error message if applyCommand rejected it.
	 */
	apply (seat: number, command: Command): string | void {
		return this._server._apply(this, seat, command);
	}

	/** Set the game-defined room information (turn timers, settings) and send it to everyone. */
	setInfo (info: unknown): this {
		this.info = info;
		this.broadcast({ t: "info", info });
		this._server._changed(this);
		return this;
	}

	/** Add a chat line (seat -1 for server messages) and send it to everyone. */
	say (text: string, seat: number = -1, name: string = ""): this {
		const line: IgeRoomChatLine = { seat, name, text, time: Date.now() };
		this.chat.push(line);
		const keep = this._server._options.chatHistory ?? 100;
		if (this.chat.length > keep) this.chat.splice(0, this.chat.length - keep);
		this.broadcast({ t: "chat", line });
		this._server._changed(this);
		return this;
	}

	/** Send a message to everyone in the room. */
	broadcast (message: IgeRoomServerMessage): void {
		for (const clientId of this.clients()) this._server._transport.send(clientId, message);
	}
}

/**
 * Game rooms for online play on IGE's networking: join codes, seats that
 * players keep across reconnects, presence, chat, and an ordered command
 * stream. The server checks and applies each command to its own copy of
 * the game state (applyCommand) and broadcasts it with a sequence number;
 * every client applies the same stream to its copy, so turn-based and
 * lockstep games stay in step. Joiners (and clients that fall out of step)
 * get a snapshot. Rooms can be saved and restored (save() / restore()).
 *
 * Clients use IgeRoomClient.
 * @example #A turn-based game server
 *     const rooms = new IgeRoomServer(igeRoomServerTransport(ige.network), {
 *         seats: 4,
 *         createState: (options) => new Game(options),
 *         applyCommand: (room, seat, command) => room.state.apply(seat, command), // returns an error to reject
 *         snapshot: (room) => room.state.serialize(),
 *         onChange: (room) => saveToDisk(rooms.save(room))
 *     });
 */
export class IgeRoomServer<State = unknown, Command = unknown, Options = unknown> {
	readonly rooms: Map<string, IgeServerRoom<State, Command>> = new Map();
	_transport: IgeRoomServerTransport;
	_options: IgeRoomServerOptions<State, Command, Options>;
	/** Which room and seat each connected client is in. */
	_clients: Map<string, { room: IgeServerRoom<State, Command>; seat: number }> = new Map();

	constructor (transport: IgeRoomServerTransport, options: IgeRoomServerOptions<State, Command, Options>) {
		this._transport = transport;
		this._options = options;
		transport.listen((clientId, message) => this._onMessage(clientId, message), (clientId) => this._onDisconnect(clientId));
	}

	/** A room by code. */
	room (code: string): IgeServerRoom<State, Command> | undefined {
		return this.rooms.get(code.toUpperCase());
	}

	/** Create a room from the server (no seat taken yet), e.g. for matchmaking. */
	createRoom (options: Options): IgeServerRoom<State, Command> {
		const seatCount = typeof this._options.seats === "function" ? this._options.seats(options) : this._options.seats;
		const room = new IgeServerRoom<State, Command>(this, this._newCode(), options, this._options.createState(options), seatCount);
		this.rooms.set(room.code, room);
		return room;
	}

	/** Everything needed to restore a room later (seat tokens included: keep it private). */
	save (room: IgeServerRoom<State, Command>): IgeSavedRoom {
		return {
			code: room.code,
			seq: room.seq,
			seats: room.seats.map(({ seat, name, token }) => ({ seat, name, token })),
			host: room.host,
			snapshot: this._snapshot(room),
			info: room.info,
			chat: room.chat,
			options: room.options
		};
	}

	/** Bring back a saved room; `state` rebuilds the game state from its snapshot. */
	restore (saved: IgeSavedRoom, state: (snapshot: unknown) => State): IgeServerRoom<State, Command> {
		const room = new IgeServerRoom<State, Command>(this, saved.code, saved.options, state(saved.snapshot), saved.seats.length);
		room.seq = saved.seq;
		room.seats = saved.seats.map(({ seat, name, token }) => ({ seat, name, token }));
		room.host = saved.host;
		room.info = saved.info;
		room.chat = saved.chat || [];
		this.rooms.set(room.code, room);
		return room;
	}

	/** Close a room: everyone in it is told they left. */
	closeRoom (room: IgeServerRoom<State, Command>): void {
		for (const clientId of room.clients()) {
			this._clients.delete(clientId);
			this._transport.send(clientId, { t: "left" });
		}
		this.rooms.delete(room.code);
	}

	_snapshot (room: IgeServerRoom<State, Command>): unknown {
		return this._options.snapshot ? this._options.snapshot(room) : room.state;
	}

	_newCode (): string {
		const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
		const length = this._options.codeLength ?? 5;
		for (;;) {
			let code = "";
			for (let i = 0; i < length; i++) code += letters[Math.floor(Math.random() * letters.length)];
			if (!this.rooms.has(code)) return code;
		}
	}

	_changed (room: IgeServerRoom<State, Command>): void {
		this._options.onChange?.(room);
	}

	_apply (room: IgeServerRoom<State, Command>, seat: number, command: Command): string | void {
		const error = this._options.applyCommand(room, seat, command);
		if (error) return error;
		room.seq++;
		room.broadcast({ t: "applied", seq: room.seq, seat, command });
		this._changed(room);
	}

	_seatsChanged (room: IgeServerRoom<State, Command>): void {
		room.broadcast({ t: "seats", seats: room.seatInfo() });
		this._changed(room);
	}

	_seat (room: IgeServerRoom<State, Command>, seat: IgeServerSeat, clientId: string, ref: number): void {
		// One room per connection
		this._leaveCurrent(clientId, false);
		// The seat's previous connection (another tab) is replaced
		if (seat.clientId && seat.clientId !== clientId) {
			this._clients.delete(seat.clientId);
			this._transport.send(seat.clientId, { t: "left" });
		}
		seat.clientId = clientId;
		this._clients.set(clientId, { room, seat: seat.seat });
		// The first player in a room without a taken host seat hosts it
		if (!room.seats[room.host]?.token || room.seats[room.host] === seat) room.host = seat.seat;

		this._transport.send(clientId, {
			t: "welcome",
			ref,
			code: room.code,
			seat: seat.seat,
			token: seat.token!,
			seq: room.seq,
			snapshot: this._snapshot(room),
			seats: room.seatInfo(),
			chat: room.chat,
			info: room.info
		});
		this._seatsChanged(room);
	}

	/** Detach a client from its room; with `release`, its seat is given up too. */
	_leaveCurrent (clientId: string, release: boolean): void {
		const current = this._clients.get(clientId);
		if (!current) return;
		this._clients.delete(clientId);
		const seat = current.room.seats[current.seat];
		if (seat.clientId === clientId) seat.clientId = undefined;
		if (release) {
			seat.token = undefined;
			seat.name = "";
			// Hand hosting to another taken seat
			if (current.room.host === seat.seat) {
				const next = current.room.seats.find((s) => s.token);
				if (next) current.room.host = next.seat;
			}
		}
		this._seatsChanged(current.room);
	}

	_onDisconnect (clientId: string): void {
		this._leaveCurrent(clientId, false);
	}

	_onMessage (clientId: string, message: IgeRoomClientMessage): void {
		const error = (text: string, ref?: number) => this._transport.send(clientId, { t: "error", error: text, ref });
		if (!message || typeof message !== "object") return error("Bad message");
		const name = typeof (message as any).name === "string" ? (message as any).name.trim().slice(0, 32) : "";

		switch (message.t) {
			case "create": {
				const options = message.options as Options;
				const problem = this._options.validateOptions?.(options);
				if (problem) return error(problem, message.ref);
				let room: IgeServerRoom<State, Command>;
				try {
					room = this.createRoom(options);
				} catch (err) {
					return error(err instanceof Error ? err.message : String(err), message.ref);
				}
				const seat = room.seats[0];
				seat.name = name || "Player 1";
				seat.token = randomToken();
				room.host = 0;
				return this._seat(room, seat, clientId, message.ref);
			}

			case "join": {
				const room = this.room(String(message.code || ""));
				if (!room) return error(`There is no room ${String(message.code || "").toUpperCase()}`, message.ref);
				// Your own seat back, by token
				let seat = message.token ? room.seats.find((s) => s.token === message.token) : undefined;
				if (!seat) {
					seat = room.seats.find((s) => !s.token);
					if (!seat) return error(`Room ${room.code} has no free seats`, message.ref);
					seat.token = randomToken();
					seat.name = name || `Player ${seat.seat + 1}`;
				} else if (name) {
					seat.name = name;
				}
				return this._seat(room, seat, clientId, message.ref);
			}

			case "command": {
				const current = this._clients.get(clientId);
				if (!current) return error("Join a room first");
				const problem = this._apply(current.room, current.seat, message.command as Command);
				if (problem) error(problem);
				return;
			}

			case "chat": {
				const current = this._clients.get(clientId);
				if (!current) return error("Join a room first");
				const text = String(message.text || "").trim().slice(0, 500);
				if (text) current.room.say(text, current.seat, current.room.seats[current.seat].name);
				return;
			}

			case "resync": {
				const current = this._clients.get(clientId);
				if (!current) return error("Join a room first");
				this._transport.send(clientId, { t: "snapshot", seq: current.room.seq, snapshot: this._snapshot(current.room) });
				return;
			}

			case "leave": {
				this._leaveCurrent(clientId, true);
				this._transport.send(clientId, { t: "left" });
				return;
			}

			default:
				return error("Unknown message");
		}
	}
}
