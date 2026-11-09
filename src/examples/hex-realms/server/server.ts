import crypto from "crypto";
import fs from "fs";
import http from "http";
import path from "path";
import websocket from "websocket";
import { IgeRoomServer, type IgeRoomServerTransport, type IgeSavedRoom, type IgeServerRoom } from "@/engine/network/rooms/IgeRoomServer";
import type { IgeRoomClientMessage, IgeRoomServerMessage } from "@/engine/network/rooms/igeRoomProtocol";
import { DEFAULT_PORT, type OnlineCommand, type RoomOptions, SOCKET_PATH, type TimerCommand, type TimerInfo, TURN_TIMERS } from "../net/protocol";
import { runAiTurn } from "../sim/ai";
import { Sim } from "../sim/sim";
import type { Command } from "../sim/types";

/**
 * The Hex Realms game server, on the engine's game rooms (IgeRoomServer,
 * see guides/online-rooms.md) over a plain WebSocket.
 *
 * Each game is a room with a short code and one seat per civ. The room
 * holds the authoritative simulation: every command, from a person or the
 * AI, is checked and applied here and then sent to everyone in order; each
 * client applies the same stream to its own copy. Seats are kept across
 * reconnects (seat tokens); a civ nobody holds is played by the AI. Turns
 * wait for absent players unless a turn timer runs out, in which case the
 * AI plays that turn. Rooms are saved to disk after every change.
 *
 * It also serves the built client, so one port does everything:
 *
 *     npx webpack --config src/examples/hex-realms/server/webpack.server.cjs
 *     node dist/hex-realms-server/server.cjs [--port 8650] [--static dist/esm] [--data hex-realms-games]
 *
 * then open http://localhost:8650/ (it redirects to the game).
 */

type Room = IgeServerRoom<Sim, OnlineCommand>;

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------

function arg (name: string, fallback: string): string {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : process.env[`HEXREALMS_${name.toUpperCase()}`] ?? fallback;
}

const PORT = Number(arg("port", String(DEFAULT_PORT)));
const STATIC_ROOT = path.resolve(arg("static", "dist/esm"));
const DATA_DIR = path.resolve(arg("data", "hex-realms-games"));
const GAME_PAGE = "/examples/hex-realms/index.html";
/** Largest map an online game may use (bigger snapshots are slow to send). */
const MAX_TILES = 128 * 80;
/** Marks the seat of a destroyed civ so nobody joins as it. */
const GONE = "eliminated";

function log (...parts: unknown[]): void {
	console.log(new Date().toISOString(), ...parts);
}

// ------------------------------------------------------------------
// Transport: room messages as JSON over the websocket package
// ------------------------------------------------------------------

const connections = new Map<string, websocket.connection>();
let deliver: ((clientId: string, message: IgeRoomClientMessage) => void) | undefined;
let dropped: ((clientId: string) => void) | undefined;

const transport: IgeRoomServerTransport = {
	send: (clientId, message: IgeRoomServerMessage) => {
		const conn = connections.get(clientId);
		if (conn?.connected) conn.sendUTF(JSON.stringify(message));
	},
	listen: (onMessage, onDisconnect) => {
		deliver = onMessage;
		dropped = onDisconnect;
	}
};

// ------------------------------------------------------------------
// Rooms
// ------------------------------------------------------------------

/** True while the server itself applies a command (seat changes, the AI, timers). */
let trusted = false;

function validateOptions (o: RoomOptions | undefined): string | void {
	const game = o?.game;
	if (!game || typeof game !== "object") return "Missing game options";
	if (!(game.width >= 16 && game.height >= 12) || game.width * game.height > MAX_TILES) return "That map size isn't available online";
	if (!(game.players >= 2 && game.players <= 12)) return "Online games need 2 to 12 civs";
}

const rooms = new IgeRoomServer<Sim, OnlineCommand, RoomOptions>(transport, {
	seats: (o) => o.game.players,
	createState: (o) => {
		const sim = Sim.create({ ...o.game, humans: [0] });
		sim.drainEvents();
		return sim;
	},
	validateOptions,
	applyCommand: (room, seat, command) => applyCommand(room, seat, command),
	snapshot: (room) => room.state.serialize(),
	onChange: (room) => {
		scheduleSave(room);
		scheduleUpkeep(room);
	}
});

