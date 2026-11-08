import { IgeEventingClass } from "../../core/IgeEventingClass.js"
import type { IgeNetIoClientController } from "../client/IgeNetIoClientController.js"
import { type IgeRoomChatLine, type IgeRoomClientMessage, type IgeRoomSeatInfo, type IgeRoomServerMessage, type IgeRoomWelcome } from "./igeRoomProtocol.js";
/** How room messages reach the server (IgeNetIo by default, see igeRoomClientTransport()). */
export interface IgeRoomClientTransport {
    send(message: IgeRoomClientMessage): void;
    listen(onMessage: (message: IgeRoomServerMessage) => void, onDisconnect: () => void): void;
}
/** Room messages over an IgeNetIoClientController. */
export declare function igeRoomClientTransport(network: IgeNetIoClientController): IgeRoomClientTransport;
/** Where seat tokens are kept between visits (default: localStorage, when there is one). */
export interface IgeRoomTokenStore {
    get(code: string, name: string): string | undefined;
    set(code: string, name: string, token: string): void;
}
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
export declare class IgeRoomClient<Command = unknown> extends IgeEventingClass {
    classId: string;
    /** The room code, once in a room. */
    code?: string;
    /** Your seat. */
    seat: number;
    /** Sequence number of the last command applied. */
    seq: number;
    seats: IgeRoomSeatInfo[];
    chat: IgeRoomChatLine[];
    info: unknown;
    _transport: IgeRoomClientTransport;
    _tokens: IgeRoomTokenStore;
    _ref: number;
    _pending: Map<number, {
        resolve: (welcome: IgeRoomWelcome) => void;
        reject: (error: Error) => void;
    }>;
    _resyncing: boolean;
    constructor(transport: IgeRoomClientTransport, options?: {
        tokens?: IgeRoomTokenStore;
    });
    /** Create a room and take its first seat (as host). */
    create(name: string, options?: unknown): Promise<IgeRoomWelcome>;
    /** Join a room by code: your own seat if you have its token, else a free one. */
    join(code: string, name: string, token?: string): Promise<IgeRoomWelcome>;
    /** Send a command; it is applied when it comes back in the room's stream ("command" event). */
    send(command: Command): void;
    /** Say something in the room's chat. */
    say(text: string): void;
    /** Leave the room for good, giving up your seat. */
    leave(): void;
    /** Ask for a fresh snapshot of the room ("snapshot" event). */
    resync(): void;
    _request(message: (ref: number) => IgeRoomClientMessage, name: string): Promise<IgeRoomWelcome>;
    _onMessage(message: IgeRoomServerMessage): void;
    _onDisconnect(): void;
}
