import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import { IgeNetSchema, IgeNetSchemaSet, type IgeNetFieldDef } from "@/engine/network/replication/IgeNetSchema";
import { IgeNetReplicator } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetReplicationHost, type IgeNetReplicationMachine } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetPacketInspector } from "@/engine/network/replication/igeNetReplicationProtocol";
import { igeNetLoopback, type IgeNetConnection, type IgeNetLoopbackOptions } from "@/engine/network/transport/IgeNetTransport";

const defs: Record<string, Record<string, IgeNetFieldDef>> = {
	dot: {
		x: { type: "number", precision: 0.01, group: "transform" },
		y: { type: "number", precision: 0.01, min: -100, max: 100, group: "transform" },
		facing: { type: "angle", bits: 10, group: "transform" },
		name: { type: "string" },
		alive: { type: "bool" },
		team: { type: "enum", values: ["red", "blue", "green"] },
		hp: { type: "int" },
		note: { type: "string", optional: true },
		table: { type: "json" }
	},
	rock: { x: { type: "number", precision: 0.1 }, size: { type: "int", min: 0, max: 15 }, label: { type: "string" } }
};
const inputDefs: Record<string, IgeNetFieldDef> = { dx: { type: "number", precision: 0.01, min: -1, max: 1 } };

type Input = { dx: number };
type Dot = { x: number; facing: number; name: string };
const SPEED = 100;
const move = (dot: Dot, input: Input, dt: number): Dot => ({ ...dot, x: dot.x + input.dx * SPEED * dt });

