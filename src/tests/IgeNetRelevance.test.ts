import { IgeNetGrid } from "@/engine/network/replication/IgeNetGrid";
import { IgeNetSchemaSet, type IgeNetFieldDef, type IgeNetKindOptions } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetReplicator, type IgeNetObject } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetPacketInspector } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetLoopback, type IgeNetLoopbackOptions } from "@/engine/network/sync/IgeNetTransport";

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	ship: {
		x: { type: "number", precision: 0.1 },
		z: { type: "number", precision: 0.1 },
		heading: { type: "angle", bits: 9, group: "look" },
		name: { type: "string", group: "id" },
		hull: { type: "int", group: "id" },
		table: { type: "json", group: "id", optional: true }
	},
	rock: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string" } },
	beacon: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, y: { type: "number", precision: 0.1 }, tag: { type: "int" } },
	gate: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, label: { type: "string" } }
};
const kinds: Record<string, IgeNetKindOptions> = {
	ship: { relevance: "spatial", position: ["x", "z"] },
	rock: { relevance: "scope" },
	beacon: { relevance: "spatial", position: ["x", "z", "y"], blip: "ping" },
	gate: { relevance: "scope" }
};
// A beacon's blip group: x and z (written in the schema as a group)
defs.beacon.x = { type: "number", precision: 0.1, group: "ping" };
defs.beacon.z = { type: "number", precision: 0.1, group: "ping" };

const SEND = 30;
const schemas = new IgeNetSchemaSet(defs, kinds);

function make (options: Record<string, unknown> = {}, set = schemas) {
	return new IgeNetReplicator(set, { sendRate: SEND, ...options });
}

/** A viewer that keeps its packets, and an inspector reading them in order. */
function watch (replicator: IgeNetReplicator, set = schemas, options: { lossy?: boolean } = {}) {
	const packets: Uint8Array[] = [];
	const described: any[] = [];
	const inspector = new IgeNetPacketInspector(set);
	const viewer = replicator.addViewer((bytes) => {
		packets.push(bytes);
		described.push(inspector.describe(bytes));
	}, options);
	viewer.subscribe("sol");
	return {
		viewer, packets, described,
		last: () => described[described.length - 1],
		/** Everything described since `from` packets */
		since: (from: number) => described.slice(from),
		updatesOf: (id: string, from = 0) => described.slice(from).flatMap((d) => d.updates ?? []).filter((u: any) => u.id === id),
		bytes: (from = 0) => packets.slice(from).reduce((n, p) => n + p.length, 0)
	};
}

const flushN = (replicator: IgeNetReplicator, n: number, each?: (i: number) => void) => {
	for (let i = 0; i < n; i++) {
		each?.(i);
		replicator.flush();
	}
};

describe("IgeNetGrid", () => {
	type Item = { _cell: number; _cellIdx: number; id: number };
	it("holds items by cell, moves them only across a border and answers circle queries", () => {
		const grid = new IgeNetGrid<Item>(100);
		const a: Item = { _cell: -1, _cellIdx: -1, id: 1 }, b: Item = { _cell: -1, _cellIdx: -1, id: 2 }, c: Item = { _cell: -1, _cellIdx: -1, id: 3 };
		grid.add(a, 50, 50);
		grid.add(b, 450, 50);
		grid.add(c, -250, -30);
		expect(grid.size).toBe(3);
		expect(grid.query(50, 50, 60, []).map((i) => i.id).sort()).toEqual([1]);
		expect(grid.query(50, 50, 330, []).map((i) => i.id).sort()).toEqual([1, 3]); // the far one's cell is out of reach
		expect(grid.query(50, 50, 600, []).map((i) => i.id).sort()).toEqual([1, 2, 3]);
		expect(grid.query(-250, -30, 10, []).map((i) => i.id)).toEqual([3]);
		// A move inside the cell costs nothing; across a border it changes cell
		expect(grid.move(a, 80, 90)).toBe(false);
		expect(grid.moves).toBe(0);
		expect(grid.move(a, 120, 90)).toBe(true);
		expect(grid.moves).toBe(1);
		expect(grid.query(50, 50, 30, []).map((i) => i.id)).toEqual([]);
		expect(grid.query(130, 90, 30, []).map((i) => i.id)).toEqual([1]);
		grid.remove(a);
		grid.remove(a);
		expect(grid.size).toBe(2);
		expect(grid.query(130, 90, 30, [])).toEqual([]);
		// Empty cells are dropped
		grid.remove(b);
		grid.remove(c);
		expect(grid.cells.size).toBe(0);
	});

	it("a query touches only the cells under the circle", () => {
		const grid = new IgeNetGrid<Item>(100);
		for (let i = 0; i < 2000; i++) grid.add({ _cell: -1, _cellIdx: -1, id: i }, (i % 50) * 100 + 5, Math.floor(i / 50) * 100 + 5);
		const found = grid.query(2500, 2000, 250, []);
		expect(found.length).toBeLessThan(40);
		expect(found.length).toBeGreaterThan(8);
	});
});

