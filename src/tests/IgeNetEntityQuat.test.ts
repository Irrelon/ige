import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { ige } from "@/engine/instance";
import { IgeNetEntityClient } from "@/engine/network/entities/IgeNetEntityClient";
import { IgeNetEntityHost } from "@/engine/network/entities/IgeNetEntityHost";
import { igeNetEntity, igeNetEntitySchemas } from "@/engine/network/entities/igeNetEntity";
import { IGE_NET_QUAT_BITS, igeNetQuatAngle, igeNetQuatFromEuler, igeNetQuatPack, igeNetQuatSlerp, igeNetQuatUnpack, type IgeNetQuat } from "@/engine/network/entities/igeNetQuat";
import { IgeNetBitReader, IgeNetBitWriter } from "@/engine/network/replication/IgeNetBits";
import { IgeNetReplicationClient } from "@/engine/network/replication/IgeNetReplicationClient";
import { IgeNetReplicationHost } from "@/engine/network/replication/IgeNetReplicationHost";
import { IgeNetReplicator } from "@/engine/network/replication/IgeNetReplicator";
import { IgeNetSchema, IgeNetSchemaSet } from "@/engine/network/replication/IgeNetSchema";
import { igeNetLoopback, type IgeNetLoopbackOptions } from "@/engine/network/transport/IgeNetTransport";
import { createEntityGame, ENTITY_CLASSES, ENTITY_SCHEMAS, INPUT_SCHEMA, Pilot, Tumbler } from "../examples/entityStream/shared";

const DEG = 180 / Math.PI;

