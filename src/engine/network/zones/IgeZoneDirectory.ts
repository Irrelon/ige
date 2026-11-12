import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { signTicket } from "@/engine/network/zones/igeZoneTicket";
import { igeZoneIdValid, type IgeZoneLauncher } from "@/engine/network/zones/IgeZoneLauncher";
import { igeLayerZone, igeZoneLayer, type IgeZoneLayering } from "@/engine/network/zones/igeZoneLayers";

/**
 * Where a player enters the game (the game's say: their saved place), and
 * what their ticket carries. With layers on, `zone` is placed into one of
 * its layers (the one most of `companions` are in, else one with room),
 * unless `exact` (a zone that still has them: a reconnect).
 */
export interface IgeZoneEntry {
	zone: string;
	data?: unknown;
	/** Players to be put with (friends, party, guild), by the names zones report them by (IgeZoneHost `who`). */
	companions?: string[];
	exact?: boolean;
}

export interface IgeZoneDirectoryOptions {
	launcher: IgeZoneLauncher;
	/** The secret zones share with the directory (tickets, and the zones' own requests). */
	secret: string;
	/**
	 * Which zone a player enters at (`body`: the whole /enter request, for
	 * anything the game checks: a session, a password...). Return the zone,
	 * or a string to turn them away. The directory takes `player` from the
	 * request as given: checking it's really them (a session token in the
	 * body) is the game's job, here.
	 */
	resolveEntry: (player: string, body: Record<string, unknown>) => IgeZoneEntry | string | Promise<IgeZoneEntry | string>;
	/** A zone with nobody in it for this long is stopped (ms, default 60000). */
	idleMs?: number;
	/** A zone that hasn't sent a heartbeat for this long is taken for gone, and forgotten (ms, default 15000). */
	heartbeatTimeoutMs?: number;
	/** How long a starting zone gets to register (ms, default 20000). */
	startTimeoutMs?: number;
	/** How long an entry ticket is good for (seconds, default 30). */
	ticketTtl?: number;
	/** Where zones reach the directory (DIRECTORY_URL; default its own address once listening). */
	directoryUrl?: string;
	/** Extra environment for every zone the directory starts. */
	env?: Record<string, string>;
	/**
	 * Pages on other origins allowed to call /enter and the game's own
	 * routes (a browser game served from elsewhere): a list of origins, or
	 * "*". Default: none. Never the zones' routes.
	 */
	cors?: string[] | "*";
	/**
	 * The game's own HTTP routes on the directory's server (sign-in, say):
	 * called first for every request outside /zones (the directory's control
	 * plane, always its own). Return true once it's answered the request;
	 * false (without reading the body) leaves it to the directory. Pages the
	 * `cors` option allows get CORS headers before it's called (it may set
	 * its own), and a preflight it doesn't answer is answered for it.
	 */
	route?: (req: IncomingMessage, res: ServerResponse) => boolean | Promise<boolean>;
	/**
	 * Layers (igeZoneLayers): a zone with `capacity` players in it gets
	 * another copy of itself for the next to arrive, and quiet layers are
	 * merged back. Off without it (every player of a zone in the one zone).
	 */
	layers?: IgeZoneLayering;
	/** Clock (ms), for tests. */
	now?: () => number;
}

export type IgeZoneState = "starting" | "running";

/** What the directory knows of a zone. */
export interface IgeZoneRecord {
	zone: string;
	state: IgeZoneState;
	url?: string;
	players: number;
	startedAt: number;
	lastHeartbeat: number;
	/** Since when it's had nobody in it (undefined: someone's there). */
	emptySince?: number;
	/** Who's in it (names, as its heartbeats say: for putting companions together). */
	who?: string[];
	/** Places given to players on their way in (name → until when it holds), not yet in its heartbeats. */
	reserved?: Record<string, number>;
	/** A layer being merged into another (that zone): nobody's placed in it, and its players are handed over. */
	draining?: string;
}

interface Starting {
	promise: Promise<string>;
	resolve: (url: string) => void;
	reject: (error: Error) => void;
	timer?: ReturnType<typeof setTimeout>;
}

const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };

