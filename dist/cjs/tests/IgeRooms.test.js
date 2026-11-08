"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const IgeRoomServer_1 = require("../engine/network/rooms/IgeRoomServer.js");
const IgeRoomClient_1 = require("../engine/network/rooms/IgeRoomClient.js");
/** An in-memory network: messages arrive asynchronously, in order; one can be dropped on purpose. */
class FakeNetwork {
    constructor() {
        this.clients = new Map();
    }
    serverTransport() {
        return {
            send: (clientId, message) => {
                const client = this.clients.get(clientId);
                if (!(client === null || client === void 0 ? void 0 : client.connected))
                    return;
                if (this.dropNextTo === clientId && message.t === "applied") {
                    this.dropNextTo = undefined;
                    return;
                }
                const copy = JSON.parse(JSON.stringify(message));
                queueMicrotask(() => client.connected && client.onMessage(copy));
            },
            listen: (onMessage, onDisconnect) => {
                this.serverHandlers = { onMessage, onDisconnect };
            }
        };
    }
    clientTransport(clientId) {
        return {
            send: (message) => {
                const copy = JSON.parse(JSON.stringify(message));
                queueMicrotask(() => { var _a; return ((_a = this.clients.get(clientId)) === null || _a === void 0 ? void 0 : _a.connected) && this.serverHandlers.onMessage(clientId, copy); });
            },
            listen: (onMessage, onDisconnect) => {
                this.clients.set(clientId, { onMessage, onDisconnect, connected: true });
            }
        };
    }
    disconnect(clientId) {
        const client = this.clients.get(clientId);
        client.connected = false;
        client.onDisconnect();
        this.serverHandlers.onDisconnect(clientId);
    }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
/** In-memory token store (one per "browser"). */
function tokens() {
    const map = new Map();
    return { get: (c, n) => map.get(`${c}/${n}`), set: (c, n, t) => map.set(`${c}/${n}`, t) };
}
function makeServer(network, onChange) {
    return new IgeRoomServer_1.IgeRoomServer(network.serverTransport(), {
        seats: 3,
        createState: (options) => { var _a; return ({ total: (_a = options === null || options === void 0 ? void 0 : options.start) !== null && _a !== void 0 ? _a : 0, log: [] }); },
        applyCommand: (room, seat, command) => {
            if (typeof (command === null || command === void 0 ? void 0 : command.add) !== "number" || command.add < 0)
                return "Can't subtract";
            room.state.total += command.add;
            room.state.log.push(`${seat}+${command.add}`);
        },
        snapshot: (room) => (Object.assign({}, room.state)),
        validateOptions: (options) => (options && options.start > 1000 ? "Too big" : undefined),
        onChange
    });
}
/** A client that mirrors the room's state from the snapshot and the command stream. */
function player(network, id, store = tokens()) {
    const client = new IgeRoomClient_1.IgeRoomClient(network.clientTransport(id), { tokens: store });
    const mirror = { total: 0, applied: [] };
    client.on("command", ({ seq, command }) => {
        mirror.total += command.add;
        mirror.applied.push(seq);
    });
    client.on("snapshot", ({ snapshot }) => {
        mirror.total = snapshot.total;
    });
    return { client, mirror, store };
}
describe("IgeRoomServer / IgeRoomClient", () => {
    it("creates and joins rooms with seats, hosts and snapshots", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        const server = makeServer(network);
        const a = player(network, "a");
        const b = player(network, "b");
        const welcomeA = yield a.client.create("Ann", { start: 10 });
        expect(welcomeA.code).toMatch(/^[A-Z]{5}$/);
        expect(welcomeA.seat).toBe(0);
        expect(welcomeA.snapshot).toEqual({ total: 10, log: [] });
        const welcomeB = yield b.client.join(welcomeA.code.toLowerCase(), "Bob");
        expect(welcomeB.seat).toBe(1);
        yield settle();
        expect(a.client.seats.map((s) => [s.name, s.taken, s.connected, s.host])).toEqual([
            ["Ann", true, true, true], ["Bob", true, true, false], ["", false, false, false]
        ]);
        expect(server.room(welcomeA.code).clients().sort()).toEqual(["a", "b"]);
        yield expect(a.client.create("Ann", { start: 5000 })).rejects.toThrow("Too big");
        yield expect(b.client.join("ZZZZZ", "Bob")).rejects.toThrow("There is no room ZZZZZ");
    }));
    it("applies commands in one order for everyone and rejects bad ones to the sender only", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        const server = makeServer(network);
        const a = player(network, "a");
        const b = player(network, "b");
        const { code } = yield a.client.create("Ann");
        yield b.client.join(code, "Bob");
        const errors = [];
        const otherErrors = [];
        a.client.on("error", (e) => { errors.push(e); });
        b.client.on("error", (e) => { otherErrors.push(e); });
        a.client.send({ add: 2 });
        b.client.send({ add: 5 });
        a.client.send({ add: -1 });
        b.client.send({ add: 1 });
        yield settle();
        yield settle();
        const room = server.room(code);
        expect(room.state.total).toBe(8);
        expect(room.seq).toBe(3);
        expect(a.mirror.total).toBe(8);
        expect(b.mirror.total).toBe(8);
        expect(a.mirror.applied).toEqual([1, 2, 3]);
        expect(b.mirror.applied).toEqual([1, 2, 3]);
        expect(errors).toEqual(["Can't subtract"]);
        expect(otherErrors).toEqual([]);
    }));
    it("keeps seats across disconnects: presence, rejoining by token, full rooms, leaving", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        const server = makeServer(network);
        const a = player(network, "a");
        const { code } = yield a.client.create("Ann");
        const b = player(network, "b");
        yield b.client.join(code, "Bob");
        const c = player(network, "c");
        yield c.client.join(code, "Cat");
        network.disconnect("b");
        yield settle();
        expect(a.client.seats[1]).toMatchObject({ name: "Bob", taken: true, connected: false });
        // A fourth player finds the room full (Bob's seat is still his)
        const d = player(network, "d");
        yield expect(d.client.join(code, "Dan")).rejects.toThrow("no free seats");
        // Bob comes back on a new connection from the same browser: same seat, caught up
        a.client.send({ add: 4 });
        yield settle();
        const b2 = player(network, "b2", b.store);
        const welcome = yield b2.client.join(code, "Bob");
        expect(welcome.seat).toBe(1);
        expect(welcome.snapshot.total).toBe(4);
        expect(welcome.seq).toBe(1);
        // Cat leaves for good: her seat is free for Dan
        c.client.leave();
        yield settle();
        expect(server.room(code).seats[2].token).toBeUndefined();
        expect((yield d.client.join(code, "Dan")).seat).toBe(2);
        // Ann (the host) leaves: hosting passes to a taken seat
        a.client.leave();
        yield settle();
        expect(server.room(code).host).toBe(1);
    }));
    it("catches up from a snapshot after missing a command", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        makeServer(network);
        const a = player(network, "a");
        const b = player(network, "b");
        const { code } = yield a.client.create("Ann");
        yield b.client.join(code, "Bob");
        const snapshots = [];
        b.client.on("snapshot", ({ seq }) => { snapshots.push(seq); });
        a.client.send({ add: 1 });
        yield settle();
        network.dropNextTo = "b";
        a.client.send({ add: 2 }); // lost on the way to Bob
        a.client.send({ add: 3 }); // Bob sees a gap and asks for a snapshot
        yield settle();
        yield settle();
        yield settle();
        expect(snapshots).toEqual([3]);
        expect(b.client.seq).toBe(3);
        expect(b.mirror.total).toBe(6);
        a.client.send({ add: 4 });
        yield settle();
        yield settle();
        expect(b.mirror.total).toBe(10);
        expect(b.client.seq).toBe(4);
    }));
    it("broadcasts server-side commands, info and chat", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        const server = makeServer(network);
        const a = player(network, "a");
        const { code } = yield a.client.create("Ann");
        const info = [];
        const chat = [];
        a.client.on("info", (i) => { info.push(i); });
        a.client.on("chat", (line) => { chat.push(`${line.name}: ${line.text}`); });
        const room = server.room(code);
        expect(room.apply(2, { add: 7 })).toBeUndefined(); // an AI in seat 2
        expect(room.apply(2, { add: -7 })).toBe("Can't subtract");
        room.setInfo({ turnSeconds: 60 });
        a.client.say("hello");
        yield settle(); // the player's line reaches the server first
        room.say("Turn 2");
        yield settle();
        yield settle();
        expect(a.mirror.total).toBe(7);
        expect(info).toEqual([{ turnSeconds: 60 }]);
        expect(chat).toEqual(["Ann: hello", ": Turn 2"]);
        expect(room.chat.map((l) => l.text)).toEqual(["hello", "Turn 2"]);
    }));
    it("saves and restores rooms, and players rejoin their seats", () => __awaiter(void 0, void 0, void 0, function* () {
        const network = new FakeNetwork();
        let saved;
        const server = makeServer(network, () => {
            saved = server.save(server.rooms.values().next().value);
        });
        const a = player(network, "a");
        const { code } = yield a.client.create("Ann", { start: 3 });
        a.client.send({ add: 2 });
        yield settle();
        expect(saved === null || saved === void 0 ? void 0 : saved.seq).toBe(1);
        // A new server process restores the room from its save
        const network2 = new FakeNetwork();
        const server2 = makeServer(network2);
        server2.restore(JSON.parse(JSON.stringify(saved)), (snapshot) => (Object.assign({}, snapshot)));
        const a2 = player(network2, "a2", a.store);
        const welcome = yield a2.client.join(code, "Ann");
        expect(welcome.seat).toBe(0);
        expect(welcome.seq).toBe(1);
        expect(welcome.snapshot.total).toBe(5);
        expect(server2.room(code).host).toBe(0);
    }));
});
