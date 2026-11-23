import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { ige } from "@/engine/instance";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { IgeNetEntityHost } from "@/engine/network/entities/IgeNetEntityHost";
import { igeNetEntity, igeNetEntitySchemas } from "@/engine/network/entities/igeNetEntity";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicator, type IgeNetViewer } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { igeNetLoopback } from "@/engine/network/transport/IgeNetTransport";

class Zombie extends IgeEntity {
	static net = igeNetEntity(
		"zombie",
		{ hp: { type: "int", min: 0, max: 100 }, mood: { type: "enum", values: ["idle", "hunt"] } },
		{ transform: { precision: 0.01, rotation: "y" } }
	);
	hp = 100;
	mood = "idle";
	changes: string[][] = [];
	onNetChange (changed: string[]) {
		this.changes.push(changed);
	}
}

class Crate extends IgeEntity {
	static net = igeNetEntity("crate", {}, { relevance: "scope", transform: { rotation: "none" } });
	made = false;
	static netCreate (): Crate {
		const crate = new Crate();
		crate.made = true;
		return crate;
	}
}

class Coarse extends IgeEntity {
	static net = igeNetEntity("coarse", {}, { transform: { precision: 0.5, angleBits: 3 } });
}

const classes = [Zombie, Crate, Coarse];
const { defs, kinds } = igeNetEntitySchemas(classes);
const inputDefs = { dx: { type: "number" as const, precision: 0.01, min: -1, max: 1 } };
const SPEED = 100;
const TICK = 1000 / 30;

const settle = async (times = 3) => {
	for (let i = 0; i < times; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

let engineBehaviours: Record<string, unknown> = {};
beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: {
			renderer: () => undefined,
			_bounds2d: new IgePoint2d(0, 0),
			addBehaviour: (_type: unknown, id: string, fn: unknown) => { engineBehaviours[id] = fn; },
			removeBehaviour: (_type: unknown, id: string) => { delete engineBehaviours[id]; }
		},
		configurable: true,
		writable: true
	});
});

let uid = 0;

function world () {
	const sid = `s${uid++}`;
	const net = igeNetLoopback();
	const viewers: Record<string, IgeNetViewer> = {};
	const replicator = new IgeNetReplicator(new IgeNetSchemaSet(defs, kinds), { sendRate: 30 });
	const scene = new IgeScene2d().id(sid);
	const scene2 = new IgeScene2d().id(`${sid}b`);
	const entities = new IgeNetEntityHost(replicator, classes);
	const host = new IgeNetReplicationHost<{ dx: number }>(net.listener, {
		schemas: replicator.schemas,
		replicator,
		inputSchema: inputDefs,
		tickRate: 30,
		sendRate: 30,
		join: (machine, players) => {
			const name = (players[0] as { name: string }).name;
			viewers[name] = machine.viewer;
			machine.viewer.subscribe(sid);
			machine.viewer.addInterest({ x: 0, z: 0 }, { radius: 100 });
			if (name.startsWith("hero")) {
				const hero = new Zombie().id(`${name}.hero`).mount(scene);
				entities.add(hero);
				machine.viewer.control(entities.objectOf(hero)!);
				return [hero.id()];
			}
			return [];
		},
		step: (dt, _tick, inputs) => {
			for (const [id, input] of inputs) {
				const hero = ige.$<IgeEntity>(id);
				hero.translateTo(hero._translate.x + input.dx * SPEED * dt, 0, hero._translate.z);
			}
		}
	});
	let clock = 0;
	const clients: { client: IgeNetReplicationClient<{ dx: number }>; entities: IgeNetEntityClient; scene: IgeScene2d; prefix: string }[] = [];
	return {
		sid, scene, scene2, replicator, entities, host, viewers, clients,
		async connect (name: string) {
			const prefix = `${name}:`;
			const client = new IgeNetReplicationClient<{ dx: number }>(net.connect(), { schemas: replicator.schemas, inputSchema: inputDefs, interpolationDelay: 0, now: () => clock, pingInterval: 0 });
			const clientScene = new IgeScene2d().id(`${prefix}${sid}`);
			const clientEntities = new IgeNetEntityClient(client, classes, { idOf: (id) => `${prefix}${id}` });
			const welcome = await client.join([{ name }]);
			const item = { client, entities: clientEntities, scene: clientScene, prefix };
			clients.push(item);
			return { ...item, players: welcome.players };
		},
		/** One server tick and a client frame drawn at the newest state (or `frac` of a tick before it). */
		async step (frac = 0) {
			host.update(TICK);
			await settle();
			for (const { client, entities: e } of clients) {
				clock = (client.latestTick() - frac) * TICK;
				client._offset = 0;
				e.update();
			}
		},
		destroy () {
			host.destroy();
			entities.destroy();
			for (const c of clients) {
				c.entities.destroy();
				c.client.destroy();
				c.scene.destroy();
			}
			scene.destroy();
			scene2.destroy();
		}
	};
}