/**
 * The control plane for zone servers (Node only): it knows which zones are
 * running and where, starts them through a launcher when a player needs
 * one, stops them when they've been empty a while, and forgets (and so
 * restarts on demand) any that stop sending heartbeats. Game traffic never
 * goes through it: players connect straight to their zone with a ticket.
 *
 * HTTP (JSON bodies):
 * - `POST /enter { player, ... }`: the game's resolveEntry says which zone;
 *   it's started if need be → `{ zone, url, ticket }`.
 * - `POST /zones/ensure { zone, place?, player?, companions? }`: a zone
 *   handing a player on (with the secret as a bearer token) → `{ url, zone }`
 *   once the zone's up (`place`: into one of its layers, as /enter does).
 * - `POST /zones/register { zone, url }` and `POST /zones/heartbeat
 *   { zone, players, url?, who? }`: from zones (with the secret); a
 *   heartbeat's answer says `drain` (another layer) when this one's to be
 *   merged into it.
 *
 * Layers (`layers`, igeZoneLayers): a busy zone runs as several copies;
 * players are placed with their companions where possible, and quiet
 * layers drain into one another.
 * - `GET /zones`: every zone, for operators.
 * - Anything else the game's `route` answers (its sign-in, say).
 *
 * Events: "start" (zone), "ready" (record), "stop" (zone, why: "idle",
 * "merged" or "shutdown"), "lost" (zone, why: "heartbeat" or "exit"),
 * "enter" (player, zone), "layer" (zone: a new layer opened for a busy
 * one), "drain" (zone, into: a layer merging into another).
 *
 *     const directory = new IgeZoneDirectory({ launcher, secret, resolveEntry: async (player) => ({ zone: await savedSystem(player) }) });
 *     await directory.listen(8680);
 */
export class IgeZoneDirectory extends IgeEventingClass {
	classId = "IgeZoneDirectory";
	zones = new Map<string, IgeZoneRecord>();
	_options: IgeZoneDirectoryOptions;
	_starting = new Map<string, Starting>();
	_server?: Server;
	_timer?: ReturnType<typeof setInterval>;
	_url?: string;
	_now: () => number;

	constructor (options: IgeZoneDirectoryOptions) {
		super();
		if (!options.secret) throw new Error("The zone directory needs a secret");
		this._options = options;
		this._now = options.now ?? Date.now;
		options.launcher.onExit?.((zone) => this._lost(zone, "exit"));
	}

	/** Where zones reach the directory. */
	get url (): string | undefined {
		return this._options.directoryUrl ?? this._url;
	}

	// ---- What the routes do (callable directly too: tests, an in-process game) ----

	/** A player entering the game: their zone, started if need be, and a ticket into it. */
	async enter (player: string, body: Record<string, unknown> = {}): Promise<{ zone: string; url: string; ticket: string }> {
		if (typeof player !== "string" || !player || player.length > 128) throw new IgeZoneError(400, "Who's entering?");
		const entry = await this._options.resolveEntry(player, body);
		if (typeof entry === "string") throw new IgeZoneError(403, entry);
		const zone = entry.exact ? entry.zone : this.place(entry.zone, player, entry.companions);
		const url = await this.ensure(zone);
		const ticket = signTicket({ player, zone, data: entry.data }, this._options.secret, this._options.ticketTtl ?? 30, this._now());
		this.emit("enter", player, zone);
		return { zone, url, ticket };
	}

	/**
	 * Which layer of `zone` a player goes into (layers off: `zone` itself).
	 * The layer most of their companions are in (room or not: friends stay
	 * together); else the first with room (fullest first, so layers fill
	 * rather than spread); else a new layer. Their place is held there until
	 * the zone's heartbeats count them. Layers being merged away take nobody.
	 */
	place (zone: string, player?: string, companions: string[] = []): string {
		const layering = this._options.layers;
		if (!layering) return zone;
		const { base } = igeZoneLayer(zone);
		const now = this._now();
		const layers = [...this.zones.values()].filter((r) => igeZoneLayer(r.zone).base === base && !r.draining);
		const friends = new Set(companions.map((c) => c.toLowerCase()));
		let chosen: IgeZoneRecord | undefined, most = 0;
		if (friends.size) {
			for (const r of layers) {
				const n = this._names(r, now).filter((name) => friends.has(name)).length;
				if (n > most) [chosen, most] = [r, n];
			}
		}
		if (!chosen) {
			const room = layers.filter((r) => this.load(r) < layering.capacity).sort((a, b) => this.load(b) - this.load(a) || igeZoneLayer(a.zone).layer - igeZoneLayer(b.zone).layer);
			chosen = room[0];
		}
		let id = chosen?.zone;
		if (!id) {
			// A new layer: the lowest number not in use (the base zone itself first)
			const used = new Set([...this.zones.keys()].filter((z) => igeZoneLayer(z).base === base).map((z) => igeZoneLayer(z).layer));
			let n = 0;
			while (used.has(n)) n++;
			id = igeLayerZone(base, n);
			if (n > 0) this.emit("layer", id);
		}
		if (player) this._reserve(id, player.toLowerCase(), now);
		return id;
	}

