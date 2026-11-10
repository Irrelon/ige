import { IgeNetSyncHost, type IgeNetMachine } from "@/engine/network/sync/IgeNetSyncHost";
import { IgeNetSyncClient } from "@/engine/network/sync/IgeNetSyncClient";
import { igeNetLoopback, type IgeNetLoopbackOptions } from "@/engine/network/sync/IgeNetTransport";

/** A tiny game: each player is a dot that moves along x at its input's speed. */
type Input = { dx: number };
type Dot = { x: number; facing: number; name: string };
const SPEED = 100;
const move = (dot: Dot, input: Input, dt: number): Dot => ({ ...dot, x: dot.x + input.dx * SPEED * dt });

function game (net: ReturnType<typeof igeNetLoopback>, refuse?: string) {
	const dots: Record<string, Dot> = {};
	const left: string[] = [];
	const host = new IgeNetSyncHost<Input>(net.listener, {
		join: (machine, players) => {
			if (refuse && players.some((p) => (p as { name: string }).name === refuse)) return "No room";
			return players.map((p, i) => {
				const id = `${machine.id}.${i}`;
				dots[id] = { x: 0, facing: 0, name: (p as { name: string }).name };
				return id;
			});
		},
		leave: (machine) => {
			left.push(machine.id);
			for (const id of machine.players) delete dots[id];
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				if (dots[id]) dots[id] = move(dots[id], input, dt);
			});
		},
		snapshot: () => dots,
		info: () => ({ seed: 42 }),
		snapshotRate: 30
	});
	return { host, dots, left };
}

