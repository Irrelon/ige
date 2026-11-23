import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import { igeNetApplyJsonPatch, igeNetJsonDiff, igeNetReadJsonPatch, igeNetWriteJsonPatch } from "@/engine/network/replication/igeNetJsonDelta";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicator, type IgeNetObject, type IgeNetReplicatorOptions } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(list: T[]): T => list[Math.floor(rnd() * list.length)];

function prim (): unknown {
	return pick([() => Math.floor(rnd() * 1000), () => Math.round(rnd() * 1e4) / 100, () => `s${Math.floor(rnd() * 50)}`, () => rnd() < 0.5, () => null])();
}

function value (depth = 0): unknown {
	const r = rnd();
	if (depth > 3 || r < 0.35) return prim();
	if (r < 0.7) {
		const out: Record<string, unknown> = {};
		const n = Math.floor(rnd() * 6);
		for (let i = 0; i < n; i++) out[pick(["a", "b", "c", "d", "e", "f", "7", "__proto__"])] = value(depth + 1);
		return out;
	}
	return Array.from({ length: Math.floor(rnd() * 6) }, () => value(depth + 1));
}

/** A changed copy: values changed deep down, keys added, removed or moved, items pushed, popped or put in front. */
function mutate (v: unknown, depth = 0): unknown {
	if (rnd() < 0.15) return value(depth);
	if (Array.isArray(v)) {
		let out = v.map((x) => (rnd() < 0.3 ? mutate(x, depth + 1) : x));
		const r = rnd();
		if (r < 0.2) out.push(value(depth + 1));
		else if (r < 0.3) out.pop();
		else if (r < 0.4) out = [value(depth + 1), ...out];
		return out;
	}
	if (v && typeof v === "object") {
		let entries = Object.entries(v).filter(() => rnd() > 0.15).map(([k, x]) => [k, rnd() < 0.3 ? mutate(x, depth + 1) : x] as [string, unknown]);
		if (rnd() < 0.3) entries.push([pick(["g", "h", "a", "b"]), value(depth + 1)]);
		if (rnd() < 0.15) entries = entries.reverse();
		const out: Record<string, unknown> = {};
		for (const [k, x] of entries) Object.defineProperty(out, k, { value: x, enumerable: true, writable: true, configurable: true });
		return out;
	}
	return rnd() < 0.5 ? prim() : v;
}

const parsed = (v: unknown) => JSON.parse(JSON.stringify(v) ?? "null");

function roundTrip (a: unknown, b: unknown): unknown {
	const patch = igeNetJsonDiff(a, b);
	if (!patch) return a;
	const w = new IgeNetBitWriter();
	igeNetWriteJsonPatch(w, patch);
	return igeNetApplyJsonPatch(a, igeNetReadJsonPatch(new IgeNetBitReader(w.toBytes())));
}

/** A crew-sized record (about 3 KB). */
function crew (clock: number) {
	return {
		roster: Array.from({ length: 24 }, (_, i) => ({ id: `m${i}`, name: `Crew member ${i}`, hp: 100 - i, kit: ["rifle", "vest", "medkit"], wound: 0 })),
		clock,
		station: "valeria1"
	};
}

describe("json patches", () => {
	it("turn any value into any other exactly (key order too), without changing the base", () => {
		seed = 7;
		for (let i = 0; i < 3000; i++) {
			const a = parsed(value());
			const b = parsed(mutate(a));
			const before = JSON.stringify(a);
			expect(JSON.stringify(roundTrip(a, b))).toBe(JSON.stringify(b));
			expect(JSON.stringify(a)).toBe(before);
		}
	});

	it("cost a few bytes for a small change inside a big record", () => {
		const a = parsed(crew(100));
		const b = parsed(crew(105));
		const w = new IgeNetBitWriter();
		igeNetWriteJsonPatch(w, igeNetJsonDiff(a, b)!);
		expect(JSON.stringify(b).length).toBeGreaterThan(2000);
		expect(w.toBytes().length).toBeLessThan(16);
	});

	it("keep a key named __proto__ as a key", () => {
		const a = JSON.parse('{"__proto__":{"x":1},"y":2}');
		const b = JSON.parse('{"__proto__":{"x":2},"y":2}');
		const out = roundTrip(a, b) as Record<string, unknown>;
		expect(JSON.stringify(out)).toBe(JSON.stringify(b));
		expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
	});
});