	/** How many are in a zone, or on their way into it. */
	load (record: IgeZoneRecord): number {
		const now = this._now();
		const who = new Set(record.who ?? []);
		const coming = Object.entries(record.reserved ?? {}).filter(([name, until]) => until > now && !who.has(name)).length;
		return Math.max(record.players, who.size) + coming;
	}

	/** Who's in a zone, or on their way into it (names, lower case). */
	_names (record: IgeZoneRecord, now: number): string[] {
		return [...new Set([...(record.who ?? []), ...Object.entries(record.reserved ?? {}).filter(([, until]) => until > now).map(([name]) => name)])];
	}

	_reserve (zone: string, player: string, now: number): void {
		let record = this.zones.get(zone);
		// (A zone not started yet: its record's made as it starts; the place is held from now)
		if (!record) {
			record = { zone, state: "starting", players: 0, startedAt: now, lastHeartbeat: now, emptySince: now };
			this.zones.set(zone, record);
		}
		const reserved = record.reserved ??= {};
		for (const [name, until] of Object.entries(reserved)) if (until <= now) delete reserved[name];
		reserved[player] = now + (this._options.layers?.reserveMs ?? 30000);
	}

	/** A zone that's up: started (and waited for) if it isn't. Resolves with its url. */
	ensure (zone: string): Promise<string> {
		if (!igeZoneIdValid(zone)) return Promise.reject(new IgeZoneError(400, `Not a zone id: ${zone}`));
		const record = this.zones.get(zone);
		if (record?.state === "running" && record.url) return Promise.resolve(record.url);
		const starting = this._starting.get(zone);
		if (starting) return starting.promise;
		return this._start(zone);
	}

	_start (zone: string): Promise<string> {
		let resolve!: (url: string) => void, reject!: (error: Error) => void;
		const promise = new Promise<string>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		const starting: Starting = { promise, resolve, reject };
		this._starting.set(zone, starting);
		const now = this._now();
		// (Places already held in it are kept)
		const held = this.zones.get(zone)?.reserved;
		this.zones.set(zone, { zone, state: "starting", players: 0, startedAt: now, lastHeartbeat: now, emptySince: now, ...(held ? { reserved: held } : {}) });
		this.emit("start", zone);
		const env: Record<string, string> = { ...this._options.env, ZONE_SECRET: this._options.secret };
		if (this.url) env.DIRECTORY_URL = this.url;
		this._options.launcher.start(zone, env).then(({ url }) => {
			const record = this.zones.get(zone);
			if (record && !record.url) record.url = url;
			starting.timer = setTimeout(() => this._failStart(zone, "didn't register in time"), this._options.startTimeoutMs ?? 20000);
		}, (error: Error) => this._failStart(zone, error.message));
		return promise;
	}

	_failStart (zone: string, why: string): void {
		const starting = this._starting.get(zone);
		if (!starting) return;
		this._starting.delete(zone);
		if (starting.timer) clearTimeout(starting.timer);
		this.zones.delete(zone);
		this._options.launcher.stop(zone).catch(() => undefined);
		starting.reject(new IgeZoneError(503, `Zone ${zone} ${why}`));
	}

	/** A zone is up and ready for players at `url`. */
	register (zone: string, url: string): IgeZoneRecord {
		if (!igeZoneIdValid(zone)) throw new IgeZoneError(400, `Not a zone id: ${zone}`);
		const now = this._now();
		const record = this.zones.get(zone) ?? { zone, state: "running" as IgeZoneState, players: 0, startedAt: now, lastHeartbeat: now, emptySince: now };
		record.state = "running";
		record.url = typeof url === "string" && url ? url : record.url;
		record.lastHeartbeat = now;
		this.zones.set(zone, record);
		const starting = this._starting.get(zone);
		if (starting) {
			this._starting.delete(zone);
			if (starting.timer) clearTimeout(starting.timer);
			starting.resolve(record.url ?? "");
		}
		this.emit("ready", record);
		return record;
	}