describe("spatial relevance", () => {
	it("keeps each scope's grid in step with writes: it moves only when a cell border is crossed", () => {
		const replicator = make({ cellSize: 100 });
		const ship = replicator.create("ship", "s", { x: 10, z: 10 }, { scope: "sol" });
		const grid = replicator.grid("sol")!;
		expect(grid.size).toBe(1);
		for (let i = 0; i < 50; i++) ship.write({ x: 10 + i, z: 10 + i * 0.5 }); // 10..59: one cell
		expect(grid.moves).toBe(0);
		ship.write({ x: 150 });
		expect(grid.moves).toBe(1);
		ship.moveTo("vega");
		expect(grid.size).toBe(0);
		expect(replicator.grid("vega")!.size).toBe(1);
		ship.destroy();
		expect(replicator.grid("vega")!.size).toBe(0);
		// A private object and a scope kind aren't in the grid
		const a = watch(replicator);
		replicator.create("ship", "mine", {}, { owner: a.viewer });
		replicator.create("rock", "r", {}, { scope: "sol" });
		expect(replicator.grid("sol")!.size).toBe(0);
	});

	it("sends near objects in full and far ones as blips: a create of the blip fields alone, then updates of x and z", () => {
		const replicator = make();
		const a = watch(replicator);
		a.viewer.nearRadius = 500;
		const me = replicator.create("ship", "me", { x: 0, z: 0, name: "Me", hull: 7 }, { scope: "sol" });
		a.viewer.addInterest(me);
		replicator.create("ship", "near", { x: 300, z: 0, name: "Near", hull: 5 }, { scope: "sol" });
		const far = replicator.create("ship", "far", { x: 5000, z: 0, name: "Far", hull: 9 }, { scope: "sol" });
		replicator.flush();
		const creates = Object.fromEntries((a.last().creates as any[]).map((c) => [c.id, c]));
		expect(creates.me.level).toBe("full");
		expect(creates.near.level).toBe("full");
		expect(creates.near.values).toMatchObject({ name: "Near", hull: 5 });
		expect(creates.far.level).toBe("blip");
		expect(Object.keys(creates.far.values).sort()).toEqual(["x", "z"]);
		expect(a.viewer.detailOf(far)).toBe("blip");

		// Name and hull of a far ship never go out, only x and z
		far.write({ name: "Far Renamed", hull: 1, heading: 1 });
		flushN(replicator, 40);
		expect(a.updatesOf("far")).toEqual([]);
		far.write({ x: 5010 });
		flushN(replicator, 40);
		const updates = a.updatesOf("far");
		expect(updates.length).toBeGreaterThan(0);
		for (const u of updates) {
			expect(u.level).toBe("blip");
			expect(Object.keys(u.values)).toEqual(["x"]);
		}
	});

	it("sends blips at the blip rate and near objects every round", () => {
		const replicator = make({ blipRate: 2 });
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 500 });
		const near = replicator.create("ship", "near", { x: 100, z: 0 }, { scope: "sol" });
		const far = replicator.create("ship", "far", { x: 9000, z: 0 }, { scope: "sol" });
		flushN(replicator, 3);
		const from = a.described.length;
		flushN(replicator, 60, (i) => {
			near.write({ x: 100 + i + 1 });
			far.write({ x: 9000 + i + 1 });
		});
		expect(a.updatesOf("near", from)).toHaveLength(60);
		const blips = a.updatesOf("far", from).length;
		expect(blips).toBeGreaterThanOrEqual(3);
		expect(blips).toBeLessThanOrEqual(5); // 2 a second for 2 seconds
		// A kind's own blip rate
		const own = new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, blipRate: 6 } });
		const r2 = make({}, own);
		const b = watch(r2, own);
		const m2 = r2.create("ship", "me", {}, { scope: "sol" });
		b.viewer.addInterest(m2, { radius: 10 });
		const f2 = r2.create("ship", "far", { x: 9000 }, { scope: "sol" });
		flushN(r2, 3);
		const base = b.described.length;
		flushN(r2, 60, (i) => f2.write({ x: 9000 + i + 1 }));
		expect(b.updatesOf("far", base).length).toBeGreaterThanOrEqual(11);
		expect(b.updatesOf("far", base).length).toBeLessThanOrEqual(13);
	});

	it("switching to full sends what the viewer lacks (everything the first time, then only what changed since); switching back stops sending the rest", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 500 });
		const ship = replicator.create("ship", "s", { x: 5000, z: 0, name: "Gull", hull: 3, heading: 1 }, { scope: "sol" });
		flushN(replicator, 3);
		// Comes into range: it never had the other fields, so it gets all of them
		let from = a.described.length;
		ship.write({ x: 100 });
		flushN(replicator, 2);
		let ups = a.updatesOf("s", from);
		expect(ups).toHaveLength(1);
		expect(ups[0].level).toBe("full");
		expect(ups[0].values).toMatchObject({ x: 100, name: "Gull", hull: 3 });
		expect(Object.keys(ups[0].values).sort()).toEqual(["heading", "hull", "name", "table", "x"]); // z hadn't changed since its blip
		// Goes out of range: a level change only, then nothing of the rest
		from = a.described.length;
		ship.write({ x: 6000 });
		flushN(replicator, 3);
		ups = a.updatesOf("s", from);
		expect(ups[0].level).toBe("blip");
		ship.write({ hull: 99, name: "Hidden change", heading: 2 });
		const quiet = a.described.length;
		flushN(replicator, 40);
		for (const u of a.updatesOf("s", quiet)) expect(Object.keys(u.values).every((k) => k === "x" || k === "z")).toBe(true);
		// Back in range: only the fields changed while it was away (and the position)
		from = a.described.length;
		ship.write({ x: 50 });
		flushN(replicator, 2);
		ups = a.updatesOf("s", from);
		expect(ups[0].level).toBe("full");
		expect(Object.keys(ups[0].values).sort()).toEqual(["heading", "hull", "name", "x"]);
		expect(ups[0].values).toMatchObject({ hull: 99, name: "Hidden change" });
	});

	it("an object on the edge doesn't flip each round (hysteresis) but does leave once clearly beyond", () => {
		const replicator = make({ hysteresis: 0.2 });
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 1000 });
		const ship = replicator.create("ship", "s", { x: 900, z: 0 }, { scope: "sol" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(ship)).toBe("full");
		for (const x of [1050, 990, 1150, 1010]) {
			ship.write({ x });
			replicator.flush();
			expect(a.viewer.detailOf(ship)).toBe("full");
		}
		ship.write({ x: 1300 });
		replicator.flush();
		expect(a.viewer.detailOf(ship)).toBe("blip");
		ship.write({ x: 1100 }); // back inside the leave distance but not the enter distance: stays a blip
		replicator.flush();
		expect(a.viewer.detailOf(ship)).toBe("blip");
	});

	it("follows the interest's object as it moves, takes a changed radius, and several interest points", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		const interest = a.viewer.addInterest(me, { radius: 400 });
		const other = replicator.create("ship", "o", { x: 3000, z: 0 }, { scope: "sol" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(other)).toBe("blip");
		me.write({ x: 2800 });
		replicator.flush();
		expect(a.viewer.detailOf(other)).toBe("full");
		me.write({ x: 0 });
		replicator.flush();
		expect(a.viewer.detailOf(other)).toBe("blip");
		interest.radius = 3500; // a better scanner
		replicator.flush();
		expect(a.viewer.detailOf(other)).toBe("full");
		interest.radius = 400;
		replicator.flush();
		const second = a.viewer.addInterest({ x: 3000, z: 0 }, { radius: 100 });
		replicator.flush();
		expect(a.viewer.detailOf(other)).toBe("full");
		second.remove();
		replicator.flush();
		expect(a.viewer.detailOf(other)).toBe("blip");
	});

	it("uses height in distance when the position has three fields", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("beacon", "me", { x: 0, z: 0, y: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 500 });
		const above = replicator.create("beacon", "up", { x: 100, z: 0, y: 900 }, { scope: "sol" });
		const level = replicator.create("beacon", "lv", { x: 100, z: 0, y: 100 }, { scope: "sol" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(above)).toBe("blip");
		expect(a.viewer.detailOf(level)).toBe("full");
	});

	it("focus gives full detail at any distance and unfocus puts it back", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 300 });
		const target = replicator.create("ship", "t", { x: 80000, z: 0, name: "Target" }, { scope: "sol" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(target)).toBe("blip");
		a.viewer.focus(target);
		expect(a.viewer.isFocused(target)).toBe(true);
		let from = a.described.length;
		target.write({ x: 80001, name: "Hostile" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(target)).toBe("full");
		let ups = a.updatesOf("t", from);
		expect(ups[ups.length - 1].level).toBe("full");
		expect(ups.reduce((all, u) => ({ ...all, ...u.values }), {})).toMatchObject({ name: "Hostile", x: 80001 });
		// Every change goes out at once while focused
		from = a.described.length;
		flushN(replicator, 10, (i) => target.write({ x: 80002 + i }));
		expect(a.updatesOf("t", from)).toHaveLength(10);
		a.viewer.unfocus(target);
		flushN(replicator, 2);
		expect(a.viewer.detailOf(target)).toBe("blip");
		// Focus is remembered while the object isn't seen, and works when it appears
		const later = replicator.create("ship", "later", { x: 90000, z: 0 }, { scope: "vega" });
		a.viewer.focus(later);
		a.viewer.subscribe("vega");
		flushN(replicator, 2);
		expect(a.viewer.detailOf(later)).toBe("full");
	});

	it("never sends what's hidden, and sends scope kinds at any distance without ever making them blips", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 300 });
		const secret = replicator.create("ship", "secret", { x: 10, z: 0 }, { scope: "sol", hidden: true });
		const rock = replicator.create("rock", "rock", { x: 90000, z: 90000, name: "Rock" }, { scope: "sol" });
		const gate = replicator.create("gate", "gate", { x: -50000, z: 0, label: "North gate" }, { scope: "sol" });
		flushN(replicator, 3);
		const ids = (a.described.flatMap((d) => d.creates) as any[]).map((c) => c.id);
		expect(ids).toEqual(expect.arrayContaining(["me", "rock", "gate"]));
		expect(ids).not.toContain("secret");
		const rockCreate = (a.described.flatMap((d) => d.creates) as any[]).find((c) => c.id === "rock");
		expect(rockCreate.level).toBeUndefined();
		expect(rockCreate.values.name).toBe("Rock");
		// Once sent they cost nothing
		const from = a.packets.length;
		flushN(replicator, 30);
		expect(a.bytes(from)).toBeLessThanOrEqual(30 * 6);
		// A write to a far rock is still sent in full
		rock.write({ name: "Renamed" });
		flushN(replicator, 2);
		expect(a.updatesOf("rock").pop()!.values).toEqual({ name: "Renamed" });
		// Hidden is never sent even as a blip, until revealed (then it's near so full)
		expect(a.viewer.sees(secret)).toBe(false);
		secret.write({ x: 20 });
		flushN(replicator, 40);
		expect((a.described.flatMap((d) => [...d.creates, ...d.updates]) as any[]).some((e) => e.id === "secret")).toBe(false);
		a.viewer.reveal(secret);
		flushN(replicator, 2);
		expect(a.viewer.detailOf(secret)).toBe("full");
		expect(gate.destroyed).toBe(false);
	});

	it("holds a private (owner) object in full whatever its kind or place", () => {
		const replicator = make();
		const a = watch(replicator);
		const mine = replicator.create("ship", "mine", { x: 99999, z: 0, name: "Mine" }, { owner: a.viewer });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(mine)).toBe("full");
		expect((a.described.flatMap((d) => d.creates) as any[])[0].level).toBe("full");
		expect(replicator.grid("sol")).toBeUndefined();
	});

	it("moving to another scope keeps detail right", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 500 });
		const ship = replicator.create("ship", "s", { x: 100, z: 0 }, { scope: "sol" });
		flushN(replicator, 2);
		expect(a.viewer.detailOf(ship)).toBe("full");
		ship.moveTo("vega");
		flushN(replicator, 2);
		expect(a.viewer.sees(ship)).toBe(false);
		ship.moveTo("sol");
		flushN(replicator, 2);
		expect(a.viewer.detailOf(ship)).toBe("full");
		const far = replicator.create("ship", "far", { x: 7000, z: 0 }, { scope: "vega" });
		a.viewer.subscribe("vega");
		flushN(replicator, 2);
		expect(a.viewer.detailOf(far)).toBe("blip");
	});
});