const settle = async (times = 3) => {
	for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("IgeNetSyncHost / IgeNetSyncClient", () => {
	it("gives up on an authority that goes silent without closing", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		// Everything the authority says after the welcome gets lost (a frozen host, a dead network)
		const connection = net.connect();
		let silent = false;
		const quiet = {
			...connection,
			onMessage: (fn: (m: unknown) => void) => connection.onMessage((m) => { if (!silent) fn(m); })
		};
		let clock = 0;
		const client = new IgeNetSyncClient<Input>(quiet, { pingInterval: 10, timeout: 500, now: () => clock });
		let gone = false;
		client.on("disconnected", () => { gone = true; });
		await client.join([{ name: "Ann" }]);
		silent = true;
		clock += 400;
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(gone).toBe(false);
		clock += 200;
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(gone).toBe(true);
		host.destroy();
	});

	it("doesn't give up on the authority when its own timers were asleep (a background tab)", async () => {
		// The authority in the same page (offline play): it answers every ping, but the page's timers stopped for
		// a minute, so the first ping after waking finds the last answer a minute old
		const net = igeNetLoopback();
		const { host, left } = game(net);
		let clock = 0;
		const client = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 10, timeout: 500, now: () => clock });
		let gone = false;
		client.on("disconnected", () => { gone = true; });
		await client.join([{ name: "Ann" }]);
		await new Promise((resolve) => setTimeout(resolve, 30));
		clock += 60000;
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(gone).toBe(false);
		expect(left).toEqual([]);
		expect(host._machines.size).toBe(1);
		client.destroy();
		host.destroy();
	});

	it("joins machines with their local players and refuses when told to", async () => {
		const net = igeNetLoopback();
		const { host, dots } = game(net, "Mallory");
		const a = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		const b = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		const joined: string[] = [];
		host.on("join", (machine: IgeNetMachine) => { joined.push(machine.id); });

		const welcomeA = await a.join([{ name: "Ann" }]);
		const welcomeB = await b.join([{ name: "Bob" }, { name: "Cat" }]);
		expect(welcomeA.players).toHaveLength(1);
		expect(welcomeB.players).toHaveLength(2);
		expect(welcomeB.info).toEqual({ seed: 42 });
		expect(b.players).toEqual(welcomeB.players);
		expect(Object.values(dots).map((d) => d.name).sort()).toEqual(["Ann", "Bob", "Cat"]);
		expect(joined).toHaveLength(2);

		const c = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		await expect(c.join([{ name: "Mallory" }])).rejects.toThrow("No room");
		host.destroy();
	});

	it("applies each player's inputs one per step, holding the last, and acknowledges them", async () => {
		const net = igeNetLoopback();
		const { host, dots } = game(net);
		const client = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		const { players: [p1, p2] } = await client.join([{ name: "Ann" }, { name: "Bob" }]);

		client.sendInput([{ dx: 1 }, { dx: -1 }]);
		client.sendInput([{ dx: 1 }, { dx: 0 }]);
		await settle();
		host.update(1000 / 30); // applies frame 1
		host.update(1000 / 30); // frame 2
		host.update(1000 / 30); // no new frame: frame 2's inputs held
		expect(dots[p1].x).toBeCloseTo((3 * SPEED) / 30);
		expect(dots[p2].x).toBeCloseTo(-SPEED / 30);

		host.update(1000 / 30);
		await settle();
		expect(client.latest()?.ack).toBe(2);
		expect(client.pendingInputs()).toEqual([]);
		host.destroy();
	});

	it("blends a predicted player between ticks, so one drawn every frame moves smoothly", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		const { players: [id] } = await client.join([{ name: "Ann" }]);
		const step = SPEED / 30;
		// One tick as the game loop runs it in the same page: input, the authority's step, its snapshot
		const tick = async () => {
			client.sendInput([{ dx: 1 }]);
			await settle();
			host.update(1000 / 30);
			await settle();
		};
		const drawn = (between: number) => client.predict<Dot>(id, 0, move, { between })!.x;
		await tick();
		drawn(0);
		await tick();
		const now = client.predict<Dot>(id, 0, move)!.x;
		// Halfway into the next tick: halfway between the last two ticks' positions; all the way, at this tick's
		expect(drawn(0.5)).toBeCloseTo(now - step / 2, 5);
		expect(drawn(1)).toBeCloseTo(now, 5);
		await tick();
		expect(drawn(0)).toBeCloseTo(now, 5);
		expect(drawn(0.25)).toBeCloseTo(now + step / 4, 5);
		host.destroy();
	});

	it("hands out its interpolated world as the caller's own: replacing an entity in it leaves the snapshots alone", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		const { players: [id] } = await client.join([{ name: "Ann" }]);
		client.sendInput([{ dx: 1 }]);
		await settle();
		host.update(1000 / 30);
		await settle();
		// Drawing past the newest snapshot (no newer one yet): the game puts its predicted player in the world
		const world = client.interpolated();
		const stored = client.latest()!.entities[id];
		world[id] = { ...world[id], x: 999 };
		expect(client.latest()!.entities[id]).toBe(stored);
		expect((client.latest()!.entities[id] as Dot).x).not.toBe(999);
		host.destroy();
	});

	it("rebuilds full snapshots from deltas, including removals", async () => {
		const net = igeNetLoopback();
		const { host, dots } = game(net);
		const wire = net.connect();
		const received: any[] = [];
		wire.onMessage((message) => { received.push(message); });
		const watcher = new IgeNetSyncClient<Input>(wire, { pingInterval: 0 });
		const mover = new IgeNetSyncClient<Input>(net.connect(), { pingInterval: 0 });
		await watcher.join([{ name: "Watcher" }]);
		const { players: [id] } = await mover.join([{ name: "Mover" }]);

		for (let i = 0; i < 20; i++) {
			watcher.sendInput([{ dx: 0 }]);
			mover.sendInput([{ dx: 1 }]);
			await settle(1);
			host.update(1000 / 30);
			await settle(1);
		}
		expect(watcher.latest()!.entities).toEqual(JSON.parse(JSON.stringify(dots)));
		// Once a snapshot is acknowledged, the next ones carry only what changed: the mover's x
		const snaps = received.filter((m) => m.t === "snap");
		expect(snaps[0].base).toBe(0);
		const last = snaps[snaps.length - 1];
		expect(last.base).toBeGreaterThan(0);
		expect(last.set).toEqual({ [id]: { x: expect.any(Number) } });

		// The mover leaves: its dot disappears from the watcher's world
		mover.leave();
		await settle();
		for (let i = 0; i < 4; i++) {
			watcher.sendInput([{ dx: 0 }]);
			await settle(1);
			host.update(1000 / 30);
			await settle(1);
		}
		expect(watcher.latest()!.entities[id]).toBeUndefined();
		expect(Object.keys(watcher.latest()!.entities)).toHaveLength(1);
		host.destroy();
	});

	describe("over a network with latency", () => {
		beforeEach(() => jest.useFakeTimers({ now: 1000 }));
		afterEach(() => jest.useRealTimers());

		/** Run the host and a client together for `ticks` ticks, the client holding `input`. */
		async function play (host: IgeNetSyncHost<Input>, clients: { client: IgeNetSyncClient<Input>; input: Input[] }[], ticks: number) {
			for (let i = 0; i < ticks; i++) {
				for (const { client, input } of clients) client.sendInput(input);
				host.update(1000 / 30);
				await jest.advanceTimersByTimeAsync(1000 / 30);
			}
		}

		async function joined (options: IgeNetLoopbackOptions) {
			const net = igeNetLoopback(options);
			const world = game(net);
			const client = new IgeNetSyncClient<Input>(net.connect(), { now: () => Date.now(), interpolationDelay: 100 });
			const welcome = client.join([{ name: "Ann" }]);
			await jest.advanceTimersByTimeAsync(200);
			return { ...world, client, id: (await welcome).players[0] };
		}

		it("predicts the machine's own player ahead of the snapshots, matching the authority", async () => {
			const { host, dots, client, id } = await joined({ latency: 60 });
			await play(host, [{ client, input: [{ dx: 1 }] }], 30);

			const snapshotX = (client.latest()!.entities[id] as Dot).x;
			const predicted = client.predict<Dot>(id, 0, move)!;
			// Snapshots are a round trip behind; the prediction has caught up with the inputs sent
			expect(snapshotX).toBeLessThan(dots[id].x);
			expect(predicted.x).toBeGreaterThanOrEqual(dots[id].x - 1e-6);
			expect(predicted.x - dots[id].x).toBeLessThan((SPEED / 30) * 6);
			expect(client.rtt).toBeGreaterThanOrEqual(120);

			// Once the stick is let go, the prediction and the authority agree
			await play(host, [{ client, input: [{ dx: 0 }] }], 20);
			expect(client.predict<Dot>(id, 0, move)!.x).toBeCloseTo(dots[id].x, 5);
			host.destroy();
			client.destroy();
		});

		it("draws other entities interpolated a little in the past", async () => {
			const { host, client, id } = await joined({ latency: 30 });
			await play(host, [{ client, input: [{ dx: 1 }] }], 45);

			const latestX = (client.latest()!.entities[id] as Dot).x;
			const drawnX = (client.interpolated()[id] as Dot).x;
			// About 100 ms (3.3 ticks of 3.33 units) behind the newest snapshot, and smoothly between snapshots
			expect(drawnX).toBeLessThan(latestX);
			expect(latestX - drawnX).toBeGreaterThan(2);
			expect(latestX - drawnX).toBeLessThan(25);
			host.destroy();
			client.destroy();
		});

		it("survives lost and reordered packets: the authority still applies the inputs", async () => {
			// A seeded random source, so the losses are the same every run
			let seed = 7;
			const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
			const { host, dots, client, id } = await joined({ latency: 40, jitter: 30, loss: 0.25 });
			await play(host, [{ client, input: [{ dx: 1 }] }], 60);
			// Held inputs fill gaps, so the dot covers at least the distance of the frames sent
			await play(host, [{ client, input: [{ dx: 0 }] }], 30);
			expect(dots[id].x).toBeGreaterThanOrEqual(60 * (SPEED / 30) - 1e-6);
			expect(client.latest()!.entities[id]).toEqual(dots[id]);
			spy.mockRestore();
			host.destroy();
			client.destroy();
		});

		it("delivers reliable events in order and tells the game when a machine drops", async () => {
			const { host, left, client } = await joined({ latency: 25, jitter: 40 });
			const events: unknown[] = [];
			client.on("event", (data: unknown) => { events.push(data); });
			for (let i = 0; i < 10; i++) host.event({ n: i });
			await jest.advanceTimersByTimeAsync(200);
			expect(events).toEqual(Array.from({ length: 10 }, (_, n) => ({ n })));

			client.destroy();
			await jest.advanceTimersByTimeAsync(10);
			expect(left).toHaveLength(1);
			expect(host.machines()).toHaveLength(0);
			host.destroy();
		});
	});
});