describe("entity streaming", () => {
	it("makes the right class under the right parent with the transform and fields, and follows changes", async () => {
		const w = world();
		const a = await w.connect("a");
		const z = new Zombie().id("z1").mount(w.scene).translateTo(10, 2, 20).rotateTo(0, 1, 0);
		z.hp = 80;
		z.mood = "hunt";
		z.replicate({ host: w.entities });
		const crate = new Crate().id("c1").mount(w.scene).translateTo(5, 0, 5);
		w.entities.add(crate);
		await w.step();
		const cz = a.entities.entityOf("z1") as Zombie;
		expect(cz).toBeInstanceOf(Zombie);
		expect(cz.id()).toBe("a:z1");
		expect(cz.parent()).toBe(a.scene);
		expect([cz._translate.x, cz._translate.y, cz._translate.z]).toEqual([10, 2, 20]);
		expect(cz._rotate.y).toBeCloseTo(1, 2);
		expect(cz.hp).toBe(80);
		expect(cz.mood).toBe("hunt");
		const cc = a.entities.entityOf("c1") as Crate;
		expect(cc.made).toBe(true); // netCreate
		expect(cz.changes).toEqual([]); // creation isn't a change

		// Moves are interpolated between the ticks
		z.translateTo(20, 2, 20);
		await w.step(0.5);
		expect(cz._translate.x).toBeCloseTo(15, 1);
		await w.step();
		expect(cz._translate.x).toBeCloseTo(20, 1);

		// Field changes: only the ones that changed are named
		z.hp = 50;
		await w.step();
		expect(cz.hp).toBe(50);
		expect(cz.changes).toEqual([["hp"]]);
		z.mood = "idle";
		z.hp = 40;
		await w.step();
		expect(cz.changes[1].sort()).toEqual(["hp", "mood"]);
		w.destroy();
	});

	it("destroys on the client what is destroyed or unreplicated on the server", async () => {
		const w = world();
		const a = await w.connect("a");
		const z1 = new Zombie().id("z1").mount(w.scene);
		const z2 = new Zombie().id("z2").mount(w.scene);
		z1.replicate({ host: w.entities });
		z2.replicate({ host: w.entities });
		await w.step();
		const c1 = a.entities.entityOf("z1")!;
		const c2 = a.entities.entityOf("z2")!;
		expect(c1._alive).toBe(true);
		z1.destroy();
		z2.unreplicate(w.entities);
		await w.step();
		expect(c1._alive).toBe(false);
		expect(c2._alive).toBe(false);
		expect(a.entities.entityOf("z1")).toBeUndefined();
		expect(ige.$("a:z1")).toBeUndefined();
		expect(w.replicator.size).toBe(0);
		w.destroy();
	});

	it("sends a spatial entity only while it is within a viewer's range, and a scope entity at any distance", async () => {
		const w = world();
		const a = await w.connect("a"); // an interest at the origin, radius 100
		const far = new Zombie().id("far").mount(w.scene).translateTo(500, 0, 0);
		far.replicate({ host: w.entities });
		const crate = new Crate().id("c1").mount(w.scene).translateTo(900, 0, 900);
		crate.replicate({ host: w.entities });
		await w.step();
		expect(a.entities.entityOf("far")).toBeUndefined();
		expect(a.entities.entityOf("c1")).toBeDefined();
		far.translateTo(50, 0, 0);
		await w.step();
		expect(a.entities.entityOf("far")).toBeDefined();
		far.translateTo(500, 0, 0);
		await w.step();
		await w.step();
		expect(a.entities.entityOf("far")).toBeUndefined();
		w.destroy();
	});

	it("keeps an owner's entity private, and shows and hides a relevant() entity per viewer", async () => {
		const w = world();
		const a = await w.connect("a");
		const b = await w.connect("b");
		const mine = new Zombie().id("mine").mount(w.scene);
		w.entities.add(mine, { owner: w.viewers.a });
		let aSees = true;
		const hidden = new Zombie().id("sneaky").mount(w.scene);
		w.entities.add(hidden, { relevant: (viewer) => viewer === w.viewers.a && aSees });
		await w.step();
		expect(a.entities.entityOf("mine")).toBeDefined();
		expect(b.entities.entityOf("mine")).toBeUndefined();
		expect(a.entities.entityOf("sneaky")).toBeDefined();
		expect(b.entities.entityOf("sneaky")).toBeUndefined();
		aSees = false;
		await w.step();
		expect(a.entities.entityOf("sneaky")).toBeUndefined();
		aSees = true;
		await w.step();
		expect(a.entities.entityOf("sneaky")).toBeDefined();
		w.destroy();
	});

	it("follows an entity to another scene", async () => {
		const w = world();
		const a = await w.connect("a");
		const z = new Zombie().id("z1").mount(w.scene);
		z.replicate({ host: w.entities });
		await w.step();
		expect(a.entities.entityOf("z1")).toBeDefined();
		z.mount(w.scene2);
		await w.step();
		expect(a.entities.entityOf("z1")).toBeUndefined();
		z.mount(w.scene);
		await w.step();
		expect(a.entities.entityOf("z1")).toBeDefined();
		w.destroy();
	});

	it("mounts a child under its streamed parent, whichever create arrives first", async () => {
		const w = world();
		const a = await w.connect("a");
		const parent = new Crate().id("parent").mount(w.scene);
		const child = new Zombie().id("child").mount(parent).translateTo(3, 0, 0);
		const late = new Zombie().id("late").mount(parent);
		// The child first: its parent comes a few rounds later
		w.entities.add(child);
		await w.step();
		await w.step();
		const cc = a.entities.entityOf("child")!;
		expect(cc).toBeDefined();
		expect(cc.parent()).toBeFalsy();
		w.entities.add(parent);
		await w.step();
		expect(cc.parent()).toBe(a.entities.entityOf("parent"));
		expect(cc._translate.x).toBe(3);
		// Both in one round, the child's object made before its parent's
		w.entities.add(late);
		await w.step();
		expect(a.entities.entityOf("late")!.parent()).toBe(a.entities.entityOf("parent"));
		// Moved to another parent
		child.mount(w.scene);
		await w.step();
		expect(cc.parent()).toBe(a.scene);
		w.destroy();
	});

	it("predicts the controlled entity at once and never holds the server's view of it back", async () => {
		const w = world();
		const a = await w.connect("hero1");
		const heroId = a.players[0];
		const hero = ige.$<IgeEntity>(heroId);
		const objectId = heroId;
		a.entities.control<{ x: number }, { dx: number }>(objectId, 0, (state, input, dt) => ({ ...state, x: state.x + input.dx * SPEED * dt }));
		for (let i = 0; i < 20; i++) {
			const zed = new Zombie().id(`bg${i}`).mount(w.scene).translateTo(i, 0, 0);
			w.entities.add(zed);
		}
		await w.step();
		const mine = a.entities.entityOf(objectId)!;
		expect(mine.id()).toBe(`hero1:${heroId}`);
		expect(mine._translate.x).toBe(0);
		// Input, and a frame before the server has stepped: the entity has moved already
		a.client.sendInput([{ dx: 1 }]);
		a.entities.update(undefined, 1);
		expect(mine._translate.x).toBeCloseTo(SPEED / 30, 2);
		// A budget so small that only the controlled entity gets anything, while everything moves
		w.viewers.hero1.bandwidth = 200;
		for (let i = 0; i < 10; i++) {
			for (let j = 0; j < 20; j++) ige.$<IgeEntity>(`bg${j}`).translateTo(j + i + 1, 0, 0);
			a.client.sendInput([{ dx: 1 }]);
			await w.step();
			expect(a.client.latest(heroId)!.x).toBeCloseTo(hero._translate.x, 1);
		}
		w.destroy();
	});

	it("quantises as declared", async () => {
		const w = world();
		const a = await w.connect("a");
		const coarse = new Coarse().id("k").mount(w.scene).translateTo(1.3, 0, 0).rotateTo(0, 1, 1);
		w.entities.add(coarse);
		const fine = new Zombie().id("f").mount(w.scene).translateTo(1.2345, 0, 0).rotateTo(0, 1, 0);
		w.entities.add(fine);
		await w.step();
		const k = a.entities.entityOf("k")!;
		expect(k._translate.x).toBe(1.5); // steps of 0.5
		expect(k._rotate.x).toBe(0);
		expect(k._rotate.y).toBeCloseTo(Math.PI / 4, 5); // 3 bits: steps of an eighth of a turn
		expect(k._rotate.z).toBeCloseTo(Math.PI / 4, 5);
		const f = a.entities.entityOf("f")!;
		expect(f._translate.x).toBe(1.23);
		expect(Math.abs(f._rotate.y - 1)).toBeLessThan(Math.PI / 4096 + 1e-9);
		w.destroy();
	});

	it("sends nothing for an entity that hasn't changed since its create", async () => {
		const w = world();
		await w.connect("a");
		const z = new Zombie().id("z1").mount(w.scene).translateTo(1, 2, 3);
		z.replicate({ host: w.entities });
		await w.step();
		const before = w.host.stats().bytesByKind.zombie;
		expect(before).toBeGreaterThan(0);
		for (let i = 0; i < 10; i++) await w.step();
		expect(w.host.stats().bytesByKind.zombie).toBe(before);
		z.hp = 10;
		await w.step();
		expect(w.host.stats().bytesByKind.zombie).toBeGreaterThan(before);
		w.destroy();
	});

	it("is attached to the engine as a behaviour, and describes kinds once", () => {
		const w = world();
		const c = new IgeNetEntityClient(new IgeNetReplicationClient(igeNetLoopback().connect(), { schemas: w.replicator.schemas, pingInterval: 0 }), classes);
		c.attach();
		expect(Object.keys(engineBehaviours)).toHaveLength(1);
		c.detach();
		expect(Object.keys(engineBehaviours)).toHaveLength(0);
		expect(() => igeNetEntitySchemas([Zombie, Zombie])).toThrow(/Two entity classes/);
		expect(Object.keys(defs.zombie)).toEqual(["x", "y", "z", "ry", "hp", "mood", "p"]);
		expect((defs.zombie.hp as { blend?: boolean }).blend).toBe(false);
		c.client.destroy();
		w.destroy();
	});
});
