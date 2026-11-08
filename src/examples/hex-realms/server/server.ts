import crypto from "crypto";
import fs from "fs";
import http from "http";
import path from "path";
import websocket from "websocket";
import { type ChatLine, type ClientMessage, DEFAULT_PORT, type RoomInfo, type ServerMessage, SOCKET_PATH, TURN_TIMERS } from "../net/protocol";
import { runAiTurn } from "../sim/ai";
import { Sim } from "../sim/sim";
import type { Command, GameOptions } from "../sim/types";

/**
 * The Hex Realms game server.
 *
 * Each game lives in a room with a short code. The server holds the
 * authoritative simulation and runs the AI civs; every accepted command,
 * and every change of who sits in a seat, goes out to all connected
 * players with a sequence number, and each client applies the same stream
 * to its own copy of the deterministic simulation. Turns are sequential, so
 * people can leave and come back (by code, or automatically with the seat
 * token their browser keeps); a seat stays theirs while they're away and
 * the game waits for them, unless the host has set a turn timer, in which
 * case the AI plays a turn whose time runs out. Players can chat, and can
 * leave a game for good (the AI takes their civ until they come back).
 * Rooms are saved to disk after every change.
 *
 * It also serves the built client, so one port does everything:
 *
 *     npx webpack --config src/examples/hex-realms/server/webpack.server.cjs
 *     node dist/hex-realms-server/server.cjs [--port 8650] [--static dist/esm] [--data hex-realms-games]
 *
 * then open http://localhost:8650/ (it redirects to the game).
 */

interface Seat {
	player: number;
	name: string;
	token: string;
	/** Left the game: the AI plays this civ until the player comes back. */
	left?: boolean;
}

interface Room {
	code: string;
	sim: Sim;
	seq: number;
	seats: Seat[];
	clients: Set<Client>;
	saveTimer?: ReturnType<typeof setTimeout>;
	chat: ChatLine[];
	/** The civ whose player hosts (sets the turn timer). */
	host: number;
	turnSeconds: number;
	deadline: number;
	turnTimer?: ReturnType<typeof setTimeout>;
	/** "turn:player" the running clock is for. */
	timerFor?: string;
}

interface Client {
	conn: websocket.connection;
	room?: Room;
	player: number;
}

interface SavedRoom {
	code: string;
	seq: number;
	seats: Seat[];
	snapshot: string;
	chat?: ChatLine[];
	turnSeconds?: number;
}

/** Chat lines kept per game. */
const CHAT_HISTORY = 100;

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

const rooms = new Map<string, Room>();

function log (...parts: unknown[]): void {
	console.log(new Date().toISOString(), ...parts);
}

// ------------------------------------------------------------------
// Rooms
// ------------------------------------------------------------------

/** Five letters without easily confused ones, e.g. "KTRWM". */
function newCode (): string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
	for (;;) {
		let code = "";
		for (let i = 0; i < 5; i++) code += letters[crypto.randomInt(letters.length)];
		if (!rooms.has(code) && !fs.existsSync(roomFile(code))) return code;
	}
}

function roomFile (code: string): string {
	return path.join(DATA_DIR, `${code.replace(/[^A-Z]/g, "")}.json`);
}

function openRoom (code: string, sim: Sim, seq: number, seats: Seat[], chat: ChatLine[] = [], turnSeconds = 0): Room {
	const room: Room = { code, sim, seq, seats, clients: new Set(), chat, host: 0, turnSeconds, deadline: 0 };
	// Every successful command, human or AI, is broadcast in order
	sim.onApplied = (player, command) => {
		room.seq++;
		broadcast(room, { t: "applied", seq: room.seq, player, command });
		scheduleSave(room);
	};
	rooms.set(code, room);
	return room;
}

