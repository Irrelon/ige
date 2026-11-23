import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import { IgeNetSchema, type IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetHistory } from "@/engine/network/replication/IgeNetHistory";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetPacketInspector, igeNetReadInputPacket, igeNetWriteInputPacket } from "@/engine/network/replication/igeNetReplicationProtocol";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";

describe("IgeNetHistory", () => {
	it("records, blends between ticks, and answers one-sided", () => {
		const h = new IgeNetHistory(8, 2);
		h.record(10, "a", 0, 100);
		h.record(11, "a", 10, 90);
		expect(h.at("a", 10)).toEqual([0, 100]);
		expect(h.at("a", 10.5)).toEqual([5, 95]);
		expect(h.at("a", 11)).toEqual([10, 90]);
		expect(h.at("a", 11.5)).toEqual([10, 90]); // only the earlier side
		expect(h.at("a", 9.5)).toEqual([0, 100]); // only the later side
		expect(h.at("a", 8)).toBeUndefined();
		expect(h.at("nope", 10)).toBeUndefined();
		const out: number[] = [];
		expect(h.at("a", 10.25, out)).toBe(out);
		expect(out[0]).toBeCloseTo(2.5);
	});

	it("keeps a window, forgets and clears", () => {
		const h = new IgeNetHistory(IgeNetHistory.ticksFor(250, 30), 3);
		expect(h.ticks).toBe(11);
		for (let t = 1; t <= 40; t++) h.record(t, "a", t, 0, 0);
		expect(h.at("a", 40)![0]).toBe(40);
		expect(h.at("a", 30)![0]).toBe(30);
		expect(h.at("a", 29)).toBeUndefined(); // 11 ticks: 30..40
		expect(h.at("a", 41)).toBeUndefined();
		h.forget("a");
		expect(h.at("a", 40)).toBeUndefined();
		h.record(41, "b", 1, 2, 3);
		h.clear();
		expect(h.size()).toBe(0);
		expect(h.at("b", 41)).toBeUndefined();
	});

	it("an id missing for a tick has a gap there", () => {
		const h = new IgeNetHistory(8, 2);
		h.record(5, "a", 1, 1);
		h.record(7, "a", 3, 3);
		expect(h.at("a", 6)).toBeUndefined();
		expect(h.at("a", 6.5)).toEqual([3, 3]);
	});

	it("bounds memory by what was recorded recently and reuses arrays", () => {
		const h = new IgeNetHistory(6, 2);
		for (let t = 1; t <= 100; t++) h.record(t, `temp${t}`, t, t); // a new id every tick
		expect(h.size()).toBeLessThanOrEqual(12);
		for (let t = 101; t <= 140; t++) h.record(t, "steady", t, t);
		expect(h.size()).toBeLessThanOrEqual(2);
		expect(h.at("steady", 140)).toEqual([140, 140]);
	});
});

const inputSchema = new IgeNetSchema("input", { n: { type: "int", min: 0, max: 1000000 } });

describe("input packets with views", () => {
	it("round trips views and costs a few bytes", () => {
		const frames = [
			{ seq: 10, inputs: [{ n: 1 }], view: 120.25 },
			{ seq: 11, inputs: [{ n: 2 }], view: 121.3125 },
			{ seq: 12, inputs: [{ n: 3 }], view: 122.4 }
		];
		const withViews = new IgeNetBitWriter();
		igeNetWriteInputPacket(withViews, inputSchema, 5, 0, frames);
		const without = new IgeNetBitWriter();
		igeNetWriteInputPacket(without, inputSchema, 5, 0, frames.map(({ seq, inputs }) => ({ seq, inputs })));
		const extra = withViews.toBytes().length - without.toBytes().length;
		expect(extra).toBeLessThanOrEqual(5);
		const read = igeNetReadInputPacket(new IgeNetBitReader(withViews.toBytes()), inputSchema, 1);
		expect(read.frames.map((f) => f.seq)).toEqual([10, 11, 12]);
		expect(read.frames[0].view).toBe(120.25);
		expect(read.frames[1].view).toBe(121.3125);
		expect(read.frames[2].view).toBeCloseTo(122.4, 1);
		expect(read.frames[0].inputs[0].n).toBe(1);
		const inspected = new IgeNetPacketInspector(new IgeNetSchemaSet({}), inputSchema).describe(withViews.toBytes());
		expect((inspected.frames as { view: number }[])[0].view).toBe(120.25);
	});

	it("decodes packets without views as the present", () => {
		const w = new IgeNetBitWriter();
		igeNetWriteInputPacket(w, inputSchema, 0, 0, [{ seq: 1, inputs: [{ n: 4 }] }, { seq: 2, inputs: [{ n: 5 }] }]);
		const read = igeNetReadInputPacket(new IgeNetBitReader(w.toBytes()), inputSchema, 1);
		expect(read.frames.map((f) => f.view)).toEqual([undefined, undefined]);
		expect(read.frames[1].inputs[0].n).toBe(5);
	});
});

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	mover: { x: { type: "number", precision: 0.01 } },
	pilot: { x: { type: "number", precision: 0.01 } }
};
const inputDefs: Record<string, IgeNetFieldDef> = { n: { type: "int", min: 0, max: 1000000 } };
type Input = { n: number };
const TICK_MS = 1000 / 30;
const SPEED = 10; // units per tick