function timers (room: Room): TimerInfo {
	const info = room.info as TimerInfo | null;
	if (info && typeof info === "object" && "turnSeconds" in info) return info;
	const fresh: TimerInfo = { turnSeconds: (room.options as RoomOptions | undefined)?.turnSeconds ?? 0, seatSeconds: {}, deadline: 0 };
	room.info = fresh;
	return fresh;
}

/** Apply a command from the server (a seat change, the AI, a timer running out), broadcast like a player's. */
function serverApply (room: Room, seat: number, command: OnlineCommand): boolean {
	trusted = true;
	try {
		return !room.apply(seat, command);
	} finally {
		trusted = false;
	}
}

function applyCommand (room: Room, seat: number, command: OnlineCommand): string | void {
	if (!command || typeof command !== "object" || typeof command.type !== "string") return "Bad command";
	if (command.type === "timer") return setTimer(room, seat, command);
	if (command.type === "seat" && !trusted) return "Only the server changes seats";
	const sim = room.state;
	let result;
	try {
		result = sim.apply(seat, command as Command);
	} catch (error) {
		log(`Command failed in ${room.code}:`, command, error);
		return "The server couldn't apply that";
	}
	sim.drainEvents();
	if (!result.ok) return result.error ?? "Can't do that";
}

// ------------------------------------------------------------------
// Seats, the AI and turn timers
// ------------------------------------------------------------------

const upkeepQueued = new Set<Room>();
const aiRunning = new Set<Room>();

/**
 * Soon (once the message being handled has gone out to everyone): sync
 * seats with the game, play AI turns, arm the turn clock.
 */
function scheduleUpkeep (room: Room): void {
	if (upkeepQueued.has(room) || aiRunning.has(room)) return;
	upkeepQueued.add(room);
	setImmediate(() => {
		upkeepQueued.delete(room);
		if (rooms.room(room.code) !== room) return;
		syncSeats(room);
		runAis(room);
		armTimer(room);
	});
}

/**
 * A seat held by a person makes its civ human; one nobody holds is the AI's.
 * Only a change that went through is announced: an announcement is a room
 * change, which schedules this again, so announcing a refused change looped
 * forever (a finished game refuses every command, seat changes included).
 */
function syncSeats (room: Room): void {
	const sim = room.state;
	if (sim.state.winner) return; // a finished game's seats no longer matter
	for (const p of sim.state.players) {
		const seat = room.seats[p.index];
		if (!seat) continue;
		if (!p.alive) {
			if (seat.token !== GONE) {
				seat.token = GONE;
				seat.name = "";
			}
			continue;
		}
		const held = !!seat.token && seat.token !== GONE;
		if (held === p.human) continue;
		if (!serverApply(room, p.index, { type: "seat", player: p.index, human: held })) {
			log(`${room.code}: couldn't change who plays ${p.name}`);
			continue;
		}
		room.say(held ? `${seat.name} plays ${p.name}.` : `${p.name} is now played by the AI.`);
		log(`${room.code}: ${p.name} is now ${held ? `played by ${seat.name}` : "the AI's"}`);
	}
}

/** Play AI turns until a person is to move (or the game ends). */
function runAis (room: Room): void {
	if (aiRunning.has(room)) return;
	aiRunning.add(room);
	try {
		const sim = room.state;
		let guard = sim.playerCount * (sim.options.turnLimit + 2) * 2;
		while (!sim.state.winner && !sim.isHuman(sim.current) && guard-- > 0) {
			const p = sim.current;
			runAiTurn(sim, p, (command) => serverApply(room, p, command));
			if (sim.current === p && !sim.state.winner) serverApply(room, p, { type: "endTurn" });
		}
	} finally {
		aiRunning.delete(room);
	}
}

const clocks = new Map<Room, { key: string; timer: ReturnType<typeof setTimeout> }>();

function secondsFor (room: Room, player: number): number {
	const t = timers(room);
	return t.seatSeconds[player] ?? t.turnSeconds;
}