describe("rates, priority and budget", () => {
	it("enforces a kind's group rates and object rate per viewer", () => {
		const own = new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, groupRates: { look: 5, id: 1 } } });
		const replicator = make({}, own);
		const a = watch(replicator, own);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 1000 });
		const ship = replicator.create("ship", "s", { x: 10, z: 0 }, { scope: "sol" });
		flushN(replicator, 3);
		const from = a.described.length;
		flushN(replicator, 60, (i) => ship.write({ x: 10 + i + 1, heading: (i % 50) / 10, hull: i + 1 }));
		const ups = a.updatesOf("s", from);
		const count = (field: string) => ups.filter((u) => field in u.values).length;
		expect(count("x")).toBe(60); // the blip group (x, z) has no rate: every round
		expect(count("heading")).toBeGreaterThanOrEqual(9); // 5 a second for 2 seconds
		expect(count("heading")).toBeLessThanOrEqual(11);
		expect(count("hull")).toBeGreaterThanOrEqual(1);
		expect(count("hull")).toBeLessThanOrEqual(3); // 1 a second
		// Whatever was held back arrives: the final values are all there
		flushN(replicator, 40);
		const merged = a.updatesOf("s", from).reduce((all, u) => ({ ...all, ...u.values }), {} as Record<string, unknown>);
		expect(merged.hull).toBe(60);

		const capped = new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, maxRate: 10 } });
		const r2 = make({}, capped);
		const b = watch(r2, capped);
		const m2 = r2.create("ship", "me", {}, { scope: "sol" });
		b.viewer.addInterest(m2, { radius: 1000 });
		const s2 = r2.create("ship", "s", { x: 10 }, { scope: "sol" });
		flushN(r2, 3);
		const base = b.described.length;
		flushN(r2, 60, (i) => s2.write({ x: 10 + i + 1 }));
		const sent = b.updatesOf("s", base).length;
		expect(sent).toBeGreaterThanOrEqual(19);
		expect(sent).toBeLessThanOrEqual(21);
		// Two viewers have their own timing
		const c = watch(r2, capped);
		c.viewer.addInterest(m2, { radius: 1000 });
		flushN(r2, 30, (i) => s2.write({ x: 500 + i }));
		expect(c.updatesOf("s").length).toBeLessThanOrEqual(11);
	});

	it("spends no more than the budget per second, with a small tolerance, and a viewer's own budget wins", () => {
		const replicator = make({ bandwidth: 6000 });
		const a = watch(replicator);
		const b = watch(replicator);
		b.viewer.bandwidth = 2000;
		const ships: IgeNetObject[] = [];
		for (let i = 0; i < 80; i++) ships.push(replicator.create("ship", `s${i}`, { x: (i % 10) * 20, z: Math.floor(i / 10) * 20, name: `Ship ${i}` }, { scope: "sol" }));
		for (const w of [a, b]) w.viewer.addInterest({ x: 100, z: 100 }, { radius: 5000 });
		flushN(replicator, 30);
		const fromA = a.packets.length, fromB = b.packets.length;
		const seconds = 4;
		flushN(replicator, SEND * seconds, (i) => ships.forEach((s, n) => s.write({ x: (n % 10) * 20 + (i % 40), z: Math.floor(n / 10) * 20 + (i % 30), heading: (i % 60) / 10 })));
		const perSecond = (w: typeof a, from: number) => w.bytes(from) / seconds;
		expect(perSecond(a, fromA)).toBeLessThanOrEqual(6000 * 1.1);
		expect(perSecond(a, fromA)).toBeGreaterThan(6000 * 0.6); // it's used
		expect(perSecond(b, fromB)).toBeLessThanOrEqual(2000 * 1.15);
		const report = a.viewer.report();
		expect(report.bandwidth).toBe(6000);
		expect(report.deferred).toBeGreaterThan(0);
		expect(report.oldestPendingAge).toBeGreaterThan(0);
		// Over a second of the same window by the replicator's clock
		expect(report.detail.full).toBe(80);
	});

	it("doesn't starve anything: under a tight budget a busy crowd can't keep a quiet object from arriving", () => {
		const replicator = make({ bandwidth: 3000 });
		const a = watch(replicator);
		a.viewer.addInterest({ x: 0, z: 0 }, { radius: 100000 });
		const busy: IgeNetObject[] = [];
		for (let i = 0; i < 100; i++) busy.push(replicator.create("ship", `b${i}`, { x: i, z: 0 }, { scope: "sol" }));
		const quiet = replicator.create("ship", "quiet", { x: 50, z: 50, name: "Quiet" }, { scope: "sol" });
		flushN(replicator, 120, (i) => busy.forEach((s, n) => s.write({ x: n + (i % 90), z: (i % 70) })));
		quiet.write({ name: "Changed", hull: 42 });
		let arrived = -1;
		for (let i = 0; i < 300; i++) {
			flushN(replicator, 1, (k) => busy.forEach((s, n) => s.write({ x: n + ((k + i) % 90), z: ((k + i) % 70) })));
			if (a.updatesOf("quiet").some((u) => u.values.hull === 42)) {
				arrived = i;
				break;
			}
		}
		expect(arrived).toBeGreaterThanOrEqual(0);
		expect(arrived).toBeLessThan(SEND * 4); // within four seconds
		// And its age was reported as waiting while it did
		expect(replicator.report().oldestPendingAge).toBeLessThan(4);
	});

	it("sends priorities in order: an owner object, a focused object and a create beat plain updates; a nearer object beats a far one", () => {
		const replicator = make({ bandwidth: 1500, carry: 1 });
		const a = watch(replicator);
		const ids = (u: any[]) => u.map((e) => e.id);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 400 });
		const mine = replicator.create("ship", "mine", { x: 0, z: 0 }, { owner: a.viewer });
		const nearShip = replicator.create("ship", "near", { x: 100, z: 0 }, { scope: "sol" });
		const midShip = replicator.create("ship", "mid", { x: 350, z: 0 }, { scope: "sol" });
		const focused = replicator.create("ship", "focused", { x: 40000, z: 0 }, { scope: "sol" });
		a.viewer.focus(focused);
		flushN(replicator, 40);
		// Now write all of them in the same round and see the order they go out in under a budget of only a few entries
		replicator.bandwidth = 12 * SEND; // about a dozen bytes a round beside the header
		a.viewer.bandwidth = undefined;
		const from = a.described.length;
		for (const s of [mine, nearShip, midShip, focused, me]) s.write({ heading: 1 });
		replicator.flush();
		const sent = ids(a.described[from].updates);
		expect(sent.length).toBeGreaterThan(0);
		expect(sent[0]).toBe("mine"); // owner-only first
		expect(sent.length).toBeLessThan(5); // the budget held something back
		// What was held back goes next round, nothing lost
		flushN(replicator, 40);
		const all = new Set(ids(a.described.slice(from).flatMap((d) => d.updates)));
		for (const id of ["mine", "near", "mid", "focused", "me"]) expect(all.has(id)).toBe(true);
	});

	it("splits a round into packets within the size limit, each readable alone, and reassembles on a client", () => {
		const replicator = make({ bandwidth: Infinity, maxPacketBytes: 200 });
		const a = watch(replicator);
		for (let i = 0; i < 60; i++) replicator.create("ship", `s${i}`, { x: i, z: i, name: `Ship number ${i}`, hull: i }, { scope: "sol" });
		a.viewer.addInterest({ x: 0, z: 0 }, { radius: 1e6 });
		replicator.flush();
		expect(a.packets.length).toBeGreaterThan(5);
		for (const p of a.packets) expect(p.length).toBeLessThanOrEqual(200);
		const created = (a.described.flatMap((d) => d.creates) as any[]).map((c) => c.id);
		expect(created).toHaveLength(60);
		expect(new Set(created).size).toBe(60);
		expect(a.described.every((d) => !d.error)).toBe(true);
		// Updates split too, and a single entry bigger than the limit still goes (alone)
		const big = replicator.create("ship", "big", { x: 1, z: 1, table: { rows: Array.from({ length: 80 }, (_, i) => ({ i, text: "row of a table" })) } }, { scope: "sol" });
		const from = a.packets.length;
		replicator.flush();
		expect(a.packets.slice(from).some((p) => p.length > 200)).toBe(true);
		expect(a.packets.slice(from).filter((p) => p.length > 200)).toHaveLength(1);
		expect(big.destroyed).toBe(false);
		const base = a.packets.length;
		for (const s of replicator.objects()) s.write({ x: 123, z: 321, name: `Renamed ${s.id}`, hull: 5 });
		replicator.flush();
		expect(a.packets.length - base).toBeGreaterThan(3);
		for (const p of a.packets.slice(base)) expect(p.length).toBeLessThanOrEqual(200);
	});

	it("keeps encode-once sharing: viewers with the same needs share payload bytes", () => {
		const replicator = make({ bandwidth: Infinity });
		const watchers = Array.from({ length: 10 }, () => watch(replicator));
		const ships: IgeNetObject[] = [];
		for (let i = 0; i < 20; i++) ships.push(replicator.create("ship", `s${i}`, { x: i, z: 0 }, { scope: "sol" }));
		for (const w of watchers) w.viewer.addInterest({ x: 0, z: 0 }, { radius: 5000 });
		flushN(replicator, 3);
		const misses = replicator.stats.cacheMisses;
		const hits = replicator.stats.cacheHits;
		ships.forEach((s) => s.write({ x: 500 }));
		replicator.flush();
		expect(replicator.stats.cacheMisses - misses).toBe(20); // one encode per object
		expect(replicator.stats.cacheHits - hits).toBe(180);
		for (const w of watchers) expect(w.packets[w.packets.length - 1]).toEqual(watchers[0].packets[watchers[0].packets.length - 1]);
	});

	it("reports per viewer and in total: bytes per kind, deferred, oldest pending, detail counts", () => {
		const replicator = make({ bandwidth: 2500 });
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 300 });
		for (let i = 0; i < 40; i++) replicator.create("ship", `s${i}`, { x: i % 2 ? 10 : 9000, z: i }, { scope: "sol" });
		replicator.create("rock", "r", { name: "rock" }, { scope: "sol" });
		flushN(replicator, 60, (i) => { for (const o of replicator.objects()) if (o.kind === "ship") o.write({ x: (o.values.x as number) + (i % 2 ? 0.2 : -0.2) }); });
		const report = a.viewer.report();
		expect(report.detail.full + report.detail.blip).toBe(report.visible);
		expect(report.detail.blip).toBeGreaterThan(10);
		expect(report.byKind.ship).toBeGreaterThan(0);
		const total = replicator.report();
		expect(total.viewers).toBe(1);
		expect(total.grids.sol.objects).toBe(41);
		expect(total.byKind.rock).toBeGreaterThan(0);
	});
});

