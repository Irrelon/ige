import { IgeNetSyncHost } from "@/engine/network/sync/IgeNetSyncHost";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/sync/IgeNetTransport";

/**
 * Old host against new host on the same synthetic world (Starflight-shaped): one scope with 140 static
 * rocks, 5 stations with a 40-row market table that changes now and then, and N ships (position,
 * velocity, heading and a few flags, written every tick), seen by N connections, 30 sends a second.
 *
 * Skipped unless NET_BENCH=1:
 *     NET_BENCH=1 npx jest src/tests/IgeNetBench.test.ts
 * Prints a table of CPU milliseconds per second of update() (the game's per-tick writes and the sends,
 * with each message serialised as a real transport would) and bytes per connection per second.
 */
const run = process.env.NET_BENCH ? describe : describe.skip;

const TICK = 30;
const WARMUP = 15;
const MEASURED = 90;
const SIZES = (process.env.NET_BENCH_SIZES ?? "10,50,100,200").split(",").map(Number);

/** A connection that only counts: JSON messages are stringified (as a WebSocket would), binary ones counted as they are. */
function sink () {
	let listener: ((m: unknown) => void) | undefined;
	const state = { bytes: 0, tick: 0, send: (m: unknown) => {} };
	const connection: IgeNetConnection = {
		send: (m) => {
			if (m instanceof Uint8Array) state.bytes += m.length;
			else {
				state.bytes += JSON.stringify(m).length;
				if ((m as { t: string }).t === "snap") state.tick = (m as { tick: number }).tick;
			}
		},
		onMessage: (fn) => { listener = fn; },
		onClose: () => {},
		close: () => {}
	};
	return { connection, state, deliver: (m: unknown) => listener?.(m) };
}

function listener (): { listener: IgeNetListener; accept: (c: IgeNetConnection) => void } {
	let fn: ((c: IgeNetConnection) => void) | undefined;
	return { listener: { onConnection: (f) => { fn = f; }, close: () => {} }, accept: (c) => fn?.(c) };
}

function rockState (i: number) {
	return { kind: "rock", x: (i * 37) % 2000, y: (i * 91) % 2000, name: `Asteroid ${i}-${(i * 7919) % 1000}`, type: ["iron", "ice", "silicate"][i % 3], size: 3 + (i % 9), resources: { iron: i % 50, ice: (i * 3) % 40, rare: i % 5 } };
}
function marketRows (station: number, version: number) {
	return Array.from({ length: 40 }, (_, row) => ({ good: `good-${row}`, price: 100 + ((row * 13 + station * 7 + (row % 3 === 0 ? version : 0)) % 90), stock: 50 + ((row * 31 + station) % 400), demand: (row * 17) % 100 }));
}
const shipAt = (i: number, tick: number) => {
	const a = tick / 40 + i;
	return { x: 1000 + Math.cos(a) * (200 + i), y: 1000 + Math.sin(a) * (200 + i), vx: -Math.sin(a) * 30, vy: Math.cos(a) * 30, heading: (a + Math.PI / 2) % (Math.PI * 2), thrust: (tick + i) % 20 < 12, boost: (tick + i) % 50 < 5, firing: (tick + i * 3) % 30 < 4, shield: 100 - ((tick + i) % 40), name: `Pilot ${i}` };
};

const newDefs: Record<string, Record<string, IgeNetFieldDef>> = {
	rock: { x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, name: { type: "string" }, type: { type: "enum", values: ["iron", "ice", "silicate"] }, size: { type: "int" }, resources: { type: "json" } },
	station: { x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, name: { type: "string" }, market: { type: "json" } },
	ship: {
		x: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, vx: { type: "number", precision: 0.1 }, vy: { type: "number", precision: 0.1 },
		heading: { type: "angle", bits: 9 }, thrust: { type: "bool" }, boost: { type: "bool" }, firing: { type: "bool" }, shield: { type: "int", min: 0, max: 127 }, name: { type: "string" }
	}
};