function seeded (seed: number) {
	return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function randomQuat (next: () => number): IgeNetQuat {
	// Gaussian components give uniformly distributed rotations
	const gauss = () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next());
	const q = { x: gauss(), y: gauss(), z: gauss(), w: gauss() };
	const length = Math.hypot(q.x, q.y, q.z, q.w);
	return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

beforeAll(() => {
	Object.defineProperty(ige, "engine", {
		value: {
			renderer: () => undefined,
			_bounds2d: new IgePoint2d(0, 0),
			_currentTime: 0,
			addBehaviour: () => undefined,
			removeBehaviour: () => undefined
		},
		configurable: true,
		writable: true
	});
});

describe("packed quaternions", () => {
	it("keep the angular error under 0.1 degree over many random rotations", () => {
		const next = seeded(42);
		let worst = 0;
		for (let i = 0; i < 100000; i++) {
			const q = randomQuat(next);
			const back = igeNetQuatUnpack(igeNetQuatPack(q));
			worst = Math.max(worst, igeNetQuatAngle(q, back));
			expect(Math.hypot(back.x, back.y, back.z, back.w)).toBeCloseTo(1, 2);
		}
		expect(IGE_NET_QUAT_BITS).toBe(12);
		expect(worst * DEG).toBeLessThan(0.1);
	});

	it("keep it under 0.1 degree at the awkward rotations: axis-aligned, half turns, and where the largest component changes", () => {
		const s = Math.SQRT1_2;
		const cases: IgeNetQuat[] = [
			{ x: 0, y: 0, z: 0, w: 1 }, { x: 1, y: 0, z: 0, w: 0 }, { x: 0, y: 1, z: 0, w: 0 }, { x: 0, y: 0, z: 1, w: 0 },
			{ x: s, y: 0, z: 0, w: s }, { x: 0, y: s, z: 0, w: s }, { x: 0, y: 0, z: s, w: s }, { x: s, y: s, z: 0, w: 0 },
			{ x: 0.5, y: 0.5, z: 0.5, w: 0.5 }, { x: 0.5, y: 0.5, z: 0.5, w: -0.5 }, { x: 0.4999, y: 0.5001, z: 0.5, w: 0.5 }
		];
		for (const q of cases) {
			const length = Math.hypot(q.x, q.y, q.z, q.w);
			const unit = { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
			expect(igeNetQuatAngle(unit, igeNetQuatUnpack(igeNetQuatPack(unit))) * DEG).toBeLessThan(0.1);
		}
	});

	it("pack q and -q to the same integer, and repacking what was unpacked stays within the error", () => {
		const next = seeded(5);
		for (let i = 0; i < 2000; i++) {
			const q = randomQuat(next);
			const code = igeNetQuatPack(q);
			expect(igeNetQuatPack({ x: -q.x, y: -q.y, z: -q.z, w: -q.w })).toBe(code);
			expect(igeNetQuatAngle(igeNetQuatUnpack(igeNetQuatPack(igeNetQuatUnpack(code))), q) * DEG).toBeLessThan(0.2);
		}
	});

	it("go through the wire format of a quat field as 38 bits", () => {
		const schema = new IgeNetSchema("t", { q: { type: "quat" } });
		const next = seeded(9);
		const field = schema.byName.get("q")!;
		const w = new IgeNetBitWriter();
		const codes: number[] = [];
		for (let i = 0; i < 50; i++) {
			const code = igeNetQuatPack(randomQuat(next));
			codes.push(code);
			field.write(w, field.canonical(code));
		}
		expect(w.toBytes().length).toBe(Math.ceil((50 * 38) / 8));
		const r = new IgeNetBitReader(w.toBytes());
		for (const code of codes) expect(field.read(r)).toBe(code);
	});

	it("convert Euler angles the way IgeEntity applies them", () => {
		const next = seeded(3);
		for (let i = 0; i < 50; i++) {
			const rx = (next() - 0.5) * 6, ry = (next() - 0.5) * 6, rz = (next() - 0.5) * 6;
			const q = igeNetQuatFromEuler(rx, ry, rz);
			const a = new IgeMatrix4().identity().rotateZBy(rz).rotateYBy(ry).rotateXBy(rx);
			const b = new IgeMatrix4().identity().rotateByQuaternion(q.x, q.y, q.z, q.w);
			for (let k = 0; k < 16; k++) expect(a.matrix[k]).toBeCloseTo(b.matrix[k], 4);
		}
	});

	it("blend along the shortest path, treating q and -q as one rotation", () => {
		const about = (angle: number): IgeNetQuat => ({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) });
		const a = about(10 / DEG);
		const b = about(30 / DEG);
		const middle = igeNetQuatSlerp(a, b, 0.5);
		expect(igeNetQuatAngle(middle, about(20 / DEG)) * DEG).toBeLessThan(0.001);
		// The same target as its negative: still the short way (20 degrees, not 340)
		const negative = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
		const viaNegative = igeNetQuatSlerp(a, negative, 0.5);
		expect(igeNetQuatAngle(viaNegative, about(20 / DEG)) * DEG).toBeLessThan(0.001);
		// A target nearly a full turn round the long way is a small step back
		const wrapped = about(-350 / DEG);
		const quarter = igeNetQuatSlerp(about(0), wrapped, 0.5);
		expect(igeNetQuatAngle(quarter, about(5 / DEG)) * DEG).toBeLessThan(0.001);
		expect(Math.hypot(middle.x, middle.y, middle.z, middle.w)).toBeCloseTo(1, 6);
	});
});

describe("igeNetEntity rotation", () => {
	it("leaves every kind that doesn't ask for a quaternion exactly as it was", () => {
		const hp = { type: "int" as const, min: 0, max: 100 };
		const angle = (name: string) => ({ [name]: { type: "angle", bits: 12, group: "transform" } });
		const xyz = igeNetEntity("k", { hp });
		expect(xyz.defs).toEqual({
			x: { type: "number", precision: 0.01, group: "transform" },
			y: { type: "number", precision: 0.01, group: "transform" },
			z: { type: "number", precision: 0.01, group: "transform" },
			...angle("rx"), ...angle("ry"), ...angle("rz"),
			hp: { ...hp, blend: false },
			p: { type: "string", blend: false }
		});
		expect(Object.keys(igeNetEntity("k", { hp }, { transform: { rotation: "y" } }).defs)).toEqual(["x", "y", "z", "ry", "hp", "p"]);
		expect(Object.keys(igeNetEntity("k", {}, { transform: { rotation: "none" } }).defs)).toEqual(["x", "y", "z", "p"]);
		// The wire format (the schema hash and the bytes of a create) is the same as a hand-written schema of the same fields
		const legacy = new IgeNetSchema("k", { ...xyz.defs }, xyz.kindOptions);
		const rebuilt = new IgeNetSchema("k", JSON.parse(JSON.stringify(xyz.defs)), xyz.kindOptions);
		expect(rebuilt.hash).toBe(legacy.hash);
		const write = (schema: IgeNetSchema) => {
			const w = new IgeNetBitWriter();
			const values = schema.canonical({ x: 1.5, y: 2, z: -3, rx: 0.5, ry: 1, rz: 2, hp: 50, p: "scene" });
			for (const field of schema.fields) field.write(w, values[field.name]);
			return Array.from(w.toBytes());
		};
		expect(write(rebuilt)).toEqual(write(legacy));
	});

	it("sends one packed field q, not three angles, for rotation: quaternion", () => {
		const net = igeNetEntity("spinner", {}, { rotation: "quaternion" });
		expect(Object.keys(net.defs)).toEqual(["x", "y", "z", "q", "p"]);
		expect(net.defs.q).toEqual({ type: "quat", bits: 12, group: "transform" });
		expect(() => igeNetEntity("bad", { q: { type: "int" } })).toThrow();
	});
});

class Spinner extends IgeEntity {
	static net = igeNetEntity("spinner", {}, { rotation: "quaternion", transform: { precision: 0.05 } });
}
class Turner extends IgeEntity {
	static net = igeNetEntity("turner", {}, { rotation: "quaternion", transform: { precision: 0.05 } });
}

const classes = [Spinner, Turner, Pilot, Tumbler];
const { defs, kinds } = igeNetEntitySchemas(classes);
const TICK = 1000 / 30;

describe("quaternion entities over replication", () => {
	let uid = 0;

	function world (net = igeNetLoopback(), lossy = false) {
		const sid = `q${uid++}`;
		const replicator = new IgeNetReplicator(new IgeNetSchemaSet(defs, kinds), { sendRate: 30 });
		const scene = new IgeScene2d().id(sid);
		const entities = new IgeNetEntityHost(replicator, classes);
		const host = new IgeNetReplicationHost<{ dx: number }>(net.listener, {
			schemas: replicator.schemas,
			replicator,
			inputSchema: { dx: { type: "number", precision: 0.01, min: -1, max: 1 } },
			tickRate: 30,
			sendRate: 30,
			lossy,
			join: (machine) => {
				machine.viewer.subscribe(sid);
				machine.viewer.addInterest({ x: 0, z: 0 }, { radius: 1000 });
				return [];
			},
			step: () => undefined
		});
		const clientScene = new IgeScene2d().id(`c:${sid}`);
		return { net, sid, replicator, scene, clientScene, entities, host };
	}

	async function connect (w: ReturnType<typeof world>, clock: () => number, options: { interpolationDelay?: number; pingInterval?: number } = {}) {
		const client = new IgeNetReplicationClient<{ dx: number }>(w.net.connect(), {
			schemas: w.replicator.schemas,
			inputSchema: { dx: { type: "number", precision: 0.01, min: -1, max: 1 } },
			interpolationDelay: 0,
			pingInterval: 0,
			now: clock,
			...options
		});
		const entities = new IgeNetEntityClient(client, classes, { idOf: (id) => `c:${id}` });
		await client.join([{}]);
		return { client, entities };
	}

	const settle = async () => {
		for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0));
	};

	it("sets entity.quaternion() on the client, from a quaternion or from Euler angles", async () => {
		const w = world();
		let clock = 0;
		const c = await connect(w, () => clock);
		const spinner = new Spinner().id("sp").mount(w.scene).translateTo(1, 2, 3);
		spinner.quaternion({ x: 0.5, y: 0.5, z: 0.5, w: 0.5 });
		const turner = new Turner().id("tu").mount(w.scene).rotateTo(0.4, -1.2, 2.5);
		w.entities.add(spinner);
		w.entities.add(turner);
		w.host.update(TICK);
		await settle();
		clock = c.client.latestTick() * TICK;
		c.client._offset = 0;
		c.entities.update();
		const cs = c.entities.entityOf("sp")!;
		expect(igeNetQuatAngle(cs.quaternion()!, { x: 0.5, y: 0.5, z: 0.5, w: 0.5 }) * DEG).toBeLessThan(0.1);
		expect(cs._translate.x).toBeCloseTo(1, 1);
		const ct = c.entities.entityOf("tu")!;
		expect(igeNetQuatAngle(ct.quaternion()!, igeNetQuatFromEuler(0.4, -1.2, 2.5)) * DEG).toBeLessThan(0.1);
		w.host.destroy();
		c.client.destroy();
		c.entities.destroy();
	});

	it("blends a turning entity between two states along the shortest path", async () => {
		const w = world();
		let clock = 0;
		const c = await connect(w, () => clock);
		const about = (angle: number): IgeNetQuat => ({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) });
		const spinner = new Spinner().id("sp2").mount(w.scene);
		spinner.quaternion(about(170 / DEG));
		w.entities.add(spinner);
		w.host.update(TICK);
		await settle();
		// 170 degrees to -170 (190 the long way round, 20 the short way)
		spinner.quaternion(about(-170 / DEG));
		w.host.update(TICK);
		await settle();
		c.client._offset = 0;
		clock = (c.client.latestTick() - 0.5) * TICK;
		c.entities.update();
		const mid = c.entities.entityOf("sp2")!.quaternion()!;
		expect(igeNetQuatAngle(mid, about(180 / DEG)) * DEG).toBeLessThan(0.2);
		clock = c.client.latestTick() * TICK;
		c.entities.update();
		expect(igeNetQuatAngle(c.entities.entityOf("sp2")!.quaternion()!, about(-170 / DEG)) * DEG).toBeLessThan(0.1);
		w.host.destroy();
		c.client.destroy();
		c.entities.destroy();
	});
});

