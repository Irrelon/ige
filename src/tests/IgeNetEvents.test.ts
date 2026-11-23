import { IgeNetSchemaSet, type IgeNetFieldDef, type IgeNetKindOptions, type IgeNetEventDefs } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetReplicator, type IgeNetObject } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetPacketInspector } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	ship: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string", group: "id" } },
	pod: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 } },
	gate: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 } }
};
const kinds: Record<string, IgeNetKindOptions> = {
	ship: { relevance: "spatial", position: ["x", "z"], removeReasons: ["destroyed", "jumped"] },
	pod: { relevance: "spatial", position: ["x", "z"], blip: false, removeReasons: ["destroyed", "jumped"] },
	gate: { relevance: "scope" }
};
const events: IgeNetEventDefs = {
	boom: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, size: { type: "int", min: 0, max: 7 }, tag: { type: "string", optional: true } },
	pop: { n: { type: "int" } },
	note: { text: { type: "json" }, kind: { type: "enum", values: ["a", "b"] } }
};
const schemas = new IgeNetSchemaSet(defs, kinds, events);

function make (options: Record<string, unknown> = {}) {
	return new IgeNetReplicator(schemas, { sendRate: 30, nearRadius: 500, cellSize: 500, ...options });
}

/** A viewer that keeps its packets, read by an inspector. */
function watch (rep: IgeNetReplicator, at?: { x: number; z: number }, options: { lossy?: boolean; subscribe?: boolean } = {}) {
	const packets: Uint8Array[] = [];
	const described: any[] = [];
	const inspector = new IgeNetPacketInspector(schemas);
	const viewer = rep.addViewer((bytes) => {
		packets.push(bytes);
		described.push(inspector.describe(bytes));
	}, options);
	if (options.subscribe !== false) viewer.subscribe("sol");
	if (at) viewer.addInterest(at, { radius: 500 });
	return { viewer, packets, described, events: (from = 0) => described.slice(from).flatMap((d) => d.eventList ?? []).map((e: any) => e.data) };
}