const defs = {
	rec: {
		n: { type: "int" as const },
		big: { type: "json" as const, optional: true },
		hot: { type: "number" as const, precision: 0.1, group: "hot" }
	},
	ship: { x: { type: "number" as const, precision: 0.1 }, z: { type: "number" as const, precision: 0.1 } }
};
const kinds = { ship: { relevance: "spatial" as const, position: ["x", "z"], blip: false as const }, rec: { separateGroups: true } };
const fake = { send () {}, onMessage () {}, onClose () {}, close () {} };

/**
 * A replicator and one machine fed its packets: delivered at once, or (lossy) some lost and some late, with the machine's
 * acknowledgements going back.
 */
function rig (options: IgeNetReplicatorOptions = {}, net: { lossy?: boolean; loss?: number; late?: number } = {}) {
	const set = new IgeNetSchemaSet(defs, kinds);
	const replicator = new IgeNetReplicator(set, { sendRate: 30, ...options });
	const client = new IgeNetReplicationClient(fake as never, { schemas: set, pingInterval: 0 });
	const errors: string[] = [];
	client.on("error", (e: string) => {
		errors.push(e);
	});
	const inFlight: { bytes: Uint8Array; due: number }[] = [];
	const rounds: number[][] = [];
	let tick = 0;
	let lossOn = true;
	const viewer = replicator.addViewer((bytes) => {
		rounds[rounds.length - 1].push(bytes.length);
		if (net.lossy && lossOn && rnd() < (net.loss ?? 0)) return;
		inFlight.push({ bytes, due: tick + (net.lossy && lossOn ? Math.floor(rnd() * (net.late ?? 0)) : 0) });
	}, { lossy: net.lossy });
	viewer.subscribe("sol");
	viewer.addInterest({ x: 0, z: 0 }, { radius: 5000 });
	const round = () => {
		tick++;
		replicator.tick = tick;
		rounds.push([]);
		replicator.flush();
		// Late ones arrive in a jumbled order
		const due = inFlight.filter((p) => p.due <= tick);
		for (const p of due) inFlight.splice(inFlight.indexOf(p), 1);
		if (due.length > 1 && net.lossy) due.sort(() => rnd() - 0.5);
		for (const p of due) client._onPacket(p.bytes);
		if (net.lossy) viewer.ack(client._recvSeq, client._recvBits);
	};
	const calm = () => {
		lossOn = false;
	};
	/** The machine's copy of an object as JSON text (to compare with the authority's). */
	const copy = (id: string) => {
		const values = client.latest(id);
		return values ? JSON.stringify(values) : undefined;
	};
	const truth = (obj: IgeNetObject) => JSON.stringify(Object.fromEntries(Object.entries(obj.values).map(([k, v]) => [k, v === undefined ? undefined : parsed(v)])));
	return { set, replicator, client, viewer, round, rounds, errors, copy, truth, calm, get tick () {
		return tick;
	} };
}

