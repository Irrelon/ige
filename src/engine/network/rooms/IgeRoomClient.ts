import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeNetIoClientController } from "@/engine/network/client/IgeNetIoClientController";
import {
	IGE_ROOM_NETWORK_COMMAND,
	type IgeRoomChatLine,
	type IgeRoomClientMessage,
	type IgeRoomSeatInfo,
	type IgeRoomServerMessage,
	type IgeRoomWelcome
} from "@/engine/network/rooms/igeRoomProtocol";

/** How room messages reach the server (IgeNetIo by default, see igeRoomClientTransport()). */
export interface IgeRoomClientTransport {
	send (message: IgeRoomClientMessage): void;
	listen (onMessage: (message: IgeRoomServerMessage) => void, onDisconnect: () => void): void;
}

/** Room messages over an IgeNetIoClientController. */
export function igeRoomClientTransport (network: IgeNetIoClientController): IgeRoomClientTransport {
	return {
		send: (message) => network.send(IGE_ROOM_NETWORK_COMMAND, message as any),
		listen: (onMessage, onDisconnect) => {
			network.define(IGE_ROOM_NETWORK_COMMAND, (data: IgeRoomServerMessage) => onMessage(data));
			network.on("disconnected", () => onDisconnect());
		}
	};
}

/** Where seat tokens are kept between visits (default: localStorage, when there is one). */
export interface IgeRoomTokenStore {
	get (code: string, name: string): string | undefined;
	set (code: string, name: string, token: string): void;
}

const localTokens: IgeRoomTokenStore = {
	get: (code, name) => {
		try {
			return globalThis.localStorage?.getItem(`ige.room.${code}.${name.trim().toLowerCase()}`) ?? undefined;
		} catch {
			return undefined;
		}
	},
	set: (code, name, token) => {
		try {
			globalThis.localStorage?.setItem(`ige.room.${code}.${name.trim().toLowerCase()}`, token);
		} catch {
			// Without storage, rejoining takes a free seat instead of your own
		}
	}
};

/** A command from the room's ordered stream. */
export interface IgeRoomCommandEvent<Command = unknown> {
	seq: number;
	seat: number;
	command: Command;
}

/**
 * Joins game rooms on an IgeRoomServer and follows their ordered command
 * stream. Apply the snapshot from create() / join(), then every "command"
 * event in order; the client checks the sequence numbers and, if it ever
 * misses one, asks for a fresh snapshot ("snapshot" event) instead of
 * going out of step. Seat tokens are kept per room and player name, so
 * joining again puts a player back in their own seat.
 *
 * Events: "command" (IgeRoomCommandEvent), "snapshot" ({ seq, snapshot }),
 * "seats" (IgeRoomSeatInfo[]), "info", "chat" (IgeRoomChatLine), "error"
 * (message), "left", "disconnected".
 * @example #Join a room and follow its commands
 *     const rooms = new IgeRoomClient(igeRoomClientTransport(ige.network));
 *     const welcome = await rooms.join("KTRWM", "Rob");
 *     game.load(welcome.snapshot);
 *     rooms.on("command", ({ seat, command }) => game.apply(seat, command));
 *     rooms.on("snapshot", ({ snapshot }) => game.load(snapshot));
 *     rooms.send({ type: "move", unit: 3, to: [4, 7] }); // applied when it comes back
 */
export class IgeRoomClient<Command = unknown> extends IgeEventingClass {
	classId = "IgeRoomClient";
	/** The room code, once in a room. */
	code?: string;
	/** Your seat. */
	seat: number = -1;
	/** Sequence number of the last command applied. */
	seq: number = 0;
	seats: IgeRoomSeatInfo[] = [];
	chat: IgeRoomChatLine[] = [];
	info: unknown = null;
	_transport: IgeRoomClientTransport;
	_tokens: IgeRoomTokenStore;
	_ref: number = 0;
	_pending: Map<number, { resolve: (welcome: IgeRoomWelcome) => void; reject: (error: Error) => void }> = new Map();
	_resyncing: boolean = false;

