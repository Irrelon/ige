import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { type IgeZoneTicket, IgeZoneTicketGuard, signTicket, verifyTicket } from "@/engine/network/zones/igeZoneTicket";

export interface IgeZoneHostOptions {
	/** The zone this process is. */
	zone: string;
	/** Where the directory is, and the secret shared with it (tickets, requests). */
	directoryUrl: string;
	secret: string;
	/** Where clients reach this zone (what it registers). */
	url: string;
	/** How many players are here now (sent with each heartbeat; nobody for a while and the directory stops the zone). */
	players: () => number;
	/** Heartbeats this often (ms, default 5000). */
	heartbeatMs?: number;
	/** How long a handoff ticket is good for (seconds, default 30: the jump plus a slow connection). */
	ticketTtl?: number;
	/** HTTP (tests replace it). */
	fetch?: typeof fetch;
	/** Clock (ms), for tests. */
	now?: () => number;
}

/**
 * A zone server's side of zones (Node only): registers with the directory
 * once it's ready for players, sends heartbeats with its player count,
 * hands players on to other zones (`handoff`: the next zone's url and a
 * ticket in, for the client's IgeNetSyncClient.transfer) and checks the
 * tickets players arrive with (`acceptTicket`: signed, unexpired, for this
 * zone, and not used before). Give `acceptTicket` to the zone's
 * IgeNetSyncHost so joins with a ticket are let in.
 *
 *     const zone = IgeZoneHost.fromEnv({ players: () => host.machines().length });
 *     const host = new IgeNetSyncHost(listener, { acceptTicket: (token) => zone.acceptTicket(token), join: (machine, players, ticket) => ... });
 *     await zone.start();
 *     // a player leaves through the gate:
 *     const { url, ticket } = await zone.handoff(playerId, "orhaan", { x, z, vx, vz });
 *     host.event({ t: "zoneTransfer", url, ticket }, machine);
 *
 * Events: "registered", "heartbeatFailed" (error), "handoff" (player, zone).
 */
export class IgeZoneHost extends IgeEventingClass {
	classId = "IgeZoneHost";
	readonly zone: string;
	_options: IgeZoneHostOptions;
	_guard = new IgeZoneTicketGuard();
	_timer?: ReturnType<typeof setInterval>;
	_now: () => number;

	constructor (options: IgeZoneHostOptions) {
		super();
		if (!options.secret) throw new Error("A zone host needs the zones' secret");
		this.zone = options.zone;
		this._options = options;
		this._now = options.now ?? Date.now;
	}

	/**
	 * A zone host from the environment a launcher gives a zone (ZONE_ID,
	 * ZONE_URL, DIRECTORY_URL, ZONE_SECRET), with the player count from the game.
	 */
	static fromEnv (options: Partial<IgeZoneHostOptions> & Pick<IgeZoneHostOptions, "players">, env: Record<string, string | undefined> = process.env): IgeZoneHost {
		const need = (key: string) => {
			const value = env[key];
			if (!value) throw new Error(`A zone needs ${key} in its environment`);
			return value;
		};
		return new IgeZoneHost({
			zone: options.zone ?? need("ZONE_ID"),
			url: options.url ?? need("ZONE_URL"),
			directoryUrl: options.directoryUrl ?? need("DIRECTORY_URL"),
			secret: options.secret ?? need("ZONE_SECRET"),
			...options
		} as IgeZoneHostOptions);
	}

	/** Registers with the directory and starts the heartbeats. */
	async start (): Promise<void> {
		await this._post("/zones/register", { zone: this.zone, url: this._options.url });
		this.emit("registered");
		if (this._timer) return;
		this._timer = setInterval(() => {
			this.heartbeat().catch((error) => this.emit("heartbeatFailed", error));
		}, this._options.heartbeatMs ?? 5000);
	}

	/** Stops the heartbeats (the directory notices, and forgets the zone). */
	stop (): void {
		if (this._timer) clearInterval(this._timer);
		this._timer = undefined;
	}

	/** Tells the directory this zone's alive, and how many are in it. */
	async heartbeat (): Promise<void> {
		await this._post("/zones/heartbeat", { zone: this.zone, players: this._options.players(), url: this._options.url });
	}

	/**
	 * A player leaving for another zone: the directory makes sure it's up,
	 * and the player gets its url and a ticket in carrying `data` (where
	 * they arrive, their velocity...). Send both to the player's machine;
	 * it calls IgeNetSyncClient.transfer with them.
	 */
	async handoff (player: string, toZone: string, data?: unknown): Promise<{ url: string; ticket: string }> {
		const { url } = await this._post("/zones/ensure", { zone: toZone }) as { url: string };
		const ticket = signTicket({ player, zone: toZone, data }, this._options.secret, this._options.ticketTtl ?? 30, this._now());
		this.emit("handoff", player, toZone);
		return { url, ticket };
	}

	/** A ticket a player arrives with: the ticket (signed, unexpired, for this zone, first use), or a string saying why not. */
	acceptTicket (token: string): IgeZoneTicket | string {
		const now = this._now();
		const ticket = verifyTicket(token, this._options.secret, now);
		if (typeof ticket === "string") return ticket;
		if (ticket.zone !== this.zone) return "That ticket is for another zone.";
		if (!this._guard.use(ticket, now)) return "That ticket has already been used.";
		return ticket;
	}

	async _post (path: string, body: unknown): Promise<unknown> {
		const res = await (this._options.fetch ?? fetch)(`${this._options.directoryUrl.replace(/\/$/, "")}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json", authorization: `Bearer ${this._options.secret}` },
			body: JSON.stringify(body)
		});
		const json = await res.json().catch(() => ({})) as { error?: string };
		if (!res.ok) throw new Error(json.error ?? `The directory said ${res.status}`);
		return json;
	}
}