describe("json fields over replication", () => {
	it("send a small change inside a big field as a patch of a few bytes; the machine's copy is exactly the authority's", () => {
		const r = rig({ bandwidth: 0 });
		const rec = r.replicator.create("rec", "crew", { n: 1, big: crew(0) }, { scope: "sol" });
		r.round();
		expect(r.copy("crew")).toBe(r.truth(rec));
		for (let i = 1; i <= 10; i++) {
			rec.write({ big: crew(i * 5) });
			r.round();
			expect(r.copy("crew")).toBe(r.truth(rec));
			expect(r.rounds[r.rounds.length - 1][0]).toBeLessThan(24);
		}
		expect(r.replicator.stats.jsonPatches).toBe(10);
		// Something quite different goes whole
		rec.write({ big: { other: [1, 2, 3] } });
		r.round();
		expect(r.copy("crew")).toBe(r.truth(rec));
		expect(r.replicator.stats.jsonWhole).toBe(2);
		// And absent (optional), then back
		rec.write({ big: undefined });
		r.round();
		expect(r.client.latest("crew")!.big).toBeUndefined();
		rec.write({ big: crew(1) });
		r.round();
		expect(r.copy("crew")).toBe(r.truth(rec));
		expect(r.errors).toEqual([]);
	});

	it("converge through loss and reordering: a patch names the version it's against, and the machine keeps the last few", () => {
		seed = 3;
		const r = rig({ bandwidth: 0, resendAfter: 3 }, { lossy: true, loss: 0.3, late: 4 });
		const recs = [0, 1, 2].map((i) => r.replicator.create("rec", `r${i}`, { n: i, big: parsed(value()) }, { scope: "sol" }));
		for (let i = 0; i < 200; i++) {
			for (const rec of recs) if (rnd() < 0.5) rec.write({ big: parsed(mutate(rec.values.big)), n: i });
			r.round();
		}
		r.calm();
		for (let i = 0; i < 20; i++) r.round();
		for (const rec of recs) expect(r.copy(rec.id)).toBe(r.truth(rec));
		expect(r.replicator.stats.jsonPatches).toBeGreaterThan(50);
		expect(r.errors).toEqual([]);
	});
});