/** Start the clock for a person's turn when their timer is set (a running clock for this turn keeps going unless `restart`). */
function armTimer (room: Room, restart = false): void {
	const sim = room.state;
	const t = timers(room);
	const key = `${sim.state.turn}:${sim.current}`;
	const seconds = secondsFor(room, sim.current);
	const wanted = seconds > 0 && !sim.state.winner && sim.isHuman(sim.current);
	const running = clocks.get(room);
	if (wanted && running && running.key === key && !restart) return;
	if (running) clearTimeout(running.timer);
	clocks.delete(room);
	let deadline = 0;
	if (wanted) {
		const player = sim.current, turn = sim.state.turn;
		deadline = Date.now() + seconds * 1000;
		clocks.set(room, { key, timer: setTimeout(() => timeUp(room, player, turn), seconds * 1000) });
	}
	if (deadline !== t.deadline || restart) room.setInfo({ ...t, deadline });
}

/** A person's time ran out: the AI plays the rest of their turn. */
function timeUp (room: Room, player: number, turn: number): void {
	clocks.delete(room);
	const sim = room.state;
	if (sim.current !== player || sim.state.turn !== turn || sim.state.winner) return;
	const name = room.seats[player]?.name || sim.player(player).name;
	log(`Time ran out for ${name} in ${room.code}`);
	room.say(`Time ran out for ${name}: the AI played their turn.`);
	runAiTurn(sim, player, (command) => serverApply(room, player, command));
	if (sim.current === player && !sim.state.winner) serverApply(room, player, { type: "endTurn" });
	scheduleUpkeep(room);
}

/** The timer command: the host sets the game's timer and anyone's; players their own. */
function setTimer (room: Room, seat: number, command: TimerCommand): string | void {
	const t = timers(room);
	const seconds = Number(command.seconds);
	const civ = command.player === undefined ? undefined : Number(command.player);
	const who = room.seats[seat]?.name || "The host";
	const minutes = (s: number) => `${s / 60} minute${s === 60 ? "" : "s"}`;
	const seatSeconds = { ...t.seatSeconds };
	let turnSeconds = t.turnSeconds;
	if (civ === undefined) {
		if (seat !== room.host) return "Only the host sets the game's turn timer";
		if (!TURN_TIMERS.includes(seconds)) return "Unknown timer";
		turnSeconds = seconds;
		room.say(seconds ? `${who} set the game's turn timer to ${minutes(seconds)}: when a turn's time runs out, the AI plays it.` : `${who} turned the game's turn timer off.`);
	} else {
		if (!room.state.state.players[civ]) return "Unknown civ";
		if (seat !== room.host && seat !== civ) return "Only the host can set another player's timer";
		if (seconds !== -1 && !TURN_TIMERS.includes(seconds)) return "Unknown timer";
		if (seconds === -1) delete seatSeconds[civ];
		else seatSeconds[civ] = seconds;
		const target = room.seats[civ]?.name || room.state.player(civ).name;
		const whose = seat === civ ? `${who} set their own turn timer` : `${who} set ${target}'s turn timer`;
		room.say(seconds === -1 ? `${whose} back to the game's.` : seconds ? `${whose} to ${minutes(seconds)}.` : `${whose} to no limit.`);
	}
	room.setInfo({ ...t, turnSeconds, seatSeconds });
	// Restart the running clock only if the change applies to whoever is playing now
	const now = room.state.current;
	const restart = civ === undefined ? seatSeconds[now] === undefined : civ === now;
	setImmediate(() => armTimer(room, restart));
}

// ------------------------------------------------------------------
// Saving
// ------------------------------------------------------------------

const saveTimers = new Map<Room, ReturnType<typeof setTimeout>>();

function roomFile (code: string): string {
	return path.join(DATA_DIR, `${code.replace(/[^A-Z]/g, "")}.json`);
}

function saveRoom (room: Room): void {
	clearTimeout(saveTimers.get(room));
	saveTimers.delete(room);
	fs.mkdirSync(DATA_DIR, { recursive: true });
	const file = roomFile(room.code);
	fs.writeFileSync(`${file}.tmp`, JSON.stringify(rooms.save(room)));
	fs.renameSync(`${file}.tmp`, file);
}

function scheduleSave (room: Room): void {
	if (!saveTimers.has(room)) saveTimers.set(room, setTimeout(() => saveRoom(room), 1000));
}

