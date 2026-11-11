import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { signTicket } from "@/engine/network/zones/igeZoneTicket";
import { igeZoneIdValid, type IgeZoneLauncher } from "@/engine/network/zones/IgeZoneLauncher";

/** Where a player enters the game (the game's say: their saved place), and what their ticket carries. */
export interface IgeZoneEntry {
	zone: string;
	data?: unknown;
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
	 * Pages on other origins allowed to POST /enter (a browser game served
	 * from elsewhere): a list of origins, or "*". Default: none.
	 */
	cors?: string[] | "*";
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
 * - `POST /zones/ensure { zone }`: a zone handing a player on (with the
 *   secret as a bearer token) → `{ url }` once the zone's up.
 * - `POST /zones/register { zone, url }` and `POST /zones/heartbeat
 *   { zone, players, url? }`: from zones (with the secret).
 * - `GET /zones`: every zone, for operators.
 *
 * Events: "start" (zone), "ready" (record), "stop" (zone, why: "idle" or
 * "shutdown"), "lost" (zone, why: "heartbeat" or "exit"), "enter" (player,
 * zone).
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
		const url = await this.ensure(entry.zone);
		const ticket = signTicket({ player, zone: entry.zone, data: entry.data }, this._options.secret, this._options.ticketTtl ?? 30, this._now());
		this.emit("enter", player, entry.zone);
		return { zone: entry.zone, url, ticket };
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
		this.zones.set(zone, { zone, state: "starting", players: 0, startedAt: now, lastHeartbeat: now, emptySince: now });
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

	/** A zone's still alive, with this many players (a zone the directory had forgotten is taken back, given its url). */
	heartbeat (zone: string, players: number, url?: string): IgeZoneRecord | undefined {
		let record = this.zones.get(zone);
		if (!record) {
			if (!url) return;
			record = this.register(zone, url);
		}
		const now = this._now();
		record.lastHeartbeat = now;
		record.players = Math.max(0, Math.floor(Number(players) || 0));
		if (record.players > 0) record.emptySince = undefined;
		else record.emptySince ??= now;
		return record;
	}

	/** Every zone. */
	status (): IgeZoneRecord[] {
		return [...this.zones.values()].map((r) => ({ ...r }));
	}

	/** Stops idle zones and forgets silent ones (the directory's own timer calls this every second). */
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
			if (record.players === 0 && record.emptySince !== undefined && now - record.emptySince > idle) {
				this.zones.delete(record.zone);
				this.emit("stop", record.zone, "idle");
				await this._options.launcher.stop(record.zone).catch(() => undefined);
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
		const send = (body: unknown, status = 200): void => {
			res.writeHead(status, JSON_HEADERS).end(JSON.stringify(body));
		};
		if (path === "/enter" && this._cors(req, res)) return;
		// Everything under /zones is for zones and operators: the secret
		if (path.startsWith("/zones") && !this._authorised(req)) throw new IgeZoneError(401, "Not authorised");
		if (req.method === "GET" && path === "/zones") return send({ zones: this.status() });
		if (req.method !== "POST") throw new IgeZoneError(404, "Not found");
		const body = await readJson(req);
		switch (path) {
			case "/enter":
				return send(await this.enter(String(body.player ?? ""), body));
			case "/zones/ensure":
				return send({ url: await this.ensure(String(body.zone ?? "")) });
			case "/zones/register":
				return send({ ok: true, zone: this.register(String(body.zone ?? ""), String(body.url ?? "")).zone });
			case "/zones/heartbeat": {
				const record = this.heartbeat(String(body.zone ?? ""), Number(body.players) || 0, typeof body.url === "string" ? body.url : undefined);
				return send({ ok: !!record });
			}
		}
		throw new IgeZoneError(404, "Not found");
	}

	/** Lets an allowed page on another origin call /enter. True when that's all the request was (a preflight, answered). */
	_cors (req: IncomingMessage, res: ServerResponse): boolean {
		const allowed = this._options.cors;
		const origin = req.headers.origin;
		if (allowed && origin && (allowed === "*" || allowed.includes(origin))) this._corsHeaders(res, allowed === "*" ? "*" : origin);
		if (req.method !== "OPTIONS") return false;
		res.writeHead(204).end();
		return true;
	}

	_corsHeaders (res: ServerResponse, origin: string): void {
		const allowed = this._options.cors;
		res.setHeader("access-control-allow-origin", origin);
		res.setHeader("access-control-allow-methods", "POST, OPTIONS");
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