describe("events in replication packets", () => {
	function world () {
		const rep = make();
		const a = watch(rep, { x: 0, z: 0 });
		const b = watch(rep, { x: 3000, z: 0 });
		const c = watch(rep, { x: 0, z: 0 }, { subscribe: false });
		const near = rep.create("ship", "near", { x: 10, z: 0 }, { scope: "sol" });
		const far = rep.create("ship", "far", { x: 3010, z: 0 }, { scope: "sol" });
		rep.flush();
		return { rep, a, b, c, near, far };
	}

	it("targets none (everyone), one viewer, objects held in full, a spot, a scope and unions", () => {
		const { rep, a, b, c, near, far } = world();
		const seen = (w: ReturnType<typeof watch>, from: number) => w.events(from).map((e: any) => e.n);
		const marks = [a, b, c].map((w) => w.described.length);
		rep.event({ t: "pop", n: 1 });
		rep.event({ t: "pop", n: 2 }, { to: b.viewer });
		rep.event({ t: "pop", n: 3 }, { on: near });
		rep.event({ t: "pop", n: 4 }, { on: [near, far] });
		rep.event({ t: "pop", n: 5 }, { at: { scope: "sol", x: 3000, z: 100 } });
		rep.event({ t: "pop", n: 6 }, { at: { scope: "sol", x: 1500, z: 0 } });
		rep.event({ t: "pop", n: 7 }, { scope: "sol" });
		rep.event({ t: "pop", n: 8 }, { on: near, at: { scope: "sol", x: 3000, z: 0 } });
		rep.event({ t: "pop", n: 9 }, { on: [] });
		rep.flush();
		expect(seen(a, marks[0])).toEqual([1, 3, 4, 7, 8]);
		expect(seen(b, marks[1])).toEqual([1, 2, 4, 5, 7, 8]);
		expect(seen(c, marks[2])).toEqual([1]);
	});

	it("holds an object in full only while in range, and an event on one just made reaches those in range", () => {
		const { rep, a, b } = world();
		const marks = [a.described.length, b.described.length];
		const fresh = rep.create("ship", "fresh", { x: 20, z: 0 }, { scope: "sol" });
		rep.event({ t: "pop", n: 1 }, { on: fresh });
		rep.flush();
		expect(a.events(marks[0]).map((e: any) => e.n)).toEqual([1]);
		expect(b.events(marks[1])).toEqual([]);
		// The create is in the same packet, ahead of nothing the client needs: events decode after it
		expect(a.described[marks[0]].creates.map((c: any) => c.id)).toContain("fresh");
	});

	it("sends declared events in their binary shape and undeclared ones as JSON", () => {
		const { rep, a } = world();
		const mark = a.described.length;
		rep.event({ t: "boom", x: 12.34, z: -5, size: 3, tag: "big" }, { reliable: false });
		rep.event({ t: "note", text: { a: [1, 2] }, kind: "b" });
		rep.event({ t: "mystery", extra: [1, "two", { three: 3 }] });
		rep.flush();
		const list = a.events(mark);
		expect(list).toEqual([{ t: "boom", x: 12.3, z: -5, size: 3, tag: "big" }, { t: "note", text: { a: [1, 2] }, kind: "b" }, { t: "mystery", extra: [1, "two", { three: 3 }] }]);
		// A declared "boom" is a handful of bytes, not a JSON message
		const solo = make();
		const w = watch(solo, { x: 0, z: 0 });
		solo.flush();
		const base = w.packets[w.packets.length - 1].length;
		solo.event({ t: "boom", x: 12.3, z: -5, size: 3, tag: "big" });
		solo.flush();
		const withEvent = w.packets[w.packets.length - 1].length;
		expect(withEvent - base).toBeLessThan(14);
		expect(JSON.stringify({ t: "boom", x: 12.3, z: -5, size: 3, tag: "big" }).length).toBeGreaterThan(40);
	});

	it("changes the schema hash with the events and removal reasons", () => {
		expect(new IgeNetSchemaSet(defs, kinds, events).hash).not.toBe(new IgeNetSchemaSet(defs, kinds).hash);
		expect(new IgeNetSchemaSet(defs, kinds, events).hash).not.toBe(new IgeNetSchemaSet(defs, kinds, { ...events, pop: { n: { type: "bool" } } }).hash);
		expect(new IgeNetSchemaSet(defs, kinds).hash).not.toBe(new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, removeReasons: ["x"] } }).hash);
	});

	it("counts events against the viewer's budget: they go first and updates fill what's left", () => {
		const run = (eventsPerRound: number) => {
			const rep = make({ bandwidth: 6000, carry: 1 });
			const w = watch(rep, { x: 0, z: 0 });
			const ships: IgeNetObject[] = [];
			for (let i = 0; i < 60; i++) ships.push(rep.create("ship", `s${i}`, { x: i, z: 0, name: `ship ${i}` }, { scope: "sol" }));
			for (let i = 0; i < 10; i++) rep.flush();
			let entries = 0;
			let eventBytes = 0;
			for (let round = 0; round < 20; round++) {
				for (const ship of ships) ship.write({ x: (ship.get("x") as number) + 1 });
				for (let e = 0; e < eventsPerRound; e++) rep.event({ t: "boom", x: e, z: 0, size: 1 }, { at: { scope: "sol", x: 0, z: 0 } });
				rep.flush();
				entries += w.viewer.stats.entries;
			}
			eventBytes = w.viewer.stats.eventBytes;
			return { entries, eventBytes, stats: rep.stats, rate: w.viewer.stats.bytes };
		};
		const quiet = run(0);
		const busy = run(12);
		expect(quiet.eventBytes).toBe(0);
		expect(busy.eventBytes).toBeGreaterThan(12 * 20 * 3);
		expect(busy.stats.events).toBe(12 * 20);
		expect(busy.entries).toBeLessThan(quiet.entries);
	});

	it("tells viewers why an object was removed only when they held it in full, never on leaving sight", () => {
		const rep = make();
		const near = watch(rep, { x: 0, z: 0 });
		const far = watch(rep, { x: 3000, z: 0 });
		const ship = rep.create("ship", "s", { x: 5, z: 0, name: "s" }, { scope: "sol" });
		const pod = rep.create("pod", "p", { x: 5, z: 0 }, { scope: "sol" });
		const jumper = rep.create("pod", "j", { x: 6, z: 0 }, { scope: "sol" });
		for (let i = 0; i < 3; i++) rep.flush();
		const destroys = (w: ReturnType<typeof watch>, from: number) => w.described.slice(from).flatMap((d) => d.destroys);
		let marks = [near.described.length, far.described.length];
		ship.destroy("destroyed");
		rep.destroy("p", "jumped");
		rep.flush();
		expect(destroys(near, marks[0])).toEqual(expect.arrayContaining([expect.objectContaining({ id: "s", reason: "destroyed" }), expect.objectContaining({ id: "p", reason: "jumped" })]));
		// The far viewer had a blip: it's told nothing of why, and not even the id
		const farDestroys = destroys(far, marks[1]);
		expect(farDestroys.length).toBeGreaterThan(0);
		for (const d of farDestroys) expect(d.reason).toBeUndefined();
		// Out of range: a pod of a kind with no blips goes with no reason
		marks = [near.described.length, far.described.length];
		near.viewer.clearInterests();
		near.viewer.addInterest({ x: 4000, z: 0 }, { radius: 500 });
		rep.flush();
		const left = destroys(near, marks[0]);
		expect(left).toEqual([expect.objectContaining({ id: "j" })]);
		expect(left[0].reason).toBeUndefined();
		expect(jumper.destroyed).toBe(false);
		expect(() => rep.destroy("j", "nonsense")).toThrow(/removeReasons/);
	});
});