	constructor (transport: IgeRoomClientTransport, options: { tokens?: IgeRoomTokenStore } = {}) {
		super();
		this._transport = transport;
		this._tokens = options.tokens || localTokens;
		transport.listen((message) => this._onMessage(message), () => this._onDisconnect());
	}

	/** Create a room and take its first seat (as host). */
	create (name: string, options?: unknown): Promise<IgeRoomWelcome> {
		return this._request((ref) => ({ t: "create", ref, name, options }), name);
	}

	/** Join a room by code: your own seat if you have its token, else a free one. */
	join (code: string, name: string, token?: string): Promise<IgeRoomWelcome> {
		const upper = code.trim().toUpperCase();
		return this._request((ref) => ({ t: "join", ref, code: upper, name, token: token ?? this._tokens.get(upper, name) }), name);
	}

	/** Send a command; it is applied when it comes back in the room's stream ("command" event). */
	send (command: Command): void {
		this._transport.send({ t: "command", command });
	}

	/** Say something in the room's chat. */
	say (text: string): void {
		this._transport.send({ t: "chat", text });
	}

	/** Leave the room for good, giving up your seat. */
	leave (): void {
		this._transport.send({ t: "leave" });
	}

	/** Ask for a fresh snapshot of the room ("snapshot" event). */
	resync (): void {
		if (this._resyncing) return;
		this._resyncing = true;
		this._transport.send({ t: "resync" });
	}

	_request (message: (ref: number) => IgeRoomClientMessage, name: string): Promise<IgeRoomWelcome> {
		const ref = ++this._ref;
		return new Promise((resolve, reject) => {
			this._pending.set(ref, {
				resolve: (welcome) => {
					this._tokens.set(welcome.code, name, welcome.token);
					resolve(welcome);
				},
				reject
			});
			this._transport.send(message(ref));
		});
	}

	_onMessage (message: IgeRoomServerMessage): void {
		switch (message.t) {
			case "welcome": {
				this.code = message.code;
				this.seat = message.seat;
				this.seq = message.seq;
				this.seats = message.seats;
				this.chat = [...message.chat];
				this.info = message.info;
				this._resyncing = false;
				const pending = this._pending.get(message.ref);
				this._pending.delete(message.ref);
				pending?.resolve(message);
				break;
			}

			case "applied": {
				if (this._resyncing || message.seq <= this.seq) return; // stale, or a snapshot is on its way
				if (message.seq !== this.seq + 1) {
					// Missed a command: catch up from a snapshot rather than go out of step
					this.resync();
					return;
				}
				this.seq = message.seq;
				const event: IgeRoomCommandEvent<Command> = { seq: message.seq, seat: message.seat, command: message.command as Command };
				this.emit("command", event);
				break;
			}

			case "snapshot":
				this._resyncing = false;
				this.seq = message.seq;
				this.emit("snapshot", { seq: message.seq, snapshot: message.snapshot });
				break;

			case "seats":
				this.seats = message.seats;
				this.emit("seats", message.seats);
				break;

			case "info":
				this.info = message.info;
				this.emit("info", message.info);
				break;

			case "chat":
				this.chat.push(message.line);
				this.emit("chat", message.line);
				break;

			case "error": {
				const pending = message.ref !== undefined ? this._pending.get(message.ref) : undefined;
				if (pending) {
					this._pending.delete(message.ref!);
					pending.reject(new Error(message.error));
				} else {
					this.emit("error", message.error);
				}
				break;
			}

			case "left":
				this.code = undefined;
				this.seat = -1;
				this.emit("left");
				break;
		}
	}

	_onDisconnect (): void {
		for (const pending of this._pending.values()) pending.reject(new Error("Disconnected from the server"));
		this._pending.clear();
		this.emit("disconnected");
	}
}
