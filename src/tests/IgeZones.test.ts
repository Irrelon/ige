import { IgeNetSyncClient } from "@/engine/network/sync/IgeNetSyncClient";
import { IgeNetSyncHost, type IgeNetMachine } from "@/engine/network/sync/IgeNetSyncHost";
import { igeNetLoopback } from "@/engine/network/sync/IgeNetTransport";
import { IgeDockerLauncher } from "@/engine/network/zones/IgeDockerLauncher";
import { IgeZoneDirectory } from "@/engine/network/zones/IgeZoneDirectory";
import { IgeZoneHost } from "@/engine/network/zones/IgeZoneHost";
import type { IgeZoneLauncher } from "@/engine/network/zones/IgeZoneLauncher";
import { type IgeZoneTicket, IgeZoneTicketGuard, signTicket, verifyTicket } from "@/engine/network/zones/igeZoneTicket";

const SECRET = "test-secret";

async function until (check: () => boolean, ms = 2000): Promise<void> {
	const end = Date.now() + ms;
	while (!check()) {
		if (Date.now() > end) throw new Error("Timed out");
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

describe("zone tickets", () => {
	it("signs and verifies, carrying the game's data", () => {
		const token = signTicket({ player: "ann", zone: "orhaan", data: { x: 10, vz: -3 } }, SECRET, 30, 1000);
		const ticket = verifyTicket(token, SECRET, 2000) as IgeZoneTicket;
		expect(ticket).toMatchObject({ player: "ann", zone: "orhaan", data: { x: 10, vz: -3 }, exp: 31000 });
		expect(typeof ticket.nonce).toBe("string");
		// Each one's different (its nonce), even for the same player and zone
		expect(signTicket({ player: "ann", zone: "orhaan" }, SECRET)).not.toBe(signTicket({ player: "ann", zone: "orhaan" }, SECRET));
	});

	it("turns away expired, tampered and wrongly signed tickets", () => {
		const token = signTicket({ player: "ann", zone: "orhaan" }, SECRET, 30, 1000);
		expect(verifyTicket(token, SECRET, 31001)).toMatch(/expired/);
		expect(verifyTicket(token, "another secret", 2000)).toMatch(/signature/);
		const [body, sig] = token.split(".");
		const forged = Buffer.from(JSON.stringify({ player: "mallory", zone: "orhaan", exp: 9e15, nonce: "x" })).toString("base64url");
		expect(verifyTicket(`${forged}.${sig}`, SECRET, 2000)).toMatch(/signature/);
		expect(verifyTicket(`${body}`, SECRET, 2000)).toMatch(/isn't a ticket/);
		expect(verifyTicket("", SECRET)).toMatch(/isn't a ticket/);
	});

	it("is good for one join (a zone remembers the ones it's taken until they'd expire)", () => {
		const guard = new IgeZoneTicketGuard();
		const ticket = verifyTicket(signTicket({ player: "ann", zone: "z" }, SECRET, 30, 0), SECRET, 0) as IgeZoneTicket;
		expect(guard.use(ticket, 0)).toBe(true);
		expect(guard.use(ticket, 1000)).toBe(false);
		// Forgotten once it's expired (and then it wouldn't verify anyway)
		expect(guard._used.size).toBe(1);
		guard.use(verifyTicket(signTicket({ player: "bob", zone: "z" }, SECRET, 30, 40000), SECRET, 40000) as IgeZoneTicket, 40000);
		expect(guard._used.has(ticket.nonce)).toBe(false);
	});

	it("a zone host takes a ticket only for itself, only once", () => {
		const zone = new IgeZoneHost({ zone: "orhaan", directoryUrl: "http://unused", secret: SECRET, url: "ws://x/sync", players: () => 0 });
		const token = signTicket({ player: "ann", zone: "orhaan" }, SECRET);
		expect(zone.acceptTicket(token)).toMatchObject({ player: "ann" });
		expect(zone.acceptTicket(token)).toMatch(/already been used/);
		expect(zone.acceptTicket(signTicket({ player: "ann", zone: "valeria" }, SECRET))).toMatch(/another zone/);
	});
});

/** A launcher that starts nothing: it records what it's asked, and the test registers the zones itself. */
function fakeLauncher () {
	const started: { zone: string; env: Record<string, string> }[] = [];
	const stopped: string[] = [];
	let exit: ((zone: string, code: number | null) => void) | undefined;
	let fail = false;
	const launcher: IgeZoneLauncher = {
		start: async (zone, env) => {
			if (fail) throw new Error("No room");
			started.push({ zone, env });
			return { url: `ws://127.0.0.1/${zone}` };
		},
		stop: async (zone) => {
			stopped.push(zone);
		},
		onExit: (fn) => {
			exit = fn;
		}
	};
	return { launcher, started, stopped, crash: (zone: string) => exit?.(zone, 1), failNext: (on: boolean) => { fail = on; } };
}

describe("the zone directory", () => {
	function directory (overrides: { startTimeoutMs?: number } = {}) {
		let now = 1000;
		const fake = fakeLauncher();
		const dir = new IgeZoneDirectory({
			launcher: fake.launcher, secret: SECRET, idleMs: 60000, heartbeatTimeoutMs: 15000, startTimeoutMs: overrides.startTimeoutMs ?? 5000,
			resolveEntry: (player) => (player === "banned" ? "Not today." : { zone: player === "ann" ? "valeria" : "orhaan", data: { at: "home" } }),
			directoryUrl: "http://dir", now: () => now
		});
		return { dir, fake, advance: (ms: number) => { now += ms; } };
	}

	it("starts a zone on demand, waits for it to register, and hands out a ticket into it", async () => {
		const { dir, fake } = directory();
		const entering = dir.enter("ann");
		await until(() => fake.started.length === 1);
		expect(fake.started[0]).toMatchObject({ zone: "valeria", env: { ZONE_SECRET: SECRET, DIRECTORY_URL: "http://dir" } });
		expect(dir.status()[0]).toMatchObject({ zone: "valeria", state: "starting" });
		// A second player wanting it meanwhile waits on the same start
		const second = dir.ensure("valeria");
		dir.register("valeria", "ws://zone-valeria/sync");
		const entry = await entering;
		expect(await second).toBe("ws://zone-valeria/sync");
		expect(fake.started.length).toBe(1);
		expect(entry).toMatchObject({ zone: "valeria", url: "ws://zone-valeria/sync" });
		expect(verifyTicket(entry.ticket, SECRET, 1500)).toMatchObject({ player: "ann", zone: "valeria", data: { at: "home" } });
		// Already up: straight back (a player reconnecting to the zone they're in gets a ticket for it the same way)
		const again = await dir.enter("ann");
		expect(again.url).toBe("ws://zone-valeria/sync");
		expect(fake.started.length).toBe(1);
		await expect(dir.enter("banned")).rejects.toThrow("Not today.");
	});

	it("stops a zone that's been empty a while, and keeps one with players", async () => {
		const { dir, fake, advance } = directory();
		const a = dir.ensure("valeria"), b = dir.ensure("orhaan");
		await until(() => fake.started.length === 2);
		dir.register("valeria", "ws://v");
		dir.register("orhaan", "ws://o");
		await Promise.all([a, b]);
		dir.heartbeat("valeria", 2);
		advance(30000);
		dir.heartbeat("valeria", 2);
		dir.heartbeat("orhaan", 0);
		advance(31000);
		dir.heartbeat("valeria", 1);
		dir.heartbeat("orhaan", 0);
		await dir.check();
		expect(fake.stopped).toEqual(["orhaan"]);
		expect(dir.status().map((z) => z.zone)).toEqual(["valeria"]);
		// Players gone: it stops a minute later
		dir.heartbeat("valeria", 0);
		advance(61000);
		dir.heartbeat("valeria", 0);
		await dir.check();
		expect(fake.stopped).toEqual(["orhaan", "valeria"]);
	});

	it("forgets a zone that stops sending heartbeats (or whose process ends), and restarts it when it's wanted", async () => {
		const { dir, fake, advance } = directory();
		const lost: string[] = [];
		dir.on("lost", (zone: string, why: string) => {
			lost.push(`${zone}:${why}`);
		});
		const first = dir.ensure("valeria");
		await until(() => fake.started.length === 1);
		dir.register("valeria", "ws://v1");
		await first;
		dir.heartbeat("valeria", 3);
		advance(16000);
		await dir.check();
		expect(lost).toEqual(["valeria:heartbeat"]);
		expect(dir.status()).toEqual([]);
		const again = dir.ensure("valeria");
		await until(() => fake.started.length === 2);
		dir.register("valeria", "ws://v2");
		expect(await again).toBe("ws://v2");
		// Its process ends by itself
		fake.crash("valeria");
		expect(lost).toEqual(["valeria:heartbeat", "valeria:exit"]);
		expect(dir.status()).toEqual([]);
		// A zone the directory doesn't know (it restarted) is taken back from its heartbeat
		expect(dir.heartbeat("orhaan", 1, "ws://o")).toMatchObject({ zone: "orhaan", state: "running", url: "ws://o", players: 1 });
	});

	it("gives up on a zone that won't start or doesn't register in time", async () => {
		const { dir, fake } = directory({ startTimeoutMs: 30 });
		fake.failNext(true);
		await expect(dir.ensure("valeria")).rejects.toThrow(/No room/);
		fake.failNext(false);
		await expect(dir.ensure("valeria")).rejects.toThrow(/didn't register in time/);
		expect(fake.stopped).toContain("valeria");
		expect(dir.status()).toEqual([]);
		await expect(dir.ensure("not a zone!")).rejects.toThrow(/Not a zone id/);
	});

	it("over HTTP: zones register, beat and hand off with the secret; players enter; operators see it all", async () => {
		const fake = fakeLauncher();
		const dir = new IgeZoneDirectory({ launcher: fake.launcher, secret: SECRET, resolveEntry: () => ({ zone: "valeria" }) });
		const port = await dir.listen(0);
		const base = `http://127.0.0.1:${port}`;
		try {
			let players = 1;
			const valeria = new IgeZoneHost({ zone: "valeria", directoryUrl: base, secret: SECRET, url: "ws://v/sync", players: () => players, heartbeatMs: 60000 });
			await valeria.start();
			await valeria.heartbeat();
			expect(dir.zones.get("valeria")).toMatchObject({ state: "running", players: 1 });
			players = 0;
			await valeria.heartbeat();
			expect(dir.zones.get("valeria")?.players).toBe(0);
			const entered = await (await fetch(`${base}/enter`, { method: "POST", body: JSON.stringify({ player: "ann" }) })).json();
			expect(entered).toMatchObject({ zone: "valeria", url: "ws://v/sync" });
			// A handoff to a zone that isn't up yet: it starts, registers, and the ticket's for it
			const handing = valeria.handoff("ann", "orhaan", { x: 5 });
			await until(() => fake.started.some((s) => s.zone === "orhaan"));
			expect(fake.started.find((s) => s.zone === "orhaan")!.env.DIRECTORY_URL).toBe(base);
			const orhaan = new IgeZoneHost({ zone: "orhaan", directoryUrl: base, secret: SECRET, url: "ws://o/sync", players: () => 0, heartbeatMs: 60000 });
			await orhaan.start();
			const handed = await handing;
			expect(handed.url).toBe("ws://o/sync");
			expect(orhaan.acceptTicket(handed.ticket)).toMatchObject({ player: "ann", zone: "orhaan", data: { x: 5 } });
			// Without the secret, zones' routes and the status are refused
			expect((await fetch(`${base}/zones/register`, { method: "POST", body: JSON.stringify({ zone: "evil", url: "ws://evil" }) })).status).toBe(401);
			expect((await fetch(`${base}/zones`)).status).toBe(401);
			const status = await (await fetch(`${base}/zones`, { headers: { authorization: `Bearer ${SECRET}` } })).json();
			expect(status.zones.map((z: { zone: string }) => z.zone).sort()).toEqual(["orhaan", "valeria"]);
			valeria.stop();
			orhaan.stop();
		} finally {
			await dir.close();
		}
	});
});

describe("the zone directory from a browser", () => {
	it("lets allowed pages on other origins enter, and only those", async () => {
		const fake = fakeLauncher();
		const dir = new IgeZoneDirectory({ launcher: fake.launcher, secret: SECRET, cors: ["http://game.test:5208"], resolveEntry: () => "Log in first." });
		const port = await dir.listen(0);
		const base = `http://127.0.0.1:${port}`;
		try {
			const preflight = await fetch(`${base}/enter`, { method: "OPTIONS", headers: { origin: "http://game.test:5208" } });
			expect(preflight.status).toBe(204);
			expect(preflight.headers.get("access-control-allow-origin")).toBe("http://game.test:5208");
			const refused = await fetch(`${base}/enter`, { method: "POST", headers: { origin: "http://game.test:5208" }, body: JSON.stringify({ player: "ann" }) });
			// The game's refusal reaches the page (it can read the error)
			expect(refused.status).toBe(403);
			expect(refused.headers.get("access-control-allow-origin")).toBe("http://game.test:5208");
			expect((await refused.json()).error).toBe("Log in first.");
			const other = await fetch(`${base}/enter`, { method: "OPTIONS", headers: { origin: "http://elsewhere.test" } });
			expect(other.headers.get("access-control-allow-origin")).toBeNull();
			// A second directory on the same port is told so
			const clash = new IgeZoneDirectory({ launcher: fake.launcher, secret: SECRET, resolveEntry: () => "No." });
			await expect(clash.listen(port)).rejects.toThrow(/EADDRINUSE/);
			await clash.close();
		} finally {
			await dir.close();
		}
	});
});

describe("the game's own routes on the directory", () => {
	it("answers what the game's route takes, leaves the rest (and the zones' routes) to the directory, with CORS for allowed pages", async () => {
		const fake = fakeLauncher();
		const seen: string[] = [];
		const dir = new IgeZoneDirectory({
			launcher: fake.launcher, secret: SECRET, cors: ["http://game.test"],
			resolveEntry: () => "Sign in first.",
			route: async (req, res) => {
				seen.push(`${req.method} ${req.url}`);
				if (req.url === "/zones") {
					res.writeHead(200).end("hijacked");
					return true;
				}
				if (!req.url?.startsWith("/auth/") || req.method === "OPTIONS") return false;
				if (req.url === "/auth/fail") throw new Error("The sign-in service is down");
				let body = "";
				for await (const chunk of req) body += chunk;
				res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ me: "ann", body }));
				return true;
			}
		});
		const port = await dir.listen(0);
		const base = `http://127.0.0.1:${port}`;
		const origin = { origin: "http://game.test" };
		try {
			const me = await fetch(`${base}/auth/me`, { method: "POST", headers: origin, body: "hello" });
			expect(await me.json()).toEqual({ me: "ann", body: "hello" });
			expect(me.headers.get("access-control-allow-origin")).toBe("http://game.test");
			// A preflight the route leaves is answered for it
			const preflight = await fetch(`${base}/auth/me`, { method: "OPTIONS", headers: origin });
			expect(preflight.status).toBe(204);
			expect(preflight.headers.get("access-control-allow-methods")).toContain("GET");
			// The directory's own: /enter still goes to resolveEntry (after the route declined it)
			const enter = await fetch(`${base}/enter`, { method: "POST", headers: origin, body: JSON.stringify({ player: "ann" }) });
			expect(enter.status).toBe(403);
			expect((await enter.json()).error).toBe("Sign in first.");
			// The route's errors come back as errors
			const fail = await fetch(`${base}/auth/fail`, { method: "POST" });
			expect(fail.status).toBe(500);
			expect((await fail.json()).error).toBe("The sign-in service is down");
			// Unknown paths are still the directory's 404
			expect((await fetch(`${base}/nothing`)).status).toBe(404);
			// The control plane is never the route's, and gets no CORS
			const zones = await fetch(`${base}/zones`, { headers: origin });
			expect(zones.status).toBe(401);
			expect(zones.headers.get("access-control-allow-origin")).toBeNull();
			expect(seen).not.toContain("GET /zones");
			expect(seen).toContain("POST /enter");
		} finally {
			await dir.close();
		}
	});
});

describe("Docker zones", () => {
	it("runs the image with the zone's environment, on the network, and stops it by name", async () => {
		const calls: string[][] = [];
		const launcher = new IgeDockerLauncher({ image: "starflight", network: "sf", urlTemplate: "wss://{zone}.zones.example.com/sync", exec: async (args) => { calls.push(args); return ""; } });
		const { url } = await launcher.start("orhaan", { ZONE_SECRET: "s", DIRECTORY_URL: "http://dir:8680" });
		expect(url).toBe("wss://orhaan.zones.example.com/sync");
		const args = calls[0];
		expect(args.slice(0, 5)).toEqual(["run", "-d", "--rm", "--name", "ige-zone-orhaan"]);
		expect(args).toContain("--network");
		expect(args).toContain("ZONE_ID=orhaan");
		expect(args).toContain("ZONE_URL=wss://orhaan.zones.example.com/sync");
		expect(args).toContain("DIRECTORY_URL=http://dir:8680");
		expect(args[args.length - 1]).toBe("starflight");
		await launcher.stop("orhaan");
		expect(calls[1]).toEqual(["stop", "ige-zone-orhaan"]);
		// Published ports for local development
		const local = new IgeDockerLauncher({ image: "sf", publish: [9000, 9001], exec: async () => "" });
		expect((await local.start("a", {})).url).toBe("ws://localhost:9000/sync");
		expect((await local.start("b", {})).url).toBe("ws://localhost:9001/sync");
		await expect(local.start("c", {})).rejects.toThrow(/No free port/);
	});
});

describe("moving between zones", () => {
	type Input = { dx: number };

	/** A zone: one dot per player, which arrives where its ticket says. */
	function zone (name: string) {
		const net = igeNetLoopback();
		const zoneHost = new IgeZoneHost({ zone: name, directoryUrl: "http://unused", secret: SECRET, url: `loop://${name}`, players: () => 0 });
		const dots: Record<string, { x: number; who: string; zone: string }> = {};
		const left: string[] = [];
		const host = new IgeNetSyncHost<Input>(net.listener, {
			acceptTicket: (token) => zoneHost.acceptTicket(token),
			join: (machine: IgeNetMachine, players, ticket) => {
				const t = ticket as IgeZoneTicket | undefined;
				const who = t ? t.player : (players[0] as { name: string }).name;
				const id = `${name}:${who}`;
				// Reconnecting while the old connection lingers: it's replaced
				const old = host.machines().find((m) => m.players.includes(id));
				if (old) host.disconnect(old);
				dots[id] = { x: (t?.data as { x?: number } | undefined)?.x ?? 0, who, zone: name };
				return [id];
			},
			leave: (machine) => {
				left.push(machine.id);
				for (const id of machine.players) delete dots[id];
			},
			step: (dt, tick, inputs) => inputs.forEach((input, id) => {
				if (dots[id]) dots[id].x += input.dx * 100 * dt;
			}),
			snapshot: () => dots,
			snapshotRate: 30
		});
		return { net, host, zoneHost, dots, left };
	}

	async function run (hosts: IgeNetSyncHost<Input>[], ms: number): Promise<void> {
		for (let t = 0; t < ms; t += 20) {
			for (const h of hosts) h.update(20);
			await new Promise((resolve) => setTimeout(resolve, 2));
		}
	}

	it("a client crossing from one zone to the next joins with its ticket, keeps its slot, and starts afresh from the new zone", async () => {
		const a = zone("a"), b = zone("b");
		const zones: Record<string, ReturnType<typeof zone>> = { "loop://a": a, "loop://b": b };
		const client = new IgeNetSyncClient<Input>(a.net.connect(), { pingInterval: 0, connect: (url) => zones[url].net.connect() });
		const seen: string[] = [];
		client.on("transfer", () => {
			seen.push("transfer");
		});
		client.on("transferred", () => {
			seen.push("transferred");
		});
		client.on("disconnected", () => {
			seen.push("disconnected");
		});
		const welcome = await client.join([{ name: "ann" }]);
		expect(welcome.players).toEqual(["a:ann"]);
		for (let i = 0; i < 10; i++) {
			client.sendInput([{ dx: 1 }]);
			await run([a.host, b.host], 34);
		}
		expect(client.latest()?.entities["a:ann"]).toBeDefined();
		// Over the border: zone a hands Ann on (as IgeZoneHost.handoff would, without a directory)
		const x = a.dots["a:ann"].x;
		const ticket = signTicket({ player: "ann", zone: "b", data: { x } }, SECRET);
		const arrived = await client.transfer({ url: "loop://b", ticket });
		expect(seen).toEqual(["transfer", "transferred"]);
		expect(arrived.players).toEqual(["b:ann"]);
		expect(client.players).toEqual(["b:ann"]);
		expect(client.latest()).toBeUndefined();
		await run([a.host, b.host], 100);
		// Gone from a, here in b where the ticket put her
		expect(a.left.length).toBe(1);
		expect(a.dots["a:ann"]).toBeUndefined();
		expect(b.dots["b:ann"].x).toBeCloseTo(x, 5);
		expect(client.latest()?.entities["b:ann"]).toBeDefined();
		expect(client.latest()?.entities["a:ann"]).toBeUndefined();
		// Inputs flow to the new zone
		for (let i = 0; i < 6; i++) {
			client.sendInput([{ dx: 1 }]);
			await run([a.host, b.host], 34);
		}
		expect(b.dots["b:ann"].x).toBeGreaterThan(x);
		// The ticket's spent: nobody else gets in on it
		const thief = new IgeNetSyncClient<Input>(b.net.connect(), { pingInterval: 0 });
		await expect(thief.join([], ticket)).rejects.toThrow(/already been used/);
		// A host that takes no tickets turns them away
		expect(seen).not.toContain("disconnected");
		client.destroy();
		thief.destroy();
	});

	it("a fresh connection to the zone you're already in (a reconnect) joins on a ticket, replacing the old one", async () => {
		const a = zone("a");
		const first = new IgeNetSyncClient<Input>(a.net.connect(), { pingInterval: 0 });
		await first.join([{ name: "ann" }]);
		let dropped = false;
		first.on("disconnected", () => {
			dropped = true;
		});
		// Her old connection is still open (a dead network nobody's noticed yet) as she comes back
		const again = new IgeNetSyncClient<Input>(a.net.connect(), { pingInterval: 0 });
		const welcome = await again.join([], signTicket({ player: "ann", zone: "a", data: { x: 42 } }, SECRET));
		expect(welcome.players).toEqual(["a:ann"]);
		expect(a.dots["a:ann"].x).toBe(42);
		// The old one's replaced: it left once (before she joined again), and it's gone
		await until(() => dropped);
		expect(a.left.length).toBe(1);
		expect(a.host.machines().length).toBe(1);
		expect(a.dots["a:ann"].x).toBe(42);
		first.destroy();
		// Without acceptTicket, a host refuses tickets
		const net = igeNetLoopback();
		new IgeNetSyncHost(net.listener, { join: () => ["x"], step: () => undefined, snapshot: () => ({}) });
		const c = new IgeNetSyncClient(net.connect(), { pingInterval: 0 });
		await expect(c.join([], "anything")).rejects.toThrow(/Tickets aren't taken here/);
		again.destroy();
		c.destroy();
	});
});