const settle = async (times = 3) => {
	for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function bitsRoundTrip (schema: IgeNetSchema, values: Record<string, unknown>) {
	const w = new IgeNetBitWriter();
	schema.writeAll(w, schema.canonical(values));
	return schema.readAll(new IgeNetBitReader(w.toBytes()));
}

describe("IgeNetBits and IgeNetSchema", () => {
	it("round trips bits, varints, floats and strings", () => {
		const w = new IgeNetBitWriter(2);
		w.writeBits(5, 3);
		w.writeBool(true);
		w.writeVarUint(300);
		w.writeVarInt(-7);
		w.writeVarInt(2 ** 40);
		w.writeFloat32(1.5);
		w.writeString("héllo ✓");
		w.writeBits(0xdeadbeef, 32);
		const r = new IgeNetBitReader(w.toBytes());
		expect(r.readBits(3)).toBe(5);
		expect(r.readBool()).toBe(true);
		expect(r.readVarUint()).toBe(300);
		expect(r.readVarInt()).toBe(-7);
		expect(r.readVarInt()).toBe(2 ** 40);
		expect(r.readFloat32()).toBe(1.5);
		expect(r.readString()).toBe("héllo ✓");
		expect(r.readBits(32)).toBe(0xdeadbeef);
		expect(() => r.readBits(64)).toThrow(RangeError);
	});

	it("round trips every field type, giving back exactly the canonical (quantised) value", () => {
		const schema = new IgeNetSchemaSet(defs).kind("dot");
		const input = { x: 12.3456, y: -99.999, facing: -0.1, name: "Ann", alive: true, team: "blue", hp: -5, table: { rows: [1, 2, { a: "b" }] } };
		const canonical = schema.canonical(input);
		const out = bitsRoundTrip(schema, input);
		expect(out).toEqual(canonical);
		expect(out.x).toBeCloseTo(12.35, 10);
		expect(out.y).toBeCloseTo(-100, 10); // clamped to the range, to the precision
		expect(out.facing as number).toBeCloseTo(Math.PI * 2 - 0.1, 1);
		expect(out.note).toBeUndefined();
		expect(bitsRoundTrip(schema, { ...input, note: "hi" }).note).toBe("hi");
	});

	it("quantises: sub-precision differences are the same value, and ranges take only the bits they need", () => {
		const schema = new IgeNetSchema("t", { v: { type: "number", precision: 0.5 }, r: { type: "number", precision: 0.01, min: -1, max: 1 }, b: { type: "bool" } });
		expect(schema.byName.get("v")!.canonical(1.1)).toBe(schema.byName.get("v")!.canonical(1.2));
		const w = new IgeNetBitWriter();
		schema.fields[1].write(w, schema.fields[1].canonical(0.5));
		expect(w.bitLength).toBe(8); // 201 steps
		const w2 = new IgeNetBitWriter();
		schema.fields[2].write(w2, true);
		expect(w2.bitLength).toBe(1);
	});

	it("refuses unknown fields and enum values", () => {
		const schema = new IgeNetSchemaSet(defs).kind("dot");
		expect(() => schema.canonical({ nope: 1 })).toThrow(/no field/);
		expect(() => schema.canonical({ team: "purple" })).toThrow(/isn't one of/);
		expect(new IgeNetSchemaSet(defs).hash).toBe(new IgeNetSchemaSet(defs).hash);
		expect(new IgeNetSchemaSet({ a: { x: { type: "bool" } } }).hash).not.toBe(new IgeNetSchemaSet({ a: { x: { type: "int" } } }).hash);
	});
});

describe("IgeNetReplicator", () => {
	const schemas = new IgeNetSchemaSet(defs);

	/** A viewer that keeps its packets, and an inspector reading them in order. */
	function watch (replicator: IgeNetReplicator, options: { lossy?: boolean } = {}) {
		const packets: Uint8Array[] = [];
		const described: any[] = [];
		const inspector = new IgeNetPacketInspector(schemas);
		const viewer = replicator.addViewer((bytes) => {
			packets.push(bytes);
			described.push(inspector.describe(bytes));
		}, options);
		return { viewer, packets, inspector, last: () => described[described.length - 1] };
	}

	it("sends a create once, then only the changed fields", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		a.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d1", { x: 1, name: "Ann" }, { scope: "sol" });
		replicator.flush();
		expect(a.last().creates).toMatchObject([{ id: "d1", kind: "dot", values: { x: 1, name: "Ann", alive: false } }]);

		dot.write({ x: 2, name: "Ann", alive: false });
		replicator.flush();
		const update = a.last();
		expect(update.creates).toEqual([]);
		expect(update.updates).toHaveLength(1);
		expect(update.updates[0]).toMatchObject({ id: "d1", values: { x: 2 } });
		expect(Object.keys(update.updates[0].values)).toEqual(["x"]);
	});

	it("takes kinds of more than 32 fields: masks span words, only changed fields go", () => {
		const wide: Record<string, IgeNetFieldDef> = {};
		for (let i = 0; i < 80; i++) wide[`f${i}`] = i % 3 === 0 ? { type: "int" } : i % 3 === 1 ? { type: "json" } : { type: "number", precision: 0.1 };
		const set = new IgeNetSchemaSet({ wide });
		const replicator = new IgeNetReplicator(set);
		const inspector = new IgeNetPacketInspector(set);
		let described: any;
		const viewer = replicator.addViewer((bytes) => { described = inspector.describe(bytes); });
		const a = { viewer, last: () => described };
		a.viewer.subscribe("sol");
		const obj = replicator.create("wide", "w1", {}, { scope: "sol" });
		replicator.flush();
		obj.write({ f2: 1.5, f40: 7, f79: 2.5, f70: { a: [1, 2] } });
		replicator.flush();
		const update = a.last();
		expect(update.updates).toHaveLength(1);
		expect(update.updates[0].values).toEqual({ f2: 1.5, f40: 7, f70: { a: [1, 2] }, f79: 2.5 });
		obj.write({ f79: 3.5 });
		replicator.flush();
		expect(Object.keys(a.last().updates[0].values)).toEqual(["f79"]);
		expect(a.viewer.view().find((o) => o.id === "w1")!.values.f79).toBe(3.5);
	});

	it("keeps decimals clean: a precision of 0.1 gives 0.3, not 0.30000000000000004", () => {
		const schema = new IgeNetSchema("n", { a: { type: "number", precision: 0.1 }, b: { type: "number", precision: 0.001 }, c: { type: "number", precision: 0.01, min: -5, max: 5 } });
		expect(schema.canonical({ a: 0.3, b: 1.2345, c: 2.37 })).toEqual({ a: 0.3, b: 1.235, c: 2.37 });
		expect(bitsRoundTrip(schema, { a: 12.3, b: -0.007, c: -4.99 })).toEqual({ a: 12.3, b: -0.007, c: -4.99 });
	});

	it("unreveal stops a reveal without excluding the viewer from the scope, and view() lists what a viewer sees", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		const b = watch(replicator);
		a.viewer.subscribe("sol");
		b.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d1", { x: 1, table: { k: 1 } }, { scope: "sol" });
		expect(b.viewer.view().map((o) => o.id)).toEqual(["d1"]);
		dot.moveTo(undefined);
		expect(b.viewer.view()).toEqual([]);
		a.viewer.reveal(dot);
		expect(a.viewer.view().map((o) => o.id)).toEqual(["d1"]);
		a.viewer.unreveal(dot);
		expect(a.viewer.view()).toEqual([]);
		dot.moveTo("sol");
		expect(b.viewer.view().map((o) => o.id)).toEqual(["d1"]);
		expect(a.viewer.view({ copy: true })[0].values.table).toEqual({ k: 1 });
		expect(a.viewer.view({ copy: true })[0].values.table).not.toBe(dot.values.table);
	});

	it("doesn't see sub-precision jitter or an unchanged write as a change", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		a.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d1", { x: 1 }, { scope: "sol" });
		replicator.flush();
		expect(dot.write({ x: 1.004 })).toBe(false);
		expect(dot.write({ x: 1.01 })).toBe(true);
		replicator.flush();
		expect(a.last().updates[0].values.x).toBeCloseTo(1.01);
		expect(dot.write({ x: 1.01 })).toBe(false);
		replicator.flush();
		expect(a.last().updates).toEqual([]);
	});

	it("costs nothing for dormant objects after their create", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		a.viewer.subscribe("sol");
		for (let i = 0; i < 140; i++) replicator.create("rock", `r${i}`, { x: i, size: 3, label: "A rock with a name that is fairly long to be like the real thing" }, { scope: "sol" });
		const ship = replicator.create("dot", "s", {}, { scope: "sol" });
		replicator.flush();
		const first = a.packets[0].length;
		expect(first).toBeGreaterThan(140 * 20);
		const kindBefore = replicator.bytesByKind().rock;
		const misses = replicator.stats.cacheMisses;
		for (let i = 0; i < 10; i++) replicator.flush();
		// Nothing was written: every packet is a bare header, and no object was visited or encoded
		for (const bytes of a.packets.slice(1)) expect(bytes.length).toBeLessThanOrEqual(6);
		expect(replicator.bytesByKind().rock).toBe(kindBefore);
		expect(replicator.stats.cacheMisses).toBe(misses);
		// One ship moving: the rocks stay out of it
		ship.write({ x: 5 });
		replicator.flush();
		expect(a.last().updates).toHaveLength(1);
		expect(a.packets[a.packets.length - 1].length).toBeLessThan(20);
	});

	it("keeps visibility by scope, owner and reveal, incrementally", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		const b = watch(replicator);
		a.viewer.subscribe("sol");
		b.viewer.subscribe("vega");
		const inSol = replicator.create("rock", "sol-rock", {}, { scope: "sol" });
		const inVega = replicator.create("rock", "vega-rock", {}, { scope: "vega" });
		const secret = replicator.create("dot", "secret", {}, { scope: "sol", hidden: true });
		const mine = replicator.create("dot", "mine", {}, { owner: a.viewer, scope: "vega" });
		expect(a.viewer.sees(inSol)).toBe(true);
		expect(a.viewer.sees(inVega)).toBe(false);
		expect(a.viewer.sees(secret)).toBe(false);
		expect(a.viewer.sees(mine)).toBe(true);
		expect(b.viewer.sees(mine)).toBe(false);
		expect(b.viewer.sees(inVega)).toBe(true);

		// Reveal and hide one object to one viewer
		a.viewer.reveal(secret);
		expect(a.viewer.sees(secret)).toBe(true);
		expect(b.viewer.sees(secret)).toBe(false);
		replicator.flush();
		expect((a.last().creates as any[]).map((c) => c.id).sort()).toEqual(["mine", "secret", "sol-rock"]);
		a.viewer.hide(secret);
		expect(a.viewer.sees(secret)).toBe(false);
		replicator.flush();
		expect((a.last().destroys as any[]).map((c) => c.id)).toEqual(["secret"]);

		// Hide a scope object from one viewer only
		a.viewer.hide(inSol);
		a.viewer.subscribe("vega");
		expect(a.viewer.sees(inSol)).toBe(false);
		expect(a.viewer.sees(inVega)).toBe(true);
		a.viewer.unsubscribe("vega");
		expect(a.viewer.sees(inVega)).toBe(false);

		// Moving an object between scopes, and destroying
		inSol.moveTo("vega");
		expect(b.viewer.sees(inSol)).toBe(true);
		replicator.destroy("vega-rock");
		expect(b.viewer.sees(inVega)).toBe(false);
		expect(b.viewer.visibleCount).toBe(1);
		replicator.flush();
		expect((b.last().destroys as any[]).map((c) => c.id)).toEqual(["vega-rock"]);

		// Late subscribers get everything in one create each
		const c = watch(replicator);
		c.viewer.subscribe("vega");
		replicator.flush();
		expect((c.last().creates as any[]).map((x) => x.id)).toEqual(["sol-rock"]);
	});

	it("encodes an update once and shares the bytes between the viewers that need it", () => {
		const replicator = new IgeNetReplicator(schemas);
		const watchers = Array.from({ length: 10 }, () => watch(replicator));
		for (const w of watchers) w.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d", {}, { scope: "sol" });
		replicator.flush();
		expect(replicator.stats.cacheMisses).toBe(1);
		expect(replicator.stats.cacheHits).toBe(9);
		dot.write({ x: 3, hp: 4 });
		replicator.flush();
		expect(replicator.stats.cacheMisses).toBe(2);
		expect(replicator.stats.cacheHits).toBe(18);
		for (const w of watchers) expect(w.packets[1]).toEqual(watchers[0].packets[1]);
	});

	it("sends a json field when it's written differently or touched after an in-place change", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator);
		a.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d", { table: { rows: [1] } }, { scope: "sol" });
		replicator.flush();
		expect(dot.write({ table: { rows: [1] } })).toBe(false);
		(dot.values.table as { rows: number[] }).rows.push(2);
		expect(dot.touch("table")).toBe(true);
		expect(dot.touch("table")).toBe(false);
		replicator.flush();
		// (As a patch against the first version: an item added to the array)
		expect(a.last().updates[0].values).toEqual({ table: { ver: 2, from: 1, patch: { t: 1, k: [["rows", { t: 2, n: 2, i: [[1, { t: 0, v: 2 }]] }]] } } });
		expect(() => dot.touch("x")).toThrow();
	});

	it("on a lossy transport sends against the last acknowledged packet, until it's acknowledged", () => {
		const replicator = new IgeNetReplicator(schemas);
		const a = watch(replicator, { lossy: true });
		a.viewer.subscribe("sol");
		const dot = replicator.create("dot", "d", {}, { scope: "sol" });
		replicator.flush(); // packet 1: create
		replicator.flush(); // packet 2: not acknowledged, so the create goes again
		expect(a.last().creates).toHaveLength(1);
		a.viewer.ack(2, 0b1);
		replicator.flush(); // 3: nothing to say
		expect(a.last().creates).toEqual([]);
		expect(a.last().updates).toEqual([]);

		dot.write({ x: 1 });
		replicator.flush(); // 4: x
		dot.write({ hp: 2 });
		replicator.flush(); // 5: 4 not acknowledged: x again, with hp
		expect(Object.keys(a.last().updates[0].values).sort()).toEqual(["hp", "x"]);
		a.viewer.ack(5, 0b1); // 5 and 4 seen
		replicator.flush(); // 6
		expect(a.last().updates).toEqual([]);

		// A destroy is owed until acknowledged (and its handle not reused)
		dot.destroy();
		replicator.flush(); // 7
		replicator.flush(); // 8
		expect(a.last().destroys).toHaveLength(1);
		const next = replicator.create("rock", "r", {}, { scope: "sol" });
		replicator.flush(); // 9
		expect(a.last().destroys).toHaveLength(1);
		expect(a.last().creates[0].handle).not.toBe(a.last().destroys[0].handle);
		a.viewer.ack(9, 0b11111111);
		replicator.flush();
		expect(a.last().destroys).toEqual([]);
		expect(a.viewer.sees(next)).toBe(true);
	});
});