const inputDefs: Record<string, IgeNetFieldDef> = { dx: { type: "number", precision: 0.01, min: -1, max: 1 } };
type Input = { dx: number };
const settle = async (times = 3) => {
	for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function game (net: ReturnType<typeof igeNetLoopback>, options: { lossy?: boolean; bandwidth?: number; maxPacketBytes?: number } = {}) {
	const host: IgeNetReplicationHost<Input> = new IgeNetReplicationHost<Input>(net.listener, {
		schemas: defs,
		kinds,
		inputSchema: inputDefs,
		lossy: options.lossy,
		sendRate: SEND,
		relevance: { bandwidth: options.bandwidth, maxPacketBytes: options.maxPacketBytes, nearRadius: 400, cellSize: 400 },
		join: (machine, players) => {
			machine.viewer.subscribe("world");
			return players.map((p, i) => {
				const id = `${machine.id}.${i}`;
				const ship = host.replicator.create("ship", id, { name: (p as { name: string }).name, x: 0, z: 0 }, { scope: "world" });
				machine.viewer.addInterest(ship);
				return id;
			});
		},
		leave: (machine) => {
			for (const id of machine.players) host.replicator.destroy(id);
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				const ship = host.replicator.get(id)!;
				ship.write({ x: (ship.values.x as number) + input.dx * 100 * dt });
			});
		}
	});
	return host;
}
const clientOptions = { schemas: defs, kinds, inputSchema: inputDefs, pingInterval: 0 };