function loadRoom (code: string): Room | undefined {
	const existing = rooms.get(code);
	if (existing) return existing;
	const file = roomFile(code);
	if (!fs.existsSync(file)) return undefined;
	try {
		const saved = JSON.parse(fs.readFileSync(file, "utf8")) as SavedRoom;
		log(`Loaded game ${code} (turn ${JSON.parse(saved.snapshot).state?.turn ?? "?"})`);
		const room = openRoom(saved.code, Sim.load(saved.snapshot), saved.seq, saved.seats, saved.chat ?? [], saved.turnSeconds ?? 0);
		armTimer(room);
		return room;
	} catch (error) {
		log(`Couldn't load game ${code}:`, error);
		return undefined;
	}
}

function saveRoom (room: Room): void {
	clearTimeout(room.saveTimer);
	room.saveTimer = undefined;
	const saved: SavedRoom = { code: room.code, seq: room.seq, seats: room.seats, snapshot: room.sim.serialize(), chat: room.chat, turnSeconds: room.turnSeconds };
	fs.mkdirSync(DATA_DIR, { recursive: true });
	const file = roomFile(room.code);
	fs.writeFileSync(`${file}.tmp`, JSON.stringify(saved));
	fs.renameSync(`${file}.tmp`, file);
}

function scheduleSave (room: Room): void {
	if (!room.saveTimer) room.saveTimer = setTimeout(() => saveRoom(room), 1000);
}

function names (room: Room): string[] {
	return room.sim.state.players.map((p) => room.seats.find((s) => s.player === p.index)?.name ?? (p.human ? "Player" : "AI"));
}

function send (client: Client, msg: ServerMessage): void {
	if (client.conn.connected) client.conn.sendUTF(JSON.stringify(msg));
}

function broadcast (room: Room, msg: ServerMessage): void {
	const text = JSON.stringify(msg);
	for (const c of room.clients) if (c.conn.connected) c.conn.sendUTF(text);
}

/** Seats, presence and the timer, for every client. */
function roomInfo (room: Room): RoomInfo {
	const sim = room.sim;
	const online = sim.state.players.map((p) => [...room.clients].some((c) => c.player === p.index && c.conn.connected));
	const people = sim.state.players.map((p) => (p.human ? room.seats.find((s) => s.player === p.index && !s.left)?.name ?? "" : ""));
	return { names: people, online, host: room.host, turnSeconds: room.turnSeconds, deadline: room.deadline };
}

function broadcastRoom (room: Room): void {
	broadcast(room, { t: "room", room: roomInfo(room) });
}

/** A chat line, from a player or (from -1) the server. */
function say (room: Room, from: number, name: string, text: string): void {
	const line: ChatLine = { from, name, text, time: Date.now() };
	room.chat.push(line);
	if (room.chat.length > CHAT_HISTORY) room.chat.splice(0, room.chat.length - CHAT_HISTORY);
	broadcast(room, { t: "chat", line });
	scheduleSave(room);
}

/**
 * Start the clock for a person's turn when the host has set a turn timer (a
 * clock already running for this turn keeps going unless `restart`).
 */
function armTimer (room: Room, restart = false): void {
	const sim = room.sim;
	const key = `${sim.state.turn}:${sim.current}`;
	const wanted = room.turnSeconds > 0 && !sim.state.winner && sim.isHuman(sim.current);
	if (wanted && room.turnTimer && room.timerFor === key && !restart) {
		broadcastRoom(room);
		return;
	}
	clearTimeout(room.turnTimer);
	room.turnTimer = undefined;
	room.timerFor = undefined;
	room.deadline = 0;
	if (wanted) {
		const player = sim.current, turn = sim.state.turn;
		room.deadline = Date.now() + room.turnSeconds * 1000;
		room.timerFor = key;
		room.turnTimer = setTimeout(() => timeUp(room, player, turn), room.turnSeconds * 1000);
	}
	broadcastRoom(room);
}