	/**
	 * A zone's still alive, with this many players (and, given, who: for
	 * placing companions together). A zone the directory had forgotten is
	 * taken back, given its url.
	 */
	heartbeat (zone: string, players: number, url?: string, who?: string[]): IgeZoneRecord | undefined {
		let record = this.zones.get(zone);
		if (!record) {
			if (!url) return;
			record = this.register(zone, url);
		}
		const now = this._now();
		record.lastHeartbeat = now;
		record.players = Math.max(0, Math.floor(Number(players) || 0));
		if (Array.isArray(who)) {
			record.who = who.filter((w) => typeof w === "string").slice(0, 2000).map((w) => w.toLowerCase());
			// (Arrived: their held places go)
			for (const name of record.who) if (record.reserved) delete record.reserved[name];
		}
		if (record.players > 0) record.emptySince = undefined;
		else record.emptySince ??= now;
		return record;
	}

	/** Every zone. */
	status (): IgeZoneRecord[] {
		return [...this.zones.values()].map((r) => ({ ...r }));
	}

	/** Stops idle zones (and drained layers), forgets silent ones, and merges quiet layers (the directory's own timer calls this every second). */
	async check (): Promise<void> {
		const now = this._now();
		const idle = this._options.idleMs ?? 60000;
		const silent = this._options.heartbeatTimeoutMs ?? 15000;
		for (const record of [...this.zones.values()]) {
			if (record.state !== "running") continue;
			if (now - record.lastHeartbeat > silent) {
				this._lost(record.zone, "heartbeat");
				this._options.launcher.stop(record.zone).catch(() => undefined);
				continue;
			}
			const empty = record.players === 0 && this.load(record) === 0;
			// A layer merged away, now empty, stops at once; anything else empty a while stops
			if (empty && record.draining) {
				this.zones.delete(record.zone);
				this.emit("stop", record.zone, "merged");
				await this._options.launcher.stop(record.zone).catch(() => undefined);
				continue;
			}
			if (empty && record.emptySince !== undefined && now - record.emptySince > idle) {
				this.zones.delete(record.zone);
				this.emit("stop", record.zone, "idle");
				await this._options.launcher.stop(record.zone).catch(() => undefined);
			}
		}
		this._merge();
	}

	/**
	 * Quiet layers merged: of a zone's running layers, the highest-numbered
	 * one with players drains into the fullest other that both fit in, well
	 * under capacity (`mergeBelow`). One merge at a time per zone; a drain
	 * whose target's gone is called off.
	 */
	_merge (): void {
		const layering = this._options.layers;
		if (!layering) return;
		const below = Math.max(1, Math.floor(layering.capacity * (layering.mergeBelow ?? 0.5)));
		const bases = new Map<string, IgeZoneRecord[]>();
		for (const r of this.zones.values()) {
			if (r.draining && !this.zones.has(r.draining)) r.draining = undefined;
			if (r.state !== "running") continue;
			const { base } = igeZoneLayer(r.zone);
			bases.set(base, [...(bases.get(base) ?? []), r]);
		}
		for (const layers of bases.values()) {
			if (layers.length < 2 || layers.some((r) => r.draining)) continue;
			const order = [...layers].sort((a, b) => igeZoneLayer(b.zone).layer - igeZoneLayer(a.zone).layer);
			for (const from of order) {
				if (igeZoneLayer(from.zone).layer === 0 || this.load(from) === 0) continue;
				const into = layers.filter((r) => r !== from && this.load(r) + this.load(from) <= below).sort((a, b) => this.load(b) - this.load(a))[0];
				if (!into) continue;
				from.draining = into.zone;
				this.emit("drain", from.zone, into.zone);
				break;
			}
		}
	}

	_lost (zone: string, why: "heartbeat" | "exit"): void {
		if (!this.zones.has(zone)) return;
		this.zones.delete(zone);
		this._failStart(zone, why === "exit" ? "exited while starting" : "stopped answering");
		this.emit("lost", zone, why);
	}

	// ---- HTTP ----

	/** Listens on a port (default host 127.0.0.1) and starts the idle and heartbeat checks. Resolves with the port. */
	listen (port: number, host: string = "127.0.0.1"): Promise<number> {
		const server = this._server = createServer((req, res) => {
			this._route(req, res).catch((error: unknown) => {
				const status = error instanceof IgeZoneError ? error.status : 500;
				if (res.headersSent) return;
				res.writeHead(status, JSON_HEADERS).end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
			});
		});
		return new Promise((resolve, reject) => {
			// The port's taken, say
			server.once("error", reject);
			server.listen(port, host, () => {
				server.off("error", reject);
				const address = server.address();
				const actual = typeof address === "object" && address ? address.port : port;
				this._url = `http://${host}:${actual}`;
				this._timer = setInterval(() => void this.check(), 1000);
				resolve(actual);
			});
		});
	}