describe("detail levels on a client", () => {
	it("exposes the level, drops stale fields while a blip, and restores everything on the way back", async () => {
		const net = igeNetLoopback();
		const host = game(net, { bandwidth: Infinity });
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const levels: string[] = [];
		client.on("detail", (obj: { id: string }, level: string) => { levels.push(`${obj.id}:${level}`); });
		const { players: [me] } = await client.join([{ name: "Ann" }]);
		const other = host.replicator.create("ship", "other", { x: 5000, z: 0, name: "Other", hull: 4, heading: 2 }, { scope: "world" });
		host.update(1000 / 30);
		await settle();
		expect(client.detailOf("other")).toBe("blip");
		expect(client.latest("other")).toEqual({ x: 5000, z: 0 }); // nothing of name or hull: they were never sent
		expect(client.detailOf(me)).toBe("full");

		other.write({ x: 100 });
		host.update(1000 / 30);
		host.update(1000 / 30);
		await settle();
		expect(client.detailOf("other")).toBe("full");
		expect(client.latest("other")).toMatchObject({ x: 100, name: "Other", hull: 4 });
		expect(levels).toContain("other:full");

		other.write({ x: 5000 });
		host.update(1000 / 30);
		host.update(1000 / 30);
		await settle();
		expect(client.detailOf("other")).toBe("blip");
		// The stale full-detail fields are gone from what's drawn, but kept aside
		expect(Object.keys(client.latest("other")!).sort()).toEqual(["x", "z"]);
		expect(Object.keys(client.interpolated().other).sort()).toEqual(["x", "z"]);
		for (let i = 0; i < 20; i++) host.update(1000 / 30);
		await settle();
		expect(client.latest("other")).toEqual({ x: 5000, z: 0 });
		expect(client.objects.get("other")!.held).toMatchObject({ name: "Other", hull: 4 });
		other.write({ name: "Renamed" });
		for (let i = 0; i < 40; i++) host.update(1000 / 30);
		await settle();
		expect(client.latest("other")).toEqual({ x: 5000, z: 0 });
		other.write({ x: 120 });
		host.update(1000 / 30);
		host.update(1000 / 30);
		await settle();
		expect(client.latest("other")).toMatchObject({ x: 120, name: "Renamed", hull: 4 });
		host.destroy();
		client.destroy();
	});
});