/** A tiny game: each player is a dot that moves along x at its input's speed; rocks are static. */
function game (net: ReturnType<typeof igeNetLoopback>, options: { refuse?: string; lossy?: boolean; sendRate?: number } = {}) {
	const left: string[] = [];
	const host = new IgeNetReplicationHost<Input>(net.listener, {
		schemas: defs,
		inputSchema: inputDefs,
		lossy: options.lossy,
		sendRate: options.sendRate ?? 30,
		join: (machine: IgeNetReplicationMachine, players) => {
			if (options.refuse && players.some((p) => (p as { name: string }).name === options.refuse)) return "No room";
			machine.viewer.subscribe("world");
			return players.map((p, i) => {
				const id = `${machine.id}.${i}`;
				host.replicator.create("dot", id, { name: (p as { name: string }).name }, { scope: "world" });
				return id;
			});
		},
		leave: (machine) => {
			left.push(machine.id);
			for (const id of machine.players) host.replicator.destroy(id);
		},
		step: (dt, tick, inputs) => {
			inputs.forEach((input, id) => {
				const dot = host.replicator.get(id);
				if (dot) dot.write({ x: (dot.values.x as number) + input.dx * SPEED * dt });
			});
		},
		info: () => ({ seed: 42 })
	});
	return { host, left, dots: () => [...host.replicator.objects()].filter((o) => o.kind === "dot") };
}

