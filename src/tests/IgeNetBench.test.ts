import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import type { IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import type { IgeNetConnection, IgeNetListener } from "@/engine/network/transport/IgeNetTransport";

/**
 * The replication host on a synthetic world (Starflight-shaped): one scope with 140 static
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
const MEASURED = Number(process.env.NET_BENCH_TICKS ?? 90);
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

function measure (host: { update: (ms: number) => void }, sinks: ReturnType<typeof sink>[], afterTick?: () => void, warmup = WARMUP) {
	for (let i = 0; i < warmup; i++) {
		host.update(1000 / TICK);
		afterTick?.();
	}
	const bytes0 = sinks.reduce((sum, s) => sum + s.state.bytes, 0);
	const each0 = sinks.map((s) => s.state.bytes);
	let ms = 0;
	for (let i = 0; i < MEASURED; i++) {
		const t = process.cpuUsage();
		host.update(1000 / TICK);
		const used = process.cpuUsage(t);
		ms += (used.user + used.system) / 1000;
		afterTick?.();
	}
	const seconds = MEASURED / TICK;
	const bytes = sinks.reduce((sum, s) => sum + s.state.bytes, 0) - bytes0;
	const worst = Math.max(...sinks.map((s, i) => s.state.bytes - each0[i])) / seconds;
	return { cpuMsPerSecond: ms / seconds, bytesPerConnectionPerSecond: bytes / sinks.length / seconds, worstBytesPerSecond: worst };
}

run("the replication host", () => {
	it("prints the table", () => {
		const rows: string[] = [];
		rows.push("| N | CPU ms/s | bytes/conn/s |");
		rows.push("|---|---|---|");
		for (const n of SIZES) {
			const fresh = benchNew(n);
			const b = measure(fresh.host, fresh.sinks);
			fresh.host.destroy();
			rows.push(`| ${n} | ${b.cpuMsPerSecond.toFixed(1)} | ${Math.round(b.bytesPerConnectionPerSecond)} |`);
		}
		console.log(`\n${rows.join("\n")}\n`);
	}, 600000);
});

/**
 * Stage 2: a crowd of N ships spread over 20 km by 20 km (the pilot's near range is 2.2 km), every ship moving every tick,
 * plus the static rocks and stations, N connections, 30 sends a second, 32 KB/s per connection. Stage 1 (every ship in every
 * packet, no relevance) against stage 2 (detail near, blips far, budget) on the same world.
 *
 *     NET_BENCH=1 NET_BENCH_SIZES=100,200,400 npx jest src/tests/IgeNetBench.test.ts -t crowd
 */
const AREA = 20000;
const crowdShip = (i: number, tick: number) => {
	const homeX = ((i * 7919) % 1000) / 1000 * AREA, homeZ = ((i * 104729) % 1000) / 1000 * AREA;
	const a = tick / 40 + i;
	return { x: homeX + Math.cos(a) * 200, z: homeZ + Math.sin(a) * 200, vx: -Math.sin(a) * 30, vz: Math.cos(a) * 30, heading: (a + Math.PI / 2) % (Math.PI * 2), thrust: (tick + i) % 20 < 12, boost: (tick + i) % 50 < 5, firing: (tick + i * 3) % 30 < 4, shield: 100 - ((tick + i) % 40), name: `Pilot ${i}` };
};
const crowdDefs: Record<string, Record<string, IgeNetFieldDef>> = {
	rock: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string" }, type: { type: "enum", values: ["iron", "ice", "silicate"] }, size: { type: "int" }, resources: { type: "json" } },
	station: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string" }, market: { type: "json" } },
	ship: {
		x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, vx: { type: "number", precision: 0.1 }, vz: { type: "number", precision: 0.1 },
		heading: { type: "angle", bits: 9 }, thrust: { type: "bool" }, boost: { type: "bool" }, firing: { type: "bool" }, shield: { type: "int", min: 0, max: 127 }, name: { type: "string" }
	}
};

function benchCrowd (n: number, stage2: boolean) {
	const net = listener();
	const sinks: ReturnType<typeof sink>[] = [];
	const ids: string[] = [];
	const host: IgeNetReplicationHost<Record<string, unknown>> = new IgeNetReplicationHost<Record<string, unknown>>(net.listener, {
		schemas: crowdDefs,
		kinds: stage2 ? { ship: { relevance: "spatial", position: ["x", "z"] }, rock: { relevance: "scope" }, station: { relevance: "scope" } } : undefined,
		relevance: stage2 ? { bandwidth: 32768, nearRadius: 2200, cellSize: 1100, blipRate: 2 } : undefined,
		tickRate: TICK,
		sendRate: TICK,
		join: (machine) => {
			machine.viewer.subscribe("sol");
			const id = `ship${ids.length}`;
			ids.push(id);
			const ship = host.replicator.create("ship", id, crowdShip(ids.length - 1, 0), { scope: "sol" });
			if (stage2) machine.viewer.addInterest(ship);
			return [id];
		},
		step: (dt, tick) => {
			ids.forEach((id, i) => host.replicator.get(id)!.write(crowdShip(i, tick)));
			if (tick % 60 === 0) {
				const s = (tick / 60) % 5;
				host.replicator.get(`station${s}`)!.write({ market: marketRows(s, tick) });
			}
		}
	});
	for (let i = 0; i < 140; i++) {
		const r = rockState(i);
		host.replicator.create("rock", `rock${i}`, { x: r.x * 10, z: r.y * 10, name: r.name, type: r.type, size: r.size, resources: r.resources }, { scope: "sol" });
	}
	for (let s = 0; s < 5; s++) host.replicator.create("station", `station${s}`, { x: s * 3000, z: s * 2000, name: `Station ${s}`, market: marketRows(s, 0) }, { scope: "sol" });
	for (let i = 0; i < n; i++) {
		const s = sink();
		sinks.push(s);
		net.accept(s.connection);
		s.deliver({ t: "join", ref: 1, players: [{}] });
	}
	return { host, sinks };
}

run("stage 1 against stage 2 on a crowd", () => {
	it("prints the crowd table", () => {
		const rows: string[] = [];
		rows.push("| N | stage 1 CPU ms/s | stage 2 CPU ms/s | CPU ratio | stage 1 bytes/conn/s | stage 2 bytes/conn/s | bytes ratio | stage 2 busiest conn bytes/s |");
		rows.push("|---|---|---|---|---|---|---|---|");
		for (const n of SIZES) {
			const only = process.env.NET_BENCH_STAGE;
			const one = only === "2" ? benchCrowd(1, false) : benchCrowd(n, false);
			const a = only === "2" ? { cpuMsPerSecond: NaN, bytesPerConnectionPerSecond: NaN, worstBytesPerSecond: NaN } : measure(one.host, one.sinks, undefined, 60);
			one.host.destroy();
			const two = benchCrowd(n, true);
			const b = measure(two.host, two.sinks, undefined, 90);
			two.host.destroy();
			rows.push(`| ${n} | ${a.cpuMsPerSecond.toFixed(1)} | ${b.cpuMsPerSecond.toFixed(1)} | ${(a.cpuMsPerSecond / b.cpuMsPerSecond).toFixed(1)}x | ${Math.round(a.bytesPerConnectionPerSecond)} | ${Math.round(b.bytesPerConnectionPerSecond)} | ${(a.bytesPerConnectionPerSecond / b.bytesPerConnectionPerSecond).toFixed(1)}x | ${Math.round(b.worstBytesPerSecond)} |`);
		}
		console.log(`\n${rows.join("\n")}\n`);
	}, 900000);
});