describe("lag compensation end to end", () => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	async function setup (latency: number, maxRewind?: number) {
		const net = igeNetLoopback({ latency });
		const history = new IgeNetHistory(IgeNetHistory.ticksFor(maxRewind ?? 250, 30), 1);
		const checks: { n: number; lag: number; rewound?: number; viewTick: number }[] = [];
		const host: IgeNetReplicationHost<Input> = new IgeNetReplicationHost<Input>(net.listener, {
			schemas: defs,
			inputSchema: inputDefs,
			sendRate: 30,
			maxRewind,
			join: (machine, players) => {
				machine.viewer.subscribe("world");
				return players.map((_, i) => {
					const id = `${machine.id}.${i}`;
					host.replicator.create("pilot", id, {}, { scope: "world" });
					return id;
				});
			},
			step: (_dt, tick, inputs) => {
				host.replicator.get("mover")?.write({ x: tick * SPEED });
				history.record(tick, "mover", tick * SPEED);
				inputs.forEach((input, id) => {
					checks.push({ n: input.n, lag: host.viewLag(id), viewTick: host.viewTick(id), rewound: history.at("mover", host.viewTick(id))?.[0] });
				});
			}
		});
		host.replicator.create("mover", "mover", { x: 0 }, { scope: "world" });
		const client = new IgeNetReplicationClient<Input>(net.connect(), { schemas: defs, inputSchema: inputDefs, pingInterval: 1000, now: () => Date.now(), interpolationDelay: 100 });
		const welcome = client.join([{}]);
		await jest.advanceTimersByTimeAsync(600);
		await welcome;
		const shown = new Map<number, number>();
		const frame = async () => {
			const x = (client.interpolated().mover as { x: number } | undefined)?.x;
			const n = client._seq + 1;
			client.sendInput([{ n }]);
			if (x !== undefined) shown.set(n, x);
			host.update(TICK_MS);
			await jest.advanceTimersByTimeAsync(TICK_MS);
		};
		return { host, client, history, checks, shown, frame };
	}

	it.each([40, 80])("the host's rewind matches what the client showed (latency %i ms)", async (latency) => {
		const { host, client, checks, shown, frame } = await setup(latency);
		for (let i = 0; i < 200; i++) await frame();
		let compared = 0;
		for (const c of checks.slice(80)) {
			const seen = shown.get(c.n);
			if (seen === undefined || c.rewound === undefined) continue;
			expect(Math.abs(c.rewound - seen)).toBeLessThan(SPEED * 0.25) // well under a tick: the view is sent in 1/16 ticks and the clock estimate shifts between pings;
			expect(c.lag).toBeGreaterThan(3); // at least the 100 ms of interpolation
			expect(c.lag).toBeLessThan(host.maxRewindTicks());
			compared++;
		}
		expect(compared).toBeGreaterThan(40);
		host.destroy();
		client.destroy();
	});

	it("clamps a lag over the cap to maxRewind", async () => {
		const { host, client, checks, frame } = await setup(250);
		for (let i = 0; i < 100; i++) await frame();
		const last = checks[checks.length - 1];
		expect(host.maxRewindTicks()).toBeCloseTo(7.5);
		expect(last.lag).toBeCloseTo(7.5, 5);
		expect(last.viewTick).toBeCloseTo(host.tick - 7.5, 5);
		host.destroy();
		client.destroy();
	});

	it("clamps spoofed views", async () => {
		const { host, client, checks, frame } = await setup(20);
		for (let i = 0; i < 30; i++) await frame();
		const send = (view: number) => {
			const w = new IgeNetBitWriter();
			const n = 900000 + checks.length;
			igeNetWriteInputPacket(w, client.inputSchema, 0, 0, [{ seq: ++client._seq, inputs: [{ n }], view }]);
			client._connection.send(w.toBytes(), false);
			return n;
		};
		let n = send(1e6); // in the future
		await jest.advanceTimersByTimeAsync(TICK_MS);
		host.update(TICK_MS * 2);
		await jest.advanceTimersByTimeAsync(TICK_MS * 3);
		expect(checks.find((c) => c.n === n)?.lag).toBe(0);
		n = send(0); // ancient
		await jest.advanceTimersByTimeAsync(TICK_MS);
		host.update(TICK_MS * 2);
		await jest.advanceTimersByTimeAsync(TICK_MS * 3);
		expect(checks.find((c) => c.n === n)?.lag).toBeCloseTo(host.maxRewindTicks(), 5);
		host.destroy();
		client.destroy();
	});

	it("a frame with no view is the present", async () => {
		const { host, client, checks } = await setup(10);
		client.sendInput([{ n: 777 }]); // interpolated() never called
		await jest.advanceTimersByTimeAsync(50);
		host.update(TICK_MS);
		await jest.advanceTimersByTimeAsync(TICK_MS);
		const c = checks.find((x) => x.n === 777)!;
		expect(c.lag).toBe(0);
		expect(c.viewTick).toBe(host.tick);
		host.destroy();
		client.destroy();
	});
});