/** A person's time ran out: the AI plays the rest of their turn. */
function timeUp (room: Room, player: number, turn: number): void {
	const sim = room.sim;
	if (sim.current !== player || sim.state.turn !== turn || sim.state.winner) return;
	const name = room.seats.find((s) => s.player === player && !s.left)?.name ?? sim.player(player).name;
	log(`Time ran out for ${name} in ${room.code}`);
	say(room, -1, "", `Time ran out for ${name}: the AI played their turn.`);
	runAiTurn(sim, player);
	if (sim.current === player && !sim.state.winner) sim.apply(player, { type: "endTurn" });
	sim.drainEvents();
	runAis(room);
	armTimer(room);
}

function setSeat (room: Room, player: number, human: boolean, name: string): void {
	room.sim.state.players[player].human = human;
	room.seq++;
	broadcast(room, { t: "seat", seq: room.seq, player, human, name });
	scheduleSave(room);
}

function welcome (client: Client, room: Room, seat: Seat): void {
	client.room = room;
	client.player = seat.player;
	room.clients.add(client);
	send(client, { t: "welcome", code: room.code, player: seat.player, token: seat.token, snapshot: room.sim.serialize(), seq: room.seq, names: names(room), room: roomInfo(room), chat: room.chat });
	broadcastRoom(room);
}

/** Play AI turns until a person is to move (or the game ends). */
function runAis (room: Room): void {
	const sim = room.sim;
	let guard = sim.playerCount * (sim.options.turnLimit + 2) * 2;
	while (!sim.state.winner && !sim.isHuman(sim.current) && guard-- > 0) {
		const p = sim.current;
		runAiTurn(sim, p);
		if (sim.current === p && !sim.state.winner) sim.apply(p, { type: "endTurn" });
		sim.drainEvents();
	}
	sim.drainEvents();
}

// ------------------------------------------------------------------
// Messages
// ------------------------------------------------------------------

function validOptions (o: GameOptions | undefined): string | null {
	if (!o || typeof o !== "object") return "Missing game options";
	if (!(o.width >= 16 && o.height >= 12) || o.width * o.height > MAX_TILES) return "That map size isn't available online";
	if (!(o.players >= 2 && o.players <= 12)) return "Online games need 2 to 12 civs";
	return null;
}