describe("entities on a lossy transport", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	for (const loss of [0.3, 0.5]) {
		it(`converge to the host's state through ${loss * 100}% loss, jitter and reordering: transform, quaternion, fields, creates and destroys`, async () => {
			let seed = 17;
			const spy = jest.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
			const options: IgeNetLoopbackOptions = { latency: 40, jitter: 40, loss };
			const net = igeNetLoopback(options);
			const w = (() => {
				const sid = `lossy${uid2++}`;
				const replicator = new IgeNetReplicator(new IgeNetSchemaSet(ENTITY_SCHEMAS.defs, ENTITY_SCHEMAS.kinds), { sendRate: 30 });
				const scene = new IgeScene2d().id(sid);
				const entities = new IgeNetEntityHost(replicator, ENTITY_CLASSES);
				const host = new IgeNetReplicationHost<{ dx: number; dz: number }>(net.listener, {
					schemas: replicator.schemas,
					replicator,
					inputSchema: INPUT_SCHEMA,
					tickRate: 30,
					sendRate: 30,
					lossy: true,
					join: (machine) => {
						machine.viewer.subscribe(sid);
						machine.viewer.addInterest({ x: 0, z: 0 }, { radius: 5000 });
						return [];
					},
					step: () => undefined
				});
				return { sid, replicator, scene, entities, host };
			})();
			const client = new IgeNetReplicationClient<{ dx: number; dz: number }>(net.connect(), { schemas: w.replicator.schemas, inputSchema: INPUT_SCHEMA, interpolationDelay: 100, pingInterval: 1000, now: () => Date.now() });
			const clientScene = new IgeScene2d().id(`c:${w.sid}`);
			const entities = new IgeNetEntityClient(client, ENTITY_CLASSES, { idOf: (id) => `c:${id}` });
			const joining = client.join([{}]);
			await jest.advanceTimersByTimeAsync(300);
			await joining;

			const tumblers: Tumbler[] = [];
			const pilots: Pilot[] = [];
			for (let i = 0; i < 120; i++) {
				if (i % 9 === 0) {
					const t = new Tumbler().id(`${loss}t${tumblers.length}`).mount(w.scene);
					t.shape = tumblers.length % 3;
					w.entities.add(t);
					tumblers.push(t);
				}
				if (i % 20 === 0) {
					const p = new Pilot().id(`${loss}p${pilots.length}`).mount(w.scene);
					p.hue = pilots.length % 8;
					p.callsign = `pilot${pilots.length}`;
					w.entities.add(p);
					pilots.push(p);
				}
				if (i === 70) tumblers[1].destroy();
				tumblers.forEach((t, k) => {
					if (!t._alive) return;
					t.translateTo(Math.sin(i / 10 + k) * 200, 10, Math.cos(i / 10 + k) * 200);
					t.quaternion(igeNetQuatFromEuler(i / 7 + k, i / 11, i / 13));
				});
				pilots.forEach((p, k) => {
					p.translateTo(i * 2 + k * 30, 0, k * 10);
					p.rotateTo(0, i / 9, 0);
					if (i % 10 === 0) p.hue = (p.hue + 1) % 8;
				});
				w.host.update(TICK);
				await jest.advanceTimersByTimeAsync(TICK);
				entities.update();
			}
			// The scene stops changing; whatever got lost is sent again
			for (let i = 0; i < 60; i++) {
				w.host.update(TICK);
				await jest.advanceTimersByTimeAsync(TICK);
			}
			await jest.advanceTimersByTimeAsync(500);
			client._offset = Date.now() - (client.latestTick() * 1000) / 30; // draw at the newest state
			client._options.interpolationDelay = 0;
			entities.update();

			const live = [...tumblers, ...pilots].filter((e) => e._alive);
			expect(entities.all().length).toBe(live.length);
			expect(entities.entityOf(`${loss}t1`)).toBeUndefined();
			for (const e of live) {
				const copy = entities.entityOf(e.id())!;
				expect(copy).toBeDefined();
				expect(copy._translate.x).toBeCloseTo(e._translate.x, 1);
				expect(copy._translate.z).toBeCloseTo(e._translate.z, 1);
				if (e instanceof Tumbler) {
					expect((copy as Tumbler).shape).toBe(e.shape);
					expect(igeNetQuatAngle(copy.quaternion()!, e.quaternion()!) * DEG).toBeLessThan(0.1);
				} else {
					expect((copy as Pilot).hue).toBe((e as Pilot).hue);
					expect((copy as Pilot).callsign).toBe((e as Pilot).callsign);
					expect(copy._rotate.y).toBeCloseTo(((e._rotate.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), 2);
				}
			}
			spy.mockRestore();
			entities.destroy();
			clientScene.destroy();
			w.host.destroy();
			w.entities.destroy();
			client.destroy();
		});
	}
});