describe("big entries in slices", () => {
	function ships (r: ReturnType<typeof rig>, count: number) {
		const list = Array.from({ length: count }, (_, i) => r.replicator.create("ship", `s${i}`, { x: i * 10, z: 0 }, { scope: "sol" }));
		const move = () => list.forEach((s, i) => s.write({ x: i * 10 + (r.tick % 50), z: r.tick % 7 }));
		return { list, move };
	}
	const big = (n: number) => ({ rows: Array.from({ length: n }, (_, i) => [`item${i}`, i * 3, i * 7, i % 5]) });

	it("goes over several rounds within the budget, while everything else keeps moving every round", () => {
		const r = rig({ bandwidth: 32768 });
		const fleet = ships(r, 20);
		for (let i = 0; i < 5; i++) {
			fleet.move();
			r.round();
		}
		const rec = r.replicator.create("rec", "market", { n: 1, big: big(400) }, { scope: "sol" });
		expect(JSON.stringify(rec.values.big).length).toBeGreaterThan(8000);
		const start = r.tick;
		let arrived = 0;
		for (let i = 0; i < 40 && !arrived; i++) {
			fleet.move();
			r.round();
			// Every ship's place this round reached the machine
			for (const s of fleet.list) expect(r.client.latest(s.id)!.x).toBe(s.values.x);
			if (r.client.latest("market")) arrived = r.tick;
		}
		expect(arrived - start).toBeGreaterThan(3);
		expect(r.copy("market")).toBe(r.truth(rec));
		// Within the budget: no round's packets over two rounds' worth (the carry)
		for (const sizes of r.rounds.slice(start)) expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThan((32768 / 30) * 2 + 64);
		expect(r.replicator.stats.transfers).toBe(1);
		expect(r.replicator.stats.slices).toBeGreaterThan(3);
		expect(r.errors).toEqual([]);
	});

	it("has only what nothing else wants by default; a share gives it part of every round", () => {
		const run = (share: number | undefined, withRecord: boolean) => {
			seed = 5;
			const r = rig({ bandwidth: 32768, sliceShare: share });
			const fleet = ships(r, 300);
			let sent = 0;
			let arrived = 0;
			for (let i = 0; i < 60; i++) {
				if (i === 10 && withRecord) r.replicator.create("rec", "market", { n: 1, big: big(300) }, { scope: "sol" });
				fleet.move();
				r.round();
				sent += r.viewer.stats.entries;
				if (!arrived && r.client.latest("market")) arrived = i;
			}
			return { sent, arrived };
		};
		const control = run(undefined, false);
		const spare = run(undefined, true);
		const shared = run(0.5, true);
		// Spare only: the ships lose next to nothing to it
		expect(spare.sent).toBeGreaterThan(control.sent * 0.97);
		// A half share: it arrives within a few rounds, the ships give way
		expect(shared.arrived).toBeGreaterThan(0);
		expect(shared.arrived).toBeLessThan(10 + 20);
		expect(shared.sent).toBeLessThan(spare.sent);
		if (spare.arrived) expect(spare.arrived).toBeGreaterThan(shared.arrived);
	});

	it("goes first for the machine's own records, even in a full budget", () => {
		seed = 5;
		const r = rig({ bandwidth: 32768 });
		const fleet = ships(r, 300);
		for (let i = 0; i < 5; i++) {
			fleet.move();
			r.round();
		}
		const mine = r.replicator.create("rec", "me", { n: 1, big: big(300) }, { owner: r.viewer });
		const size = JSON.stringify(mine.values.big).length;
		const start = r.tick;
		while (!r.client.latest("me") && r.tick < start + 100) {
			fleet.move();
			r.round();
		}
		expect(r.tick - start).toBeLessThanOrEqual(Math.ceil(size / 512) + 2);
		expect(r.copy("me")).toBe(r.truth(mine));
	});

	it("holds up only its own group: the rest of the object goes on, and the next change after it is a patch", () => {
		const r = rig({ bandwidth: 32768 });
		const rec = r.replicator.create("rec", "pilot", { n: 1, big: { small: 1 }, hot: 0 }, { scope: "sol" });
		r.round();
		rec.write({ big: big(400) });
		const start = r.tick;
		let hot = 0;
		while ((r.client.latest("pilot")!.big as { rows?: unknown }).rows === undefined && r.tick < start + 60) {
			rec.write({ hot: ++hot });
			r.round();
			// The hot number every round, though the big one is still coming
			expect(r.client.latest("pilot")!.hot).toBe(hot);
		}
		expect(r.tick - start).toBeGreaterThan(3);
		expect(r.copy("pilot")).toBe(r.truth(rec));
		const patches = r.replicator.stats.jsonPatches;
		rec.write({ big: { rows: [["changed", 0, 0, 0], ...(rec.values.big as { rows: unknown[] }).rows.slice(1)] } });
		r.round();
		expect(r.replicator.stats.jsonPatches).toBe(patches + 1);
		expect(r.copy("pilot")).toBe(r.truth(rec));
	});

	it("never slices what the machine predicts", () => {
		const r = rig({ bandwidth: 32768 });
		const rec = r.replicator.create("rec", "mine", { n: 1, big: big(300) }, { scope: "sol" });
		r.viewer.control(rec);
		r.round();
		expect(r.copy("mine")).toBe(r.truth(rec));
		expect(r.replicator.stats.transfers).toBe(0);
	});

	it("comes through loss and reordering, and converges", () => {
		seed = 9;
		const r = rig({ bandwidth: 32768 }, { lossy: true, loss: 0.25, late: 3 });
		const fleet = ships(r, 30);
		const recs: IgeNetObject[] = [];
		for (let i = 0; i < 150; i++) {
			if (i % 25 === 0) recs.push(r.replicator.create("rec", `r${i}`, { n: i, big: big(150 + i) }, { scope: "sol" }));
			if (i % 10 === 5) for (const rec of recs) rec.write({ big: rnd() < 0.5 ? big(100 + i) : mutate(rec.values.big) });
			fleet.move();
			r.round();
		}
		r.calm();
		for (let i = 0; i < 60; i++) r.round();
		for (const rec of recs) expect(r.copy(rec.id)).toBe(r.truth(rec));
		for (const s of fleet.list) expect(r.client.latest(s.id)!.x).toBe(s.values.x);
		expect(r.replicator.stats.transfers).toBeGreaterThan(5);
		expect(r.errors).toEqual([]);
	});

	it("leaves nothing behind when the object goes mid-way; the next one at its handle arrives whole", () => {
		const r = rig({ bandwidth: 32768 });
		const first = r.replicator.create("rec", "first", { n: 1, big: big(400) }, { scope: "sol" });
		r.round();
		r.round();
		expect(r.client.latest("first")).toBeUndefined();
		first.destroy();
		r.round();
		const second = r.replicator.create("rec", "second", { n: 2, big: big(350) }, { scope: "sol" });
		for (let i = 0; i < 40; i++) r.round();
		expect(r.client.objects.has("first")).toBe(false);
		expect(r.copy("second")).toBe(r.truth(second));
		expect(r.errors).toEqual([]);
	});
});