describe("events over a network", () => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	const inputDefs: Record<string, IgeNetFieldDef> = { dx: { type: "number", precision: 0.1, min: -1, max: 1 } };

	function setup (options: { lossy?: boolean; loss?: number; latency?: number; jitter?: number } = {}) {
		const net = igeNetLoopback({ latency: options.latency ?? 20, jitter: options.jitter ?? 0, loss: options.loss ?? 0 });
		const host = new IgeNetReplicationHost(net.listener, {
			schemas: defs, kinds, events, inputSchema: inputDefs, lossy: options.lossy, tickRate: 30, sendRate: 30,
			join: (machine, players) => {
				machine.viewer.subscribe("sol");
				return players.map((_, i) => {
					const id = `${machine.id}.${i}`;
					const ship = host.replicator.create("ship", id, { x: 0, z: 0, name: "me" }, { scope: "sol" });
					machine.viewer.addInterest(ship, { radius: 500 });
					return id;
				});
			},
			step: () => undefined
		});
		const client = new IgeNetReplicationClient(net.connect(), { schemas: defs, kinds, events, inputSchema: inputDefs, pingInterval: 0, now: () => Date.now() });
		return { host, client, net };
	}

	async function play (host: IgeNetReplicationHost, client: IgeNetReplicationClient, ticks: number, each?: (i: number) => void) {
		for (let i = 0; i < ticks; i++) {
			client.sendInput([{ dx: 0 }]);
			each?.(i);
			host.update(1000 / 30);
			await jest.advanceTimersByTimeAsync(1000 / 30);
		}
	}

	it("delivers reliable events exactly once and in order through 20% loss, and never resends unreliable ones", async () => {
		let seed = 7;
		const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
		const { host, client } = setup({ lossy: true, loss: 0.2, latency: 30, jitter: 20 });
		const welcome = client.join([{}]);
		await jest.advanceTimersByTimeAsync(400);
		await welcome;
		const reliable: number[] = [];
		const unreliable: number[] = [];
		const ticks: number[] = [];
		client.on("event", (data: any, tick: number) => {
			if (data.t === "pop") {
				reliable.push(data.n);
				ticks.push(tick);
			}
			if (data.t === "boom") unreliable.push(data.size);
		});
		let n = 0;
		await play(host, client, 120, (i) => {
			for (let e = 0; e < 2; e++) host.event({ t: "pop", n: ++n });
			host.event({ t: "boom", x: 0, z: 0, size: i % 8 }, { reliable: false });
		});
		await play(host, client, 60);
		expect(reliable).toEqual(Array.from({ length: n }, (_, i) => i + 1));
		expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
		// Unreliable: each at most once, none made up, and with 20% loss some are gone (the host never resent them)
		expect(unreliable.length).toBeLessThan(120);
		expect(unreliable.length).toBeGreaterThan(60);
		spy.mockRestore();
		host.destroy();
		client.destroy();
	});

	it("delivers an event about an object made in the same packet after the create, with the old call still working", async () => {
		const { host, client } = setup();
		const welcome = client.join([{}]);
		await jest.advanceTimersByTimeAsync(300);
		await welcome;
		const log: string[] = [];
		client.on("created", (obj: any) => { if (obj.id === "late") log.push(`created ${obj.id}`); });
		client.on("event", (data: any) => { log.push(`event ${data.t ?? data.old} object ${client.objects.has("late")}`); });
		await play(host, client, 3);
		const late = host.replicator.create("ship", "late", { x: 5, z: 0, name: "late" }, { scope: "sol" });
		host.event({ t: "pop", n: 1 }, { on: late });
		host.event({ old: "untargeted" });
		await play(host, client, 10);
		expect(log).toEqual(["created late", "event pop object true", "event untargeted object true"]);
		host.destroy();
		client.destroy();
	});

	it("gives the client's destroyed event the reason and the object's last values, none when it left sight", async () => {
		const { host, client } = setup();
		const welcome = client.join([{}]);
		await jest.advanceTimersByTimeAsync(300);
		await welcome;
		const seen: { id: string; kind: string; reason?: string; x?: unknown }[] = [];
		client.on("destroyed", (id: string, kind: string, reason: string | undefined, obj: any) => { seen.push({ id, kind, reason, x: obj?.states[obj.states.length - 1].values.x }); });
		const lost = host.replicator.create("pod", "lost", { x: 30, z: 0 }, { scope: "sol" });
		const jumper = host.replicator.create("ship", "jumper", { x: 40, z: 0, name: "j" }, { scope: "sol" });
		await play(host, client, 6);
		jumper.destroy("jumped");
		await play(host, client, 6);
		lost.write({ x: 2000 });
		await play(host, client, 6);
		expect(seen).toEqual([{ id: "jumper", kind: "ship", reason: "jumped", x: 40 }, { id: "lost", kind: "pod", reason: undefined, x: 30 }]);
		host.destroy();
		client.destroy();
	});
});