let uid2 = 0;

describe("the entity streaming examples", () => {
	it("have entity classes that construct, with their kinds and the quaternion field on the tumbler", () => {
		const pilot = new Pilot();
		const tumbler = new Tumbler();
		expect(Pilot.net.kind).toBe("pilot");
		expect(Tumbler.net.kind).toBe("tumbler");
		expect(Tumbler.net.defs.q.type).toBe("quat");
		expect(Pilot.net.defs.ry.type).toBe("angle");
		expect(pilot.hue).toBe(0);
		expect(tumbler.shape).toBe(0);
		expect(ENTITY_SCHEMAS.defs.tumbler).toBeDefined();
		pilot.destroy();
		tumbler.destroy();
	});

	it("run as a game: a machine joins, gets its pilot predicted and sees tumblers turning", async () => {
		const net = igeNetLoopback();
		const game = createEntityGame(net.listener, { tumblers: 6 });
		const client = new IgeNetReplicationClient<{ dx: number; dz: number }>(net.connect(), { schemas: game.replicator.schemas, inputSchema: INPUT_SCHEMA, interpolationDelay: 0, pingInterval: 0, now: () => 0 });
		const scene = new IgeScene2d().id("c:world");
		const entities = new IgeNetEntityClient(client, ENTITY_CLASSES, { idOf: (id) => `c:${id}` });
		const joined = await client.join([{ callsign: "tester" }]);
		client.sendInput([{ dx: 1, dz: 0 }]);
		for (let i = 0; i < 6; i++) {
			game.host.update(TICK);
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		client._offset = 0;
		(client as unknown as { _now: () => number })._now = () => client.latestTick() * TICK;
		entities.update();
		const mine = entities.entityOf(joined.players[0]) as Pilot;
		expect(mine).toBeInstanceOf(Pilot);
		expect(mine.callsign).toBe("tester");
		const tumblers = entities.all().filter((e) => e instanceof Tumbler);
		expect(tumblers.length).toBeGreaterThan(0);
		expect(tumblers.every((t) => !!t.quaternion())).toBe(true);
		entities.destroy();
		scene.destroy();
		game.destroy();
		client.destroy();
	});
});
