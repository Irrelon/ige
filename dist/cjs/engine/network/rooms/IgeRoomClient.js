"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeRoomClient = void 0;
exports.igeRoomClientTransport = igeRoomClientTransport;
const IgeEventingClass_1 = require("../../core/IgeEventingClass.js");
const igeRoomProtocol_1 = require("./igeRoomProtocol.js");
/** Room messages over an IgeNetIoClientController. */
function igeRoomClientTransport(network) {
    return {
        send: (message) => network.send(igeRoomProtocol_1.IGE_ROOM_NETWORK_COMMAND, message),
        listen: (onMessage, onDisconnect) => {
            network.define(igeRoomProtocol_1.IGE_ROOM_NETWORK_COMMAND, (data) => onMessage(data));
            network.on("disconnected", () => onDisconnect());
        }
    };
}
const localTokens = {
    get: (code, name) => {
        var _a, _b;
        try {
            return (_b = (_a = globalThis.localStorage) === null || _a === void 0 ? void 0 : _a.getItem(`ige.room.${code}.${name.trim().toLowerCase()}`)) !== null && _b !== void 0 ? _b : undefined;
        }
        catch (_c) {
            return undefined;
        }
    },
    set: (code, name, token) => {
        var _a;
        try {
            (_a = globalThis.localStorage) === null || _a === void 0 ? void 0 : _a.setItem(`ige.room.${code}.${name.trim().toLowerCase()}`, token);
        }
        catch (_b) {
            // Without storage, rejoining takes a free seat instead of your own
        }
    }
};
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
class IgeRoomClient extends IgeEventingClass_1.IgeEventingClass {
    constructor(transport, options = {}) {
        super();
        this.classId = "IgeRoomClient";
        /** Your seat. */
        this.seat = -1;
        /** Sequence number of the last command applied. */
        this.seq = 0;
        this.seats = [];
        this.chat = [];
        this.info = null;
        this._ref = 0;
        this._pending = new Map();
        this._resyncing = false;
        this._transport = transport;
        this._tokens = options.tokens || localTokens;
        transport.listen((message) => this._onMessage(message), () => this._onDisconnect());
    }
    /** Create a room and take its first seat (as host). */
    create(name, options) {
        return this._request((ref) => ({ t: "create", ref, name, options }), name);
    }
    /** Join a room by code: your own seat if you have its token, else a free one. */
    join(code, name, token) {
        const upper = code.trim().toUpperCase();
        return this._request((ref) => ({ t: "join", ref, code: upper, name, token: token !== null && token !== void 0 ? token : this._tokens.get(upper, name) }), name);
    }
    /** Send a command; it is applied when it comes back in the room's stream ("command" event). */
    send(command) {
        this._transport.send({ t: "command", command });
    }
    /** Say something in the room's chat. */
    say(text) {
        this._transport.send({ t: "chat", text });
    }
    /** Leave the room for good, giving up your seat. */
    leave() {
        this._transport.send({ t: "leave" });
    }
    /** Ask for a fresh snapshot of the room ("snapshot" event). */
    resync() {
        if (this._resyncing)
            return;
        this._resyncing = true;
        this._transport.send({ t: "resync" });
    }
    _request(message, name) {
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
    _onMessage(message) {
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
                pending === null || pending === void 0 ? void 0 : pending.resolve(message);
                break;
            }
            case "applied": {
                if (this._resyncing || message.seq <= this.seq)
                    return; // stale, or a snapshot is on its way
                if (message.seq !== this.seq + 1) {
                    // Missed a command: catch up from a snapshot rather than go out of step
                    this.resync();
                    return;
                }
                this.seq = message.seq;
                const event = { seq: message.seq, seat: message.seat, command: message.command };
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
                    this._pending.delete(message.ref);
                    pending.reject(new Error(message.error));
                }
                else {
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
    _onDisconnect() {
        for (const pending of this._pending.values())
            pending.reject(new Error("Disconnected from the server"));
        this._pending.clear();
        this.emit("disconnected");
    }
}
exports.IgeRoomClient = IgeRoomClient;
