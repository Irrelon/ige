"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRoomServer = exports.IgeServerRoom = void 0;
exports.igeRoomServerTransport = igeRoomServerTransport;
const igeRoomProtocol_1 = require("./igeRoomProtocol.js");
/** Room messages over an IgeNetIoServerController (create the room server before clients connect). */
function igeRoomServerTransport(network) {
    return {
        send: (clientId, message) => network.send(igeRoomProtocol_1.IGE_ROOM_NETWORK_COMMAND, message, clientId),
        listen: (onMessage, onDisconnect) => {
            network.define(igeRoomProtocol_1.IGE_ROOM_NETWORK_COMMAND, ((data, clientId) => onMessage(clientId, data)));
            network.on("disconnect", (clientId) => onDisconnect(clientId));
        }
    };
}
function randomToken() {
    const c = globalThis.crypto;
    if (c === null || c === void 0 ? void 0 : c.randomUUID)
        return c.randomUUID();
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
/** One game room: its state, seats, command sequence, info and chat. */
class IgeServerRoom {
    constructor(server, code, options, state, seatCount) {
        /** Sequence number of the last command applied. */
        this.seq = 0;
        /** The host's seat. */
        this.host = 0;
        /** Game-defined room information sent to everyone (see setInfo()). */
        this.info = null;
        this.chat = [];
        this._server = server;
        this.code = code;
        this.options = options;
        this.state = state;
        this.seats = Array.from({ length: seatCount }, (_, seat) => ({ seat, name: "" }));
    }
    /** Client ids connected to the room. */
    clients() {
        return this.seats.filter((s) => s.clientId).map((s) => s.clientId);
    }
    /** Seats as clients see them. */
    seatInfo() {
        return this.seats.map((s) => ({ seat: s.seat, name: s.name, taken: !!s.token, connected: !!s.clientId, host: s.seat === this.host }));
    }
    /**
     * Apply a command for a seat from the server (an AI's move, a timer
     * running out): checked and broadcast exactly like a player's. Returns
     * an error message if applyCommand rejected it.
     */
    apply(seat, command) {
        return this._server._apply(this, seat, command);
    }
    /** Set the game-defined room information (turn timers, settings) and send it to everyone. */
    setInfo(info) {
        this.info = info;
        this.broadcast({ t: "info", info });
        this._server._changed(this);
        return this;
    }
    /** Add a chat line (seat -1 for server messages) and send it to everyone. */
    say(text, seat = -1, name = "") {
        var _a;
        const line = { seat, name, text, time: Date.now() };
        this.chat.push(line);
        const keep = (_a = this._server._options.chatHistory) !== null && _a !== void 0 ? _a : 100;
        if (this.chat.length > keep)
            this.chat.splice(0, this.chat.length - keep);
        this.broadcast({ t: "chat", line });
        this._server._changed(this);
        return this;
    }
    /** Send a message to everyone in the room. */
    broadcast(message) {
        for (const clientId of this.clients())
            this._server._transport.send(clientId, message);
    }
}
exports.IgeServerRoom = IgeServerRoom;
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
class IgeRoomServer {
    constructor(transport, options) {
        this.rooms = new Map();
        /** Which room and seat each connected client is in. */
        this._clients = new Map();
        this._transport = transport;
        this._options = options;
        transport.listen((clientId, message) => this._onMessage(clientId, message), (clientId) => this._onDisconnect(clientId));
    }
    /** A room by code. */
    room(code) {
        return this.rooms.get(code.toUpperCase());
    }
    /** Create a room from the server (no seat taken yet), e.g. for matchmaking. */
    createRoom(options) {
        const seatCount = typeof this._options.seats === "function" ? this._options.seats(options) : this._options.seats;
        const room = new IgeServerRoom(this, this._newCode(), options, this._options.createState(options), seatCount);
        this.rooms.set(room.code, room);
        return room;
    }
    /** Everything needed to restore a room later (seat tokens included: keep it private). */
    save(room) {
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
    restore(saved, state) {
        const room = new IgeServerRoom(this, saved.code, saved.options, state(saved.snapshot), saved.seats.length);
        room.seq = saved.seq;
        room.seats = saved.seats.map(({ seat, name, token }) => ({ seat, name, token }));
        room.host = saved.host;
        room.info = saved.info;
        room.chat = saved.chat || [];
        this.rooms.set(room.code, room);
        return room;
    }
    /** Close a room: everyone in it is told they left. */
    closeRoom(room) {
        for (const clientId of room.clients()) {
            this._clients.delete(clientId);
            this._transport.send(clientId, { t: "left" });
        }
        this.rooms.delete(room.code);
    }
    _snapshot(room) {
        return this._options.snapshot ? this._options.snapshot(room) : room.state;
    }
    _newCode() {
        var _a;
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O
        const length = (_a = this._options.codeLength) !== null && _a !== void 0 ? _a : 5;
        for (;;) {
            let code = "";
            for (let i = 0; i < length; i++)
                code += letters[Math.floor(Math.random() * letters.length)];
            if (!this.rooms.has(code))
                return code;
        }
    }
    _changed(room) {
        var _a, _b;
        (_b = (_a = this._options).onChange) === null || _b === void 0 ? void 0 : _b.call(_a, room);
    }
    _apply(room, seat, command) {
        const error = this._options.applyCommand(room, seat, command);
        if (error)
            return error;
        room.seq++;
        room.broadcast({ t: "applied", seq: room.seq, seat, command });
        this._changed(room);
    }
    _seatsChanged(room) {
        room.broadcast({ t: "seats", seats: room.seatInfo() });
        this._changed(room);
    }
    _seat(room, seat, clientId, ref) {
        var _a;
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
        if (!((_a = room.seats[room.host]) === null || _a === void 0 ? void 0 : _a.token) || room.seats[room.host] === seat)
            room.host = seat.seat;
        this._transport.send(clientId, {
            t: "welcome",
            ref,
            code: room.code,
            seat: seat.seat,
            token: seat.token,
            seq: room.seq,
            snapshot: this._snapshot(room),
            seats: room.seatInfo(),
            chat: room.chat,
            info: room.info
        });
        this._seatsChanged(room);
    }
    /** Detach a client from its room; with `release`, its seat is given up too. */
    _leaveCurrent(clientId, release) {
        const current = this._clients.get(clientId);
        if (!current)
            return;
        this._clients.delete(clientId);
        const seat = current.room.seats[current.seat];
        if (seat.clientId === clientId)
            seat.clientId = undefined;
        if (release) {
            seat.token = undefined;
            seat.name = "";
            // Hand hosting to another taken seat
            if (current.room.host === seat.seat) {
                const next = current.room.seats.find((s) => s.token);
                if (next)
                    current.room.host = next.seat;
            }
        }
        this._seatsChanged(current.room);
    }
    _onDisconnect(clientId) {
        this._leaveCurrent(clientId, false);
    }
    _onMessage(clientId, message) {
        var _a, _b;
        const error = (text, ref) => this._transport.send(clientId, { t: "error", error: text, ref });
        if (!message || typeof message !== "object")
            return error("Bad message");
        const name = typeof message.name === "string" ? message.name.trim().slice(0, 32) : "";
        switch (message.t) {
            case "create": {
                const options = message.options;
                const problem = (_b = (_a = this._options).validateOptions) === null || _b === void 0 ? void 0 : _b.call(_a, options);
                if (problem)
                    return error(problem, message.ref);
                let room;
                try {
                    room = this.createRoom(options);
                }
                catch (err) {
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
                if (!room)
                    return error(`There is no room ${String(message.code || "").toUpperCase()}`, message.ref);
                // Your own seat back, by token
                let seat = message.token ? room.seats.find((s) => s.token === message.token) : undefined;
                if (!seat) {
                    seat = room.seats.find((s) => !s.token);
                    if (!seat)
                        return error(`Room ${room.code} has no free seats`, message.ref);
                    seat.token = randomToken();
                    seat.name = name || `Player ${seat.seat + 1}`;
                }
                else if (name) {
                    seat.name = name;
                }
                return this._seat(room, seat, clientId, message.ref);
            }
            case "command": {
                const current = this._clients.get(clientId);
                if (!current)
                    return error("Join a room first");
                const problem = this._apply(current.room, current.seat, message.command);
                if (problem)
                    error(problem);
                return;
            }
            case "chat": {
                const current = this._clients.get(clientId);
                if (!current)
                    return error("Join a room first");
                const text = String(message.text || "").trim().slice(0, 500);
                if (text)
                    current.room.say(text, current.seat, current.room.seats[current.seat].name);
                return;
            }
            case "resync": {
                const current = this._clients.get(clientId);
                if (!current)
                    return error("Join a room first");
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
exports.IgeRoomServer = IgeRoomServer;
