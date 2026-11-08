import type { IgeNetIoServerController } from "../server/IgeNetIoServerController.js"
import { type IgeRoomChatLine, type IgeRoomClientMessage, type IgeRoomSeatInfo, type IgeRoomServerMessage } from "./igeRoomProtocol.js";
/** How room messages reach clients (IgeNetIo by default, see igeRoomServerTransport()). */
export interface IgeRoomServerTransport {
    send(clientId: string, message: IgeRoomServerMessage): void;
    listen(onMessage: (clientId: string, message: IgeRoomClientMessage) => void, onDisconnect: (clientId: string) => void): void;
}
/** Room messages over an IgeNetIoServerController (create the room server before clients connect). */
export declare function igeRoomServerTransport(network: IgeNetIoServerController): IgeRoomServerTransport;
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
/** One game room: its state, seats, command sequence, info and chat. */
export declare class IgeServerRoom<State = unknown, Command = unknown> {
    readonly code: string;
    readonly options: unknown;
    state: State;
    /** Sequence number of the last command applied. */
    seq: number;
    seats: IgeServerSeat[];
    /** The host's seat. */
    host: number;
    /** Game-defined room information sent to everyone (see setInfo()). */
    info: unknown;
    chat: IgeRoomChatLine[];
    _server: IgeRoomServer<State, Command, any>;
    constructor(server: IgeRoomServer<State, Command, any>, code: string, options: unknown, state: State, seatCount: number);
    /** Client ids connected to the room. */
    clients(): string[];
    /** Seats as clients see them. */
    seatInfo(): IgeRoomSeatInfo[];
    /**
     * Apply a command for a seat from the server (an AI's move, a timer
     * running out): checked and broadcast exactly like a player's. Returns
     * an error message if applyCommand rejected it.
     */
    apply(seat: number, command: Command): string | void;
    /** Set the game-defined room information (turn timers, settings) and send it to everyone. */
    setInfo(info: unknown): this;
    /** Add a chat line (seat -1 for server messages) and send it to everyone. */
    say(text: string, seat?: number, name?: string): this;
    /** Send a message to everyone in the room. */
    broadcast(message: IgeRoomServerMessage): void;
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
export declare class IgeRoomServer<State = unknown, Command = unknown, Options = unknown> {
    readonly rooms: Map<string, IgeServerRoom<State, Command>>;
    _transport: IgeRoomServerTransport;
    _options: IgeRoomServerOptions<State, Command, Options>;
    /** Which room and seat each connected client is in. */
    _clients: Map<string, {
        room: IgeServerRoom<State, Command>;
        seat: number;
    }>;
    constructor(transport: IgeRoomServerTransport, options: IgeRoomServerOptions<State, Command, Options>);
    /** A room by code. */
    room(code: string): IgeServerRoom<State, Command> | undefined;
    /** Create a room from the server (no seat taken yet), e.g. for matchmaking. */
    createRoom(options: Options): IgeServerRoom<State, Command>;
    /** Everything needed to restore a room later (seat tokens included: keep it private). */
    save(room: IgeServerRoom<State, Command>): IgeSavedRoom;
    /** Bring back a saved room; `state` rebuilds the game state from its snapshot. */
    restore(saved: IgeSavedRoom, state: (snapshot: unknown) => State): IgeServerRoom<State, Command>;
    /** Close a room: everyone in it is told they left. */
    closeRoom(room: IgeServerRoom<State, Command>): void;
    _snapshot(room: IgeServerRoom<State, Command>): unknown;
    _newCode(): string;
    _changed(room: IgeServerRoom<State, Command>): void;
    _apply(room: IgeServerRoom<State, Command>, seat: number, command: Command): string | void;
    _seatsChanged(room: IgeServerRoom<State, Command>): void;
    _seat(room: IgeServerRoom<State, Command>, seat: IgeServerSeat, clientId: string, ref: number): void;
    /** Detach a client from its room; with `release`, its seat is given up too. */
    _leaveCurrent(clientId: string, release: boolean): void;
    _onDisconnect(clientId: string): void;
    _onMessage(clientId: string, message: IgeRoomClientMessage): void;
}