	/** Stops listening and stops every zone. */
	async close (): Promise<void> {
		if (this._timer) clearInterval(this._timer);
		this._timer = undefined;
		await new Promise<void>((resolve) => (this._server ? this._server.close(() => resolve()) : resolve()));
		for (const zone of [...this.zones.keys()]) {
			this.zones.delete(zone);
			this.emit("stop", zone, "shutdown");
			await this._options.launcher.stop(zone).catch(() => undefined);
		}
	}

	async _route (req: IncomingMessage, res: ServerResponse): Promise<void> {
		const path = (req.url ?? "/").split("?")[0];
		// Everything under /zones is for zones and operators (with the secret);
		// the rest (/enter, the game's routes) may be called from allowed pages
		const control = path === "/zones" || path.startsWith("/zones/");
		if (!control && await this._open(req, res)) return;
		if (control && !this._authorised(req)) throw new IgeZoneError(401, "Not authorised");
		let answer: unknown;
		if (req.method === "GET" && path === "/zones") answer = { zones: this.status() };
		else if (req.method === "POST") answer = await this._post(path, await readJson(req));
		else throw new IgeZoneError(404, "Not found");
		res.writeHead(200, JSON_HEADERS).end(JSON.stringify(answer));
	}

	/** The directory's POST routes: what to answer. */
	async _post (path: string, body: Record<string, unknown>): Promise<unknown> {
		switch (path) {
			case "/enter":
				return this.enter(String(body.player ?? ""), body);
			case "/zones/ensure": {
				const asked = String(body.zone ?? "");
				const companions = Array.isArray(body.companions) ? body.companions.filter((c): c is string => typeof c === "string").slice(0, 200) : [];
				const zone = body.place ? this.place(asked, typeof body.player === "string" ? body.player : undefined, companions) : asked;
				return { url: await this.ensure(zone), zone };
			}
			case "/zones/register":
				return { ok: true, zone: this.register(String(body.zone ?? ""), String(body.url ?? "")).zone };
			case "/zones/heartbeat": {
				const record = this.heartbeat(String(body.zone ?? ""), Number(body.players) || 0, typeof body.url === "string" ? body.url : undefined, Array.isArray(body.who) ? body.who as string[] : undefined);
				return { ok: !!record, ...(record?.draining ? { drain: record.draining } : {}) };
			}
		}
		throw new IgeZoneError(404, "Not found");
	}

	/**
	 * A request outside the control plane: CORS headers for allowed pages,
	 * then the game's route, then a preflight answered. True once it's been
	 * answered.
	 */
	async _open (req: IncomingMessage, res: ServerResponse): Promise<boolean> {
		const allowed = this._options.cors;
		const origin = req.headers.origin;
		if (allowed && origin && (allowed === "*" || allowed.includes(origin))) this._corsHeaders(res, allowed === "*" ? "*" : origin);
		if (this._options.route && await this._options.route(req, res)) return true;
		if (req.method !== "OPTIONS") return false;
		res.writeHead(204).end();
		return true;
	}

	_corsHeaders (res: ServerResponse, origin: string): void {
		const allowed = this._options.cors;
		res.setHeader("access-control-allow-origin", origin);
		res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
		res.setHeader("access-control-allow-headers", "content-type, authorization");
		res.setHeader("access-control-max-age", "600");
		if (allowed !== "*") res.setHeader("vary", "origin");
	}

	_authorised (req: IncomingMessage): boolean {
		return req.headers.authorization === `Bearer ${this._options.secret}`;
	}
}

/** A directory error with its HTTP status. */
export class IgeZoneError extends Error {
	status: number;

	constructor (status: number, message: string) {
		super(message);
		this.status = status;
	}
}

function readJson (req: IncomingMessage): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		let text = "";
		req.on("data", (chunk: Buffer) => {
			text += chunk.toString();
			if (text.length > 65536) {
				reject(new IgeZoneError(413, "Too large"));
				req.destroy();
			}
		});
		req.on("end", () => {
			try {
				const body = text ? JSON.parse(text) : {};
				resolve(body && typeof body === "object" ? body : {});
			} catch {
				reject(new IgeZoneError(400, "Not JSON"));
			}
		});
		req.on("error", reject);
	});
}