function cleanName (name: unknown): string {
	return String(name ?? "Player").replace(/[<>&"]/g, "").trim().slice(0, 24) || "Player";
}

function onMessage (client: Client, msg: ClientMessage): void {
	switch (msg.t) {
		case "host": {
			const problem = validOptions(msg.options);
			if (problem) return send(client, { t: "error", error: problem });
			const options: GameOptions = { ...msg.options, humans: [0] };
			const sim = Sim.create(options);
			sim.drainEvents();
			const code = newCode();
			const seat: Seat = { player: 0, name: cleanName(msg.name), token: crypto.randomUUID() };
			const turnSeconds = TURN_TIMERS.includes(Number(msg.turnSeconds)) ? Number(msg.turnSeconds) : 0;
			const room = openRoom(code, sim, 0, [seat], [], turnSeconds);
			log(`${seat.name} hosted ${code}: ${options.width}x${options.height}, ${options.players} civs, seed ${options.seedText || options.seed}`);
			welcome(client, room, seat);
			runAis(room);
			armTimer(room);
			saveRoom(room);
			return;
		}
		case "join": {
			const code = String(msg.code ?? "").toUpperCase();
			const room = loadRoom(code);
			if (!room) return send(client, { t: "error", error: `There is no game ${code}` });
			const name = cleanName(msg.name);
			// Returning to your seat with the token your browser kept
			let seat = msg.token ? room.seats.find((s) => s.token === msg.token) : undefined;
			if (seat && seat.left) {
				// Back after leaving: reclaim the civ if the AI still has it
				const civ = room.sim.state.players[seat.player];
				if (civ.alive && !civ.human) {
					seat.left = false;
					setSeat(room, seat.player, true, seat.name);
					say(room, -1, "", `${seat.name} is back as ${civ.name}.`);
				} else {
					room.seats = room.seats.filter((s) => s !== seat);
					seat = undefined;
				}
			}
			if (seat) {
				log(`${seat.name} rejoined ${code}`);
				welcome(client, room, seat);
				armTimer(room);
				return;
			}
			// Otherwise take over a living AI civ
			const free = room.sim.state.players.find((p) => p.alive && !p.human);
			if (!free) return send(client, { t: "error", error: `Game ${code} has no free seats` });
			seat = { player: free.index, name, token: crypto.randomUUID() };
			room.seats.push(seat);
			setSeat(room, free.index, true, name);
			log(`${name} joined ${code} as ${free.name}`);
			welcome(client, room, seat);
			say(room, -1, "", `${name} joined as ${free.name}.`);
			armTimer(room);
			return;
		}
		case "command": {
			const room = client.room;
			if (!room) return send(client, { t: "error", error: "Join a game first" });
			const command = msg.command as Command;
			if (!command || typeof command !== "object" || typeof command.type !== "string") return send(client, { t: "error", error: "Bad command" });
			let result;
			try {
				result = room.sim.apply(client.player, command);
			} catch (error) {
				log(`Command failed in ${room.code}:`, command, error);
				result = { ok: false, error: "The server couldn't apply that" };
			}
			room.sim.drainEvents();
			if (!result.ok) return send(client, { t: "error", error: result.error ?? "Can't do that" });
			if (command.type === "endTurn") {
				runAis(room);
				armTimer(room);
			}
			return;
		}
		case "chat": {
			const room = client.room;
			if (!room) return send(client, { t: "error", error: "Join a game first" });
			const text = String(msg.text ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 300);
			if (!text) return;
			const seat = room.seats.find((s) => s.player === client.player && !s.left);
			say(room, client.player, seat?.name ?? "Player", text);
			return;
		}
		case "timer": {
			const room = client.room;
			if (!room) return send(client, { t: "error", error: "Join a game first" });
			if (client.player !== room.host) return send(client, { t: "error", error: "Only the host sets the turn timer" });
			const seconds = Number(msg.seconds);
			if (!TURN_TIMERS.includes(seconds)) return send(client, { t: "error", error: "Unknown timer" });
			room.turnSeconds = seconds;
			const seat = room.seats.find((s) => s.player === client.player && !s.left);
			armTimer(room, true);
			say(room, -1, "", seconds ? `${seat?.name ?? "The host"} set a turn timer of ${seconds / 60} minute${seconds === 60 ? "" : "s"}: when it runs out, the AI plays the turn.` : `${seat?.name ?? "The host"} turned the turn timer off.`);
			scheduleSave(room);
			return;
		}
		case "leave": {
			const room = client.room;
			if (!room) return;
			const seat = room.seats.find((s) => s.player === client.player && !s.left);
			if (seat) {
				seat.left = true;
				setSeat(room, seat.player, false, seat.name);
				say(room, -1, "", `${seat.name} left: the AI plays ${room.sim.player(seat.player).name} until they come back.`);
				log(`${seat.name} left ${room.code}`);
			}
			room.clients.delete(client);
			client.room = undefined;
			runAis(room);
			armTimer(room);
			return;
		}
		default:
			send(client, { t: "error", error: "Unknown message" });
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
	const client: Client = { conn, player: -1 };
	conn.on("message", (message) => {
		if (message.type !== "utf8") return;
		let msg: ClientMessage;
		try {
			msg = JSON.parse(message.utf8Data) as ClientMessage;
		} catch {
			return send(client, { t: "error", error: "Bad message" });
		}
		onMessage(client, msg);
	});
	conn.on("close", () => {
		const room = client.room;
		if (!room) return;
		room.clients.delete(client);
		broadcastRoom(room);
	});
});

httpServer.listen(PORT, () => {
	log(`Hex Realms server on http://localhost:${PORT}${GAME_PAGE}`);
	log(`Serving ${STATIC_ROOT}; games are saved in ${DATA_DIR}`);
});

function shutdown (): void {
	for (const room of rooms.values()) {
		clearTimeout(room.turnTimer);
		if (room.saveTimer) saveRoom(room);
	}
	process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