const clientOptions = { schemas: defs, inputSchema: inputDefs, pingInterval: 0 };

describe("IgeNetReplicationHost / IgeNetReplicationClient", () => {
	it("joins machines with their local players and refuses when told to", async () => {
		const net = igeNetLoopback();
		const { host } = game(net, { refuse: "Mallory" });
		const a = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const welcomeA = await a.join([{ name: "Ann" }, { name: "Bob" }]);
		expect(welcomeA.players).toHaveLength(2);
		expect((a.info as { seed: number }).seed).toBe(42);
		const c = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		await expect(c.join([{ name: "Mallory" }])).rejects.toThrow("No room");
		host.destroy();
	});

	it("refuses a client whose schemas differ", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const c = new IgeNetReplicationClient<Input>(net.connect(), { ...clientOptions, schemas: { dot: { x: { type: "bool" } } } });
		await expect(c.join([{ name: "Ann" }])).rejects.toThrow(/schemas differ/);
		host.destroy();
	});

	it("applies each player's inputs one per step, holding the last, and acknowledges them", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const { players: [p1, p2] } = await client.join([{ name: "Ann" }, { name: "Bob" }]);
		client.sendInput([{ dx: 1 }, { dx: -1 }]);
		client.sendInput([{ dx: 1 }, { dx: 0 }]);
		await settle();
		host.update(1000 / 30);
		host.update(1000 / 30);
		host.update(1000 / 30); // frame 2's inputs held
		const x = (id: string) => host.replicator.get(id)!.values.x as number;
		expect(x(p1)).toBeCloseTo((3 * SPEED) / 30, 1);
		expect(x(p2)).toBeCloseTo(-SPEED / 30, 1);
		host.update(1000 / 30);
		await settle();
		expect(client.pendingInputs()).toEqual([]);
		expect((client.latest(p1) as Dot).x).toBeCloseTo(x(p1), 5);
		host.destroy();
	});

	it("creates, updates and destroys objects on the client, and sends nothing for objects nobody writes", async () => {
		const net = igeNetLoopback();
		const { host, left } = game(net);
		const taps: Uint8Array[] = [];
		const connection = net.connect();
		const tapped: IgeNetConnection = { ...connection, onMessage: (fn) => connection.onMessage((m) => { if (m instanceof Uint8Array) taps.push(m); fn(m); }) };
		const client = new IgeNetReplicationClient<Input>(tapped, clientOptions);
		const created: string[] = [], destroyed: string[] = [];
		client.on("created", (o: { id: string }) => { created.push(o.id); });
		client.on("destroyed", (id: string) => { destroyed.push(id); });
		const { players: [me] } = await client.join([{ name: "Ann" }]);
		for (let i = 0; i < 20; i++) host.replicator.create("rock", `r${i}`, { x: i, label: "rock" }, { scope: "world" });
		host.update(1000 / 30);
		await settle();
		expect(client.objects.size).toBe(21);
		expect(created).toContain("r19");
		expect(client.latest("r7")).toMatchObject({ x: 7, label: "rock" });

		const bytesBefore = host.stats().bytesByKind.rock;
		for (let i = 0; i < 5; i++) host.update(1000 / 30);
		await settle();
		expect(host.stats().bytesByKind.rock).toBe(bytesBefore);
		expect(taps.slice(-3).every((t) => t.length <= 6)).toBe(true);

		host.replicator.destroy("r3");
		host.update(1000 / 30);
		await settle();
		expect(destroyed).toEqual(["r3"]);
		expect(client.objects.has("r3")).toBe(false);

		// A readable description of what was on the wire
		const inspector = new IgeNetPacketInspector(host.schemas);
		const described = taps.map((t) => inspector.describe(t)) as any[];
		expect(described[0].creates.map((c: any) => c.id)).toContain(me);
		expect(JSON.stringify(described[described.length - 1])).toContain("r3");

		// The machine leaves: its dot goes
		client.destroy();
		await settle();
		expect(left).toHaveLength(1);
		expect(host.replicator.get(me)).toBeUndefined();
		host.destroy();
	});

	it("blends a predicted player between ticks, so one drawn every frame moves smoothly", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const { players: [id] } = await client.join([{ name: "Ann" }]);
		const step = SPEED / 30;
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
		expect(drawn(0.5)).toBeCloseTo(now - step / 2, 2);
		expect(drawn(1)).toBeCloseTo(now, 2);
		await tick();
		expect(drawn(0)).toBeCloseTo(now, 2);
		expect(drawn(0.25)).toBeCloseTo(now + step / 4, 2);
		host.destroy();
	});

	it("hands out its interpolated world as the caller's own", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetReplicationClient<Input>(net.connect(), clientOptions);
		const { players: [id] } = await client.join([{ name: "Ann" }]);
		client.sendInput([{ dx: 1 }]);
		await settle();
		host.update(1000 / 30);
		await settle();
		const world = client.interpolated();
		const stored = client.latest(id);
		world[id] = { ...world[id], x: 999 };
		expect(client.latest(id)).toBe(stored);
		expect((client.latest(id) as Dot).x).not.toBe(999);
		host.destroy();
	});

	it("blends angles the short way round and holds fields marked not to blend", async () => {
		const net = igeNetLoopback();
		const { host } = game(net);
		const client = new IgeNetReplicationClient<Input>(net.connect(), { ...clientOptions, interpolationDelay: 0, now: () => clock });
		let clock = 0;
		const { players: [id] } = await client.join([{ name: "Ann" }]);
		const dot = host.replicator.get(id)!;
		dot.write({ facing: 6.2, name: "Ann" });
		host.update(1000 / 30);
		await settle();
		dot.write({ facing: 0.2, name: "Bob" });
		host.update(1000 / 30);
		await settle();
		// Halfway between the last two ticks
		clock = 0;
		client._offset = 0;
		const tick = client.latestTick();
		clock = ((tick - 0.5) * 1000) / 30;
		const blended = client.interpolated()[id] as { facing: number; name: string };
		const wrapped = (blended.facing + Math.PI * 2) % (Math.PI * 2);
		expect(Math.abs(wrapped - 0.1)).toBeLessThan(0.05 + 0.02); // across zero, not through 3.2
		expect(blended.name).toBe("Ann"); // a string steps
		host.destroy();
	});

	it("moves to another zone with a ticket, starting the world afresh", async () => {
		const nets: Record<string, ReturnType<typeof igeNetLoopback>> = { "loop://a": igeNetLoopback(), "loop://b": igeNetLoopback() };
		const make = (url: string, zone: string) => {
			const host = new IgeNetReplicationHost<Input>(nets[url].listener, {
				schemas: defs,
				inputSchema: inputDefs,
				sendRate: 30,
				join: (machine, players, ticket) => {
					machine.viewer.subscribe("world");
					const who = (ticket as { who: string } | undefined)?.who ?? (players[0] as { name: string }).name;
					host.replicator.create("dot", `${zone}-${who}`, { name: who }, { scope: "world" });
					host.replicator.create("rock", `${zone}-rock`, { label: zone }, { scope: "world" });
					return [`${zone}-${who}`];
				},
				acceptTicket: (token) => (token === "good" ? { who: "ann" } : "Bad ticket"),
				step: () => {}
			});
			return host;
		};
		const a = make("loop://a", "a");
		const b = make("loop://b", "b");
		const client = new IgeNetReplicationClient<Input>(nets["loop://a"].connect(), { ...clientOptions, connect: (url) => nets[url].connect() });
		const events: string[] = [];
		client.on("transfer", () => { events.push("transfer"); });
		client.on("transferred", () => { events.push("transferred"); });
		await client.join([{ name: "ann" }]);
		a.update(1000 / 30);
		await settle();
		expect(client.objects.has("a-rock")).toBe(true);
		client.sendInput([{ dx: 1 }]);

		await expect(client.transfer({ url: "loop://b", ticket: "bad" })).rejects.toThrow("Bad ticket");
		const welcome = await client.transfer({ url: "loop://b", ticket: "good" });
		expect(events).toEqual(["transfer", "transfer", "transferred"]); // the refused ticket, then the good one
		expect(welcome.players).toEqual(["b-ann"]);
		expect(client.pendingInputs()).toEqual([]);
		b.update(1000 / 30);
		await settle();
		expect([...client.objects.keys()].sort()).toEqual(["b-ann", "b-rock"]);
		expect(client.latest("b-rock")).toMatchObject({ label: "b" });
		expect(client.transferring).toBe(false);
		a.destroy();
		b.destroy();
		client.destroy();
	});

	describe("over a network with latency", () => {
		beforeEach(() => jest.useFakeTimers({ now: 1000 }));
		afterEach(() => jest.useRealTimers());

		async function play (host: IgeNetReplicationHost<Input>, clients: { client: IgeNetReplicationClient<Input>; input: Input[] }[], ticks: number, each?: (i: number) => void) {
			for (let i = 0; i < ticks; i++) {
				for (const { client, input } of clients) client.sendInput(input);
				each?.(i);
				host.update(1000 / 30);
				await jest.advanceTimersByTimeAsync(1000 / 30);
			}
		}

		async function joined (options: IgeNetLoopbackOptions, gameOptions: { lossy?: boolean } = {}) {
			const net = igeNetLoopback(options);
			const world = game(net, gameOptions);
			const client = new IgeNetReplicationClient<Input>(net.connect(), { ...clientOptions, pingInterval: 1000, now: () => Date.now(), interpolationDelay: 100 });
			const welcome = client.join([{ name: "Ann" }]);
			await jest.advanceTimersByTimeAsync(300);
			return { ...world, client, id: (await welcome).players[0] };
		}

		it("predicts the machine's own player ahead of the snapshots, matching the authority", async () => {
			const { host, client, id } = await joined({ latency: 60 });
			await play(host, [{ client, input: [{ dx: 1 }] }], 30);
			const authority = host.replicator.get(id)!.values.x as number;
			const snapshotX = (client.latest(id) as Dot).x;
			const predicted = client.predict<Dot>(id, 0, move)!;
			expect(snapshotX).toBeLessThan(authority);
			expect(predicted.x).toBeGreaterThanOrEqual(authority - 0.05);
			expect(predicted.x - authority).toBeLessThan((SPEED / 30) * 6);
			expect(client.rtt).toBeGreaterThanOrEqual(120);
			await play(host, [{ client, input: [{ dx: 0 }] }], 20);
			expect(client.predict<Dot>(id, 0, move)!.x).toBeCloseTo(host.replicator.get(id)!.values.x as number, 1);
			host.destroy();
			client.destroy();
		});

		it("draws other objects interpolated a little in the past", async () => {
			const { host, client, id } = await joined({ latency: 30 });
			await play(host, [{ client, input: [{ dx: 1 }] }], 45);
			const latestX = (client.latest(id) as Dot).x;
			const drawnX = (client.interpolated()[id] as Dot).x;
			expect(drawnX).toBeLessThan(latestX);
			expect(latestX - drawnX).toBeGreaterThan(2);
			expect(latestX - drawnX).toBeLessThan(25);
			host.destroy();
			client.destroy();
		});

		it("doesn't glide an object that sat still and then moved: it holds until the packet before the change", async () => {
			const { host, client, id } = await joined({ latency: 10 });
			await play(host, [{ client, input: [{ dx: 0 }] }], 30);
			const dot = host.replicator.get(id)!;
			const from = dot.values.x as number;
			dot.write({ x: from + 30 });
			await play(host, [{ client, input: [{ dx: 0 }] }], 1);
			await play(host, [{ client, input: [{ dx: 0 }] }], 1);
			// Clock the client to the newest packet: drawn a hundred ms behind, the move is under three ticks old, so still at rest
			const clockToNewest = () => { client._offset = Date.now() - (client.latestTick() * 1000) / 30; };
			clockToNewest();
			expect((client.interpolated()[id] as Dot).x).toBeCloseTo(from, 1);
			await play(host, [{ client, input: [{ dx: 0 }] }], 10);
			clockToNewest();
			expect((client.interpolated()[id] as Dot).x).toBeCloseTo(from + 30, 1);
			host.destroy();
			client.destroy();
		});

		it("delivers reliable events in order and tells the game when a machine drops", async () => {
			const { host, left, client } = await joined({ latency: 25, jitter: 40 });
			const events: unknown[] = [];
			client.on("event", (data: unknown) => { events.push(data); });
			host.event({ n: 1 });
			host.event({ n: 2 });
			host.event({ n: 3 });
			// Events go in the next replication packets, so the host has to send
			await play(host, [{ client, input: [{ dx: 0 }] }], 8);
			expect(events).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
			client.destroy();
			await jest.advanceTimersByTimeAsync(10);
			expect(left).toHaveLength(1);
			host.destroy();
		});

		for (const lossy of [false, true]) {
			it(`converges to the server's state through loss, jitter and reordering (${lossy ? "lossy baselines" : "reliable"})`, async () => {
				let seed = 11;
				const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
				const { host, client, id } = await joined({ latency: 40, jitter: 40, loss: 0.3 }, { lossy });
				let rocks = 0;
				await play(host, [{ client, input: [{ dx: 1 }] }], 90, (i) => {
					// Objects come and go, and a json table changes now and then
					if (i % 7 === 0) host.replicator.create("rock", `rock${rocks++}`, { x: i, size: i % 16, label: `r${i}` }, { scope: "world" });
					if (i % 11 === 0 && rocks > 3) host.replicator.destroy(`rock${rocks - 3}`);
					if (i % 13 === 0) host.replicator.get(id)!.write({ table: { n: i }, hp: i, note: i % 2 ? "odd" : undefined });
				});
				await play(host, [{ client, input: [{ dx: 0 }] }], 40);
				await jest.advanceTimersByTimeAsync(500);
				expect(client.objects.size).toBe(host.replicator.size);
				for (const obj of host.replicator.objects()) expect(client.latest(obj.id)).toEqual(obj.values);
				spy.mockRestore();
				host.destroy();
				client.destroy();
			});
		}
	});
});