function benchOld (n: number) {
	const world: Record<string, Record<string, unknown>> = {};
	for (let i = 0; i < 140; i++) world[`rock${i}`] = rockState(i);
	for (let s = 0; s < 5; s++) world[`station${s}`] = { kind: "station", x: s * 300, y: s * 200, name: `Station ${s}`, market: marketRows(s, 0) };
	const net = listener();
	const sinks: ReturnType<typeof sink>[] = [];
	const ids: string[] = [];
	const host = new IgeNetSyncHost<unknown>(net.listener, {
		tickRate: TICK,
		snapshotRate: TICK,
		join: (machine) => {
			const id = `ship${ids.length}`;
			ids.push(id);
			world[id] = { kind: "ship", ...shipAt(ids.length - 1, 0) };
			return [id];
		},
		step: (dt, tick) => {
			ids.forEach((id, i) => Object.assign(world[id], shipAt(i, tick)));
			if (tick % 60 === 0) world[`station${(tick / 60) % 5}`].market = marketRows((tick / 60) % 5, tick);
		},
		snapshot: () => world as any
	});
	for (let i = 0; i < n; i++) {
		const s = sink();
		sinks.push(s);
		net.accept(s.connection);
		s.deliver({ t: "join", ref: 1, players: [{}] });
	}
	return { host, sinks, ack: () => sinks.forEach((s) => s.deliver({ t: "input", frames: [], snap: s.state.tick })) };
}

function benchNew (n: number) {
	const net = listener();
	const sinks: ReturnType<typeof sink>[] = [];
	const ids: string[] = [];
	const host = new IgeNetReplicationHost<Record<string, unknown>>(net.listener, {
		schemas: newDefs,
		tickRate: TICK,
		sendRate: TICK,
		join: (machine) => {
			machine.viewer.subscribe("sol");
			const id = `ship${ids.length}`;
			ids.push(id);
			host.replicator.create("ship", id, shipAt(ids.length - 1, 0), { scope: "sol" });
			return [id];
		},
		step: (dt, tick) => {
			ids.forEach((id, i) => host.replicator.get(id)!.write(shipAt(i, tick)));
			if (tick % 60 === 0) {
				const s = (tick / 60) % 5;
				host.replicator.get(`station${s}`)!.write({ market: marketRows(s, tick) });
			}
		}
	});
	for (let i = 0; i < 140; i++) {
		const { kind, ...fields } = rockState(i);
		host.replicator.create("rock", `rock${i}`, fields, { scope: "sol" });
	}
	for (let s = 0; s < 5; s++) host.replicator.create("station", `station${s}`, { x: s * 300, y: s * 200, name: `Station ${s}`, market: marketRows(s, 0) }, { scope: "sol" });
	for (let i = 0; i < n; i++) {
		const s = sink();
		sinks.push(s);
		net.accept(s.connection);
		s.deliver({ t: "join", ref: 1, players: [{}] });
	}
	return { host, sinks };
}

function measure (host: { update: (ms: number) => void }, sinks: ReturnType<typeof sink>[], afterTick?: () => void) {
	for (let i = 0; i < WARMUP; i++) {
		host.update(1000 / TICK);
		afterTick?.();
	}
	const bytes0 = sinks.reduce((sum, s) => sum + s.state.bytes, 0);
	let ms = 0;
	for (let i = 0; i < MEASURED; i++) {
		const t = performance.now();
		host.update(1000 / TICK);
		ms += performance.now() - t;
		afterTick?.();
	}
	const seconds = MEASURED / TICK;
	const bytes = sinks.reduce((sum, s) => sum + s.state.bytes, 0) - bytes0;
	return { cpuMsPerSecond: ms / seconds, bytesPerConnectionPerSecond: bytes / sinks.length / seconds };
}

run("old sync host against the replication host", () => {
	it("prints the table", () => {
		const rows: string[] = [];
		rows.push("| N | old CPU ms/s | new CPU ms/s | CPU ratio | old bytes/conn/s | new bytes/conn/s | bytes ratio |");
		rows.push("|---|---|---|---|---|---|---|");
		for (const n of SIZES) {
			const old = benchOld(n);
			const a = measure(old.host, old.sinks, old.ack);
			old.host.destroy();
			const fresh = benchNew(n);
			const b = measure(fresh.host, fresh.sinks);
			fresh.host.destroy();
			rows.push(`| ${n} | ${a.cpuMsPerSecond.toFixed(1)} | ${b.cpuMsPerSecond.toFixed(1)} | ${(a.cpuMsPerSecond / b.cpuMsPerSecond).toFixed(1)}x | ${Math.round(a.bytesPerConnectionPerSecond)} | ${Math.round(b.bytesPerConnectionPerSecond)} | ${(a.bytesPerConnectionPerSecond / b.bytesPerConnectionPerSecond).toFixed(1)}x |`);
		}
		console.log(`\n${rows.join("\n")}\n`);
	}, 600000);
});