/** Games saved by the server before it used the engine's rooms. */
interface OldSave {
	code: string;
	seq: number;
	seats: { player: number; name: string; token: string; left?: boolean }[];
	snapshot: string;
	chat?: { from: number; name: string; text: string; time: number }[];
	turnSeconds?: number;
	seatSeconds?: Record<number, number>;
}

function upgradeSave (data: IgeSavedRoom | OldSave): IgeSavedRoom {
	if ("host" in data) return data;
	const state = JSON.parse(data.snapshot).state;
	const seats = state.players.map((_: unknown, i: number) => {
		const s = data.seats.find((x) => x.player === i && !x.left);
		return { seat: i, name: s?.name ?? "", token: s?.token };
	});
	const info: TimerInfo = { turnSeconds: data.turnSeconds ?? 0, seatSeconds: data.seatSeconds ?? {}, deadline: 0 };
	const options: RoomOptions = { game: state.options, turnSeconds: data.turnSeconds ?? 0 };
	return {
		code: data.code,
		seq: data.seq,
		seats,
		host: 0,
		snapshot: data.snapshot,
		info,
		chat: (data.chat ?? []).map((l) => ({ seat: l.from, name: l.name, text: l.text, time: l.time })),
		options
	};
}

/** Bring back every saved game (they keep their codes and seats). */
function restoreRooms (): void {
	if (!fs.existsSync(DATA_DIR)) return;
	for (const name of fs.readdirSync(DATA_DIR)) {
		if (!name.endsWith(".json")) continue;
		try {
			const saved = upgradeSave(JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8")));
			const room = rooms.restore(saved, (snapshot) => Sim.load(snapshot as string));
			log(`Restored game ${room.code} (turn ${room.state.state.turn})`);
			scheduleUpkeep(room);
		} catch (error) {
			log(`Couldn't restore ${name}:`, error);
		}
	}
}

// ------------------------------------------------------------------
// HTTP: the built client, plus the WebSocket endpoint
// ------------------------------------------------------------------

const TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".glb": "model/gltf-binary",
	".gltf": "model/gltf+json",
	".wasm": "application/wasm",
	".map": "application/json"
};

const httpServer = http.createServer((req, res) => {
	const url = new URL(req.url ?? "/", "http://localhost");
	if (url.pathname === "/" || url.pathname === "/hexrealms") {
		res.writeHead(302, { Location: GAME_PAGE });
		res.end();
		return;
	}
	const file = path.resolve(STATIC_ROOT, `.${decodeURIComponent(url.pathname)}`);
	if (!file.startsWith(STATIC_ROOT + path.sep)) {
		res.writeHead(403);
		res.end("Forbidden");
		return;
	}
	fs.stat(file, (err, stat) => {
		if (err || !stat.isFile()) {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not found");
			return;
		}
		res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-cache" });
		fs.createReadStream(file).pipe(res);
	});
});

const socketServer = new websocket.server({ httpServer, autoAcceptConnections: false, maxReceivedFrameSize: 256 * 1024, maxReceivedMessageSize: 256 * 1024 });

socketServer.on("request", (request) => {
	if (request.resourceURL.pathname !== SOCKET_PATH) {
		request.reject(404, "Unknown endpoint");
		return;
	}
	const conn = request.accept(null, request.origin);
	const id = crypto.randomUUID();
	connections.set(id, conn);
	conn.on("message", (message) => {
		if (message.type !== "utf8") return;
		let msg: IgeRoomClientMessage;
		try {
			msg = JSON.parse(message.utf8Data) as IgeRoomClientMessage;
		} catch {
			transport.send(id, { t: "error", error: "Bad message" });
			return;
		}
		deliver?.(id, msg);
	});
	conn.on("close", () => {
		connections.delete(id);
		dropped?.(id);
	});
});

restoreRooms();
httpServer.listen(PORT, () => {
	log(`Hex Realms server on http://localhost:${PORT}${GAME_PAGE}`);
	log(`Serving ${STATIC_ROOT}; games are saved in ${DATA_DIR}`);
});

function shutdown (): void {
	for (const room of [...saveTimers.keys()]) saveRoom(room);
	process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
