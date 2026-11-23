import { IgeNetGrid } from "@/engine/network/replication/IgeNetGrid";
import { IgeNetSchemaSet, type IgeNetFieldDef, type IgeNetKindOptions } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetReplicator, type IgeNetObject } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetPacketInspector } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetLoopback, type IgeNetLoopbackOptions } from "@/engine/network/transport/IgeNetTransport";

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
	gate: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, label: { type: "string" } },
	pod: { x: { type: "number", precision: 0.1 }, z: { type: "number", precision: 0.1 }, name: { type: "string" } }
};
const kinds: Record<string, IgeNetKindOptions> = {
	ship: { relevance: "spatial", position: ["x", "z"] },
	rock: { relevance: "scope" },
	beacon: { relevance: "spatial", position: ["x", "z", "y"], blip: "ping" },
	gate: { relevance: "scope" },
	pod: { relevance: "spatial", position: ["x", "z"], blip: false }
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

/** The anonymous contacts a viewer's machine has been told of (ids are the handles "?n"). */
const contacts = (a: ReturnType<typeof watch>, from = 0) => a.described.slice(from).flatMap((d) => d.creates ?? []).filter((c: any) => c.anon);

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
		// The far ship is an anonymous contact: no id, no kind, the blip fields alone
		expect(creates.far).toBeUndefined();
		const [blip] = contacts(a) as any[];
		expect(blip.kind).toBe("blip");
		expect(blip.id).toMatch(/^\?\d+$/);
		expect(blip.level).toBe("blip");
		expect(Object.keys(blip.values).sort()).toEqual(["x", "z"]);
		expect(blip.values).toEqual({ x: 5000, z: 0 });
		expect(a.viewer.detailOf(far)).toBe("blip");

		// Name and hull of a far ship never go out, only x and z
		far.write({ name: "Far Renamed", hull: 1, heading: 1 });
		flushN(replicator, 40);
		expect(a.updatesOf(blip.id)).toEqual([]);
		far.write({ x: 5010 });
		flushN(replicator, 40);
		const updates = a.updatesOf(blip.id);
		expect(updates.length).toBeGreaterThan(0);
		for (const u of updates) expect(Object.keys(u.values)).toEqual(["x", "z"]);
		// Nothing on the wire carries the far ship's id or its text
		const wire = Buffer.concat(a.packets.map((p) => Buffer.from(p))).toString("latin1");
		expect(wire).not.toContain("far");
		expect(wire).not.toContain("Far");
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
		const blipId = (contacts(a)[0] as any).id;
		const blips = a.updatesOf(blipId, from).length;
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
		const ownId = (contacts(b)[0] as any).id;
		expect(b.updatesOf(ownId, base).length).toBeGreaterThanOrEqual(11);
		expect(b.updatesOf(ownId, base).length).toBeLessThanOrEqual(13);
	});

	it("switching to full sends what the viewer lacks (everything the first time, then only what changed since); switching back stops sending the rest", () => {
		const replicator = make();
		const a = watch(replicator);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 500 });
		const ship = replicator.create("ship", "s", { x: 5000, z: 0, name: "Gull", hull: 3, heading: 1 }, { scope: "sol" });
		flushN(replicator, 3);
		// Comes into range: the contact is named by a create at its handle, with every field
		const blipId = (contacts(a)[0] as any).id;
		const handle = blipId;
		let from = a.described.length;
		ship.write({ x: 100 });
		flushN(replicator, 2);
		let named = a.described.slice(from).flatMap((d) => d.creates).filter((c: any) => c.id === "s");
		expect(named).toHaveLength(1);
		expect(named[0].kind).toBe("ship");
		expect(named[0].values).toMatchObject({ x: 100, z: 0, name: "Gull", hull: 3 });
		expect(Object.keys(named[0].values).sort()).toEqual(["heading", "hull", "name", "table", "x", "z"]);
		expect(a.updatesOf(blipId, from)).toEqual([]);
		expect(handle).toBeDefined();
		// Goes out of range: the object is destroyed on the machine and a new anonymous contact takes its place
		from = a.described.length;
		ship.write({ x: 6000 });
		flushN(replicator, 3);
		const gone = a.described.slice(from).flatMap((d) => d.destroys);
		expect(gone.map((d: any) => d.id)).toContain("s");
		const again = contacts(a, from) as any[];
		expect(again).toHaveLength(1);
		expect(again[0].id).not.toBe(blipId);
		expect(Object.keys(again[0].values).sort()).toEqual(["x", "z"]);
		ship.write({ hull: 99, name: "Hidden change", heading: 2 });
		const quiet = a.described.length;
		flushN(replicator, 40);
		for (const u of a.described.slice(quiet).flatMap((d) => d.updates)) expect(Object.keys(u.values).every((k) => k === "x" || k === "z")).toBe(true);
		// Back in range: named again with everything as it is now
		from = a.described.length;
		ship.write({ x: 50 });
		flushN(replicator, 2);
		named = a.described.slice(from).flatMap((d) => d.creates).filter((c: any) => c.id === "s");
		expect(named).toHaveLength(1);
		expect(named[0].values).toMatchObject({ x: 50, hull: 99, name: "Hidden change" });
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
		const named = a.described.slice(from).flatMap((d) => d.creates).filter((c: any) => c.id === "t");
		expect(named).toHaveLength(1);
		expect(named[0].values).toMatchObject({ name: "Hostile", x: 80001 });
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

	it("never holds back what the machine predicts: a controlled object goes every round it changes, whatever the budget, big entries or rates", () => {
		const rated = new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, groupRates: { look: 5 }, maxRate: 10 } });
		const replicator = make({ bandwidth: 2500 }, rated);
		const a = watch(replicator, rated);
		const me = replicator.create("ship", "me", { x: 0, z: 0 }, { scope: "sol" });
		a.viewer.addInterest(me, { radius: 100000 });
		a.viewer.control(me);
		expect(a.viewer.isControlled(me)).toBe(true);
		const busy: IgeNetObject[] = [];
		for (let i = 0; i < 60; i++) busy.push(replicator.create("ship", `b${i}`, { x: i * 10, z: 0 }, { scope: "sol" }));
		const big = replicator.create("ship", "big", { x: 5, z: 5 }, { scope: "sol" });
		flushN(replicator, 60, (i) => busy.forEach((s, n) => s.write({ x: n * 10 + (i % 7), z: i % 5 })));
		const run = (rounds: number) => {
			let missed = 0;
			for (let i = 0; i < rounds; i++) {
				busy.forEach((s, n) => s.write({ x: n * 10 + (i % 9), z: i % 4 }));
				// A big entry now and then (several rounds' worth of budget), and a field of the rated group every round
				if (i % 15 === 0) big.write({ table: { blob: "x".repeat(4000 + i) } });
				me.write({ x: i + 1, heading: ((i % 60) + 1) / 10 });
				const from = a.described.length;
				replicator.flush();
				const ups = a.since(from).flatMap((d) => d.updates ?? []).filter((u: any) => u.id === "me");
				if (!ups.length || ups[0].values.heading === undefined) missed++;
			}
			return missed;
		};
		expect(run(90)).toBe(0);
		expect(a.viewer.report().deferred).toBeGreaterThan(0); // the budget was holding others back meanwhile
		// Without control the same object waits its turn (and its rate)
		a.viewer.uncontrol(me);
		expect(run(90)).toBeGreaterThan(10);
	});

	it("tells the machine where held-back changes start, so it blends across the wait: no standing still, then a jump", () => {
		const fake = { send () {}, onMessage () {}, onClose () {}, close () {} };
		for (const mode of ["budget", "rate"] as const) {
			const set = mode === "rate" ? new IgeNetSchemaSet(defs, { ...kinds, ship: { ...kinds.ship, maxRate: 7 } }) : schemas;
			const replicator = make(mode === "budget" ? { bandwidth: 2500 } : {}, set);
			const a = watch(replicator, set);
			a.viewer.addInterest({ x: 0, z: 0 }, { radius: 100000 });
			const busy: IgeNetObject[] = [];
			if (mode === "budget") for (let i = 0; i < 60; i++) busy.push(replicator.create("ship", `b${i}`, { x: i * 10, z: 0 }, { scope: "sol" }));
			const mover = replicator.create("ship", "mover", { x: 0, z: 0 }, { scope: "sol" });
			const client = new IgeNetReplicationClient(fake, { schemas: set, pingInterval: 0 });
			let fed = 0;
			const feed = () => {
				for (; fed < a.packets.length; fed++) client._onPacket(a.packets[fed]);
			};
			let tick = 0;
			const round = (move: boolean) => {
				tick++;
				replicator.tick = tick;
				busy.forEach((s, n) => s.write({ x: n * 10 + (tick % 9), z: tick % 4 }));
				if (move) mover.write({ x: tick * 10 });
				replicator.flush();
				feed();
			};
			// It stands still a while, then moves at a steady speed (x = 10 a tick) while the budget or its rate holds it back at times
			for (let i = 0; i < 40; i++) round(false);
			const startTick = tick;
			for (let i = 0; i < 150; i++) round(true);
			for (let i = 0; i < 60; i++) round(false);
			expect(a.updatesOf("mover").some((u: any) => u.still > 0)).toBe(true);
			const states = client.objects.get("mover")!.states.filter((s) => s.tick > startTick && s.tick <= startTick + 150);
			expect(states.length).toBeGreaterThan(5);
			// Every state the machine holds is on the line: none still at an old place while its tick moves on
			for (const s of states) expect(Math.abs((s.values.x as number) - s.tick * 10)).toBeLessThan(0.11);
			// And where it started moving, it was still until then (the last state before the move is the old place, not one held later)
			const all = client.objects.get("mover")!.states;
			const before = all.filter((s) => s.tick <= startTick);
			if (before.length) expect(before[before.length - 1].values.x ?? 0).toBe(0);
		}
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
	it("knows a far ship only as an anonymous contact, names it when it comes into range (the same object, smooth) and forgets it going out", async () => {
		const net = igeNetLoopback();
		const host = game(net, { bandwidth: Infinity });
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const log: string[] = [];
		client.on("created", (obj: { id: string; kind: string }) => { log.push(`created ${obj.kind}`); });
		client.on("revealed", (obj: { id: string }, anonId: string) => { log.push(`revealed ${anonId}>${obj.id}`); });
		client.on("destroyed", (id: string, kind: string) => { log.push(`destroyed ${id} ${kind}`); });
		const { players: [me] } = await client.join([{ name: "Ann" }]);
		const other = host.replicator.create("ship", "other", { x: 5000, z: 0, name: "Other", hull: 4, heading: 2 }, { scope: "world" });
		host.update(1000 / 30);
		await settle();
		expect(client.objects.has("other")).toBe(false);
		expect(client.detailOf(me)).toBe("full");
		const contact = [...client.objects.values()].find((o) => o.anon)!;
		expect(contact.kind).toBe("blip");
		expect(contact.detail).toBe("blip");
		expect(contact.id).not.toContain("other");
		expect(client.latest(contact.id)).toEqual({ x: 5000, z: 0 }); // nothing of name or hull: they were never sent
		const anonId = contact.id;

		other.write({ x: 100 });
		host.update(1000 / 30);
		host.update(1000 / 30);
		await settle();
		expect(client.objects.has(anonId)).toBe(false);
		expect(client.objects.get("other")).toBe(contact); // the same object goes on
		expect(contact.anon).toBe(false);
		expect(contact.kind).toBe("ship");
		expect(client.detailOf("other")).toBe("full");
		expect(client.latest("other")).toMatchObject({ x: 100, name: "Other", hull: 4 });
		expect(log).toContain(`revealed ${anonId}>other`);
		// Its history is kept: still the blip's states before the full ones
		expect(contact.states[0].values).toEqual({ x: 5000, z: 0 });

		other.write({ x: 5000 });
		host.update(1000 / 30);
		host.update(1000 / 30);
		await settle();
		expect(log).toContain("destroyed other ship");
		expect(client.objects.has("other")).toBe(false);
		const again = [...client.objects.values()].find((o) => o.anon)!;
		expect(again.id).not.toBe(anonId);
		expect(client.latest(again.id)).toEqual({ x: 5000, z: 0 });
		other.write({ name: "Renamed" });
		for (let i = 0; i < 40; i++) host.update(1000 / 30);
		await settle();
		expect(client.latest(again.id)).toEqual({ x: 5000, z: 0 });
		host.destroy();
		client.destroy();
	});

	it("leaves a kind with no blips out of sight beyond range: destroyed there, made again in full when it returns, focus overriding", async () => {
		const net = igeNetLoopback();
		const host = game(net, { bandwidth: Infinity });
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const gone: string[] = [];
		client.on("destroyed", (id: string) => { gone.push(id); });
		await client.join([{ name: "Ann" }]);
		const viewer = host.machines()[0].viewer;
		const pod = host.replicator.create("pod", "pod", { x: 5000, z: 0, name: "Pod" }, { scope: "world" });
		const near = host.replicator.create("pod", "near", { x: 100, z: 0, name: "Near" }, { scope: "world" });
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(client.objects.has("pod")).toBe(false);
		expect(viewer.sees(pod)).toBe(false);
		expect(client.latest("near")).toMatchObject({ name: "Near" });
		// Nothing of it on the wire: no blip either
		expect([...client.objects.values()].filter((o) => o.anon)).toEqual([]);
		pod.write({ x: 200, name: "Pod arrived" });
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(client.latest("pod")).toMatchObject({ x: 200, name: "Pod arrived" });
		pod.write({ x: 9000 });
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(client.objects.has("pod")).toBe(false);
		expect(gone).toContain("pod");
		// Focus brings it back at any distance, and letting go sends it away again
		viewer.focus(pod);
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(client.latest("pod")).toMatchObject({ x: 9000 });
		viewer.unfocus(pod);
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(client.objects.has("pod")).toBe(false);
		// Destroying what's in range tells the machine, and nothing is left admitted
		near.destroy();
		for (let i = 0; i < 3; i++) host.update(1000 / 30);
		await settle();
		expect(client.objects.has("near")).toBe(false);
		expect(viewer._admitted.size).toBe(0);
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
			const blipPositions: string[] = [];
			for (const obj of host.replicator.objects()) {
				const detail = viewer.detailOf(obj);
				if (!detail) continue;
				if (detail === "blip") {
					// Known only as an anonymous contact: no such id on the machine
					expect(client.objects.has(obj.id)).toBe(false);
					blips++;
					blipPositions.push(`${obj.values.x},${obj.values.z}`);
					continue;
				}
				const client_ = client.objects.get(obj.id);
				expect(client_).toBeDefined();
				if (obj.schema.leveled) {
					expect(client.detailOf(obj.id)).toBe(detail);
					{
						fulls++;
						expect(client.latest(obj.id)).toEqual(obj.values);
					}
				} else {
					expect(client.latest(obj.id)).toEqual(obj.values);
				}
			}
			const contactPositions = [...client.objects.values()].filter((o) => o.anon).map((o) => `${client.latest(o.id)!.x},${client.latest(o.id)!.z}`);
			expect(contactPositions.sort()).toEqual(blipPositions.sort());
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