describe("over a network with latency, jitter and loss", () => {
	beforeEach(() => jest.useFakeTimers({ now: 1000 }));
	afterEach(() => jest.useRealTimers());

	for (const lossy of [false, true]) {
		it(`converges with detail levels switching, a budget and a packet limit (${lossy ? "lossy baselines" : "reliable"})`, async () => {
			let seed = 5;
			const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
			const net = igeNetLoopback({ latency: 40, jitter: 40, loss: 0.25 });
			const host = game(net, { lossy, bandwidth: 20000, maxPacketBytes: 300 });
			const client = new IgeNetReplicationClient<Input>(net.connect(), { ...clientOptions, pingInterval: 1000, now: () => Date.now() });
			const welcome = client.join([{ name: "Ann" }]);
			await jest.advanceTimersByTimeAsync(300);
			const me = (await welcome).players[0];
			const viewer = host.machines()[0].viewer;
			// A crowd of ships circling, some of which pass in and out of range of the pilot, some focused
			const ships: IgeNetObject[] = [];
			for (let i = 0; i < 30; i++) ships.push(host.replicator.create("ship", `c${i}`, { x: i * 60, z: (i % 5) * 50, name: `Crowd ${i}`, hull: i }, { scope: "world" }));
			host.replicator.create("rock", "rock", { x: 90000, z: 0, name: "Far rock" }, { scope: "world" });
			let t = 0;
			const run = async (ticks: number, dx: number, move: boolean) => {
				for (let i = 0; i < ticks; i++) {
					t++;
					client.sendInput([{ dx }]);
					if (move) ships.forEach((s, n) => s.write({ x: n * 60 + Math.round(Math.sin(t / 25 + n) * 700), z: (n % 5) * 50, hull: t % 100, heading: (t % 60) / 10 }));
					if (t === 40) viewer.focus(ships[29]);
					if (t === 150) viewer.unfocus(ships[29]);
					host.update(1000 / 30);
					await jest.advanceTimersByTimeAsync(1000 / 30);
				}
			};
			await run(240, 1, true);
			// Stop everything, let it all arrive
			await run(120, 0, false);
			await jest.advanceTimersByTimeAsync(800);
			expect(client.objects.size).toBe(viewer.visibleCount);
			let blips = 0, fulls = 0;
			for (const obj of host.replicator.objects()) {
				const detail = viewer.detailOf(obj);
				if (!detail) continue;
				const client_ = client.objects.get(obj.id);
				expect(client_).toBeDefined();
				if (obj.schema.leveled) {
					expect(client.detailOf(obj.id)).toBe(detail);
					if (detail === "blip") {
						blips++;
						expect(client.latest(obj.id)).toEqual({ x: obj.values.x, z: obj.values.z });
					} else {
						fulls++;
						expect(client.latest(obj.id)).toEqual(obj.values);
					}
				} else {
					expect(client.latest(obj.id)).toEqual(obj.values);
				}
			}
			expect(blips).toBeGreaterThan(3);
			expect(fulls).toBeGreaterThan(1);
			expect(client.latest(me)).toEqual(host.replicator.get(me)!.values);
			spy.mockRestore();
			host.destroy();
			client.destroy();
		});
	}

	it("delivers a changed object within bounded time under a tight budget over a lossy link", async () => {
		let seed = 9;
		const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
		const net = igeNetLoopback({ latency: 30, jitter: 30, loss: 0.2 });
		const host = game(net, { lossy: true, bandwidth: 4000 });
		const client = new IgeNetReplicationClient<Input>(net.connect(), { ...clientOptions, pingInterval: 1000, now: () => Date.now() });
		const welcome = client.join([{ name: "Ann" }]);
		await jest.advanceTimersByTimeAsync(300);
		await welcome;
		const crowd: IgeNetObject[] = [];
		for (let i = 0; i < 60; i++) crowd.push(host.replicator.create("ship", `c${i}`, { x: i * 5, z: 0 }, { scope: "world" }));
		const quiet = host.replicator.create("ship", "quiet", { x: 100, z: 100, name: "Quiet" }, { scope: "world" });
		let t = 0;
		const run = async (ticks: number) => {
			for (let i = 0; i < ticks; i++) {
				t++;
				client.sendInput([{ dx: 0 }]);
				crowd.forEach((s, n) => s.write({ x: n * 5 + (t % 40), z: t % 30 }));
				host.update(1000 / 30);
				await jest.advanceTimersByTimeAsync(1000 / 30);
			}
		};
		await run(90);
		quiet.write({ hull: 77, name: "Quiet changed" });
		const wrote = t;
		let arrived = -1;
		for (let i = 0; i < 300 && arrived < 0; i++) {
			await run(1);
			if ((client.latest("quiet") as { hull?: number } | undefined)?.hull === 77) arrived = t - wrote;
		}
		expect(arrived).toBeGreaterThan(0);
		expect(arrived).toBeLessThan(SEND * 5);
		spy.mockRestore();
		host.destroy();
		client.destroy();
	});
});
