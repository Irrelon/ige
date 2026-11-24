/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { readFileSync } from "fs";
import { join } from "path";
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d, IgePhysicsBody3d } from "@/engine/physics/IgePhysics3d";
import type {
	IgePhysicsBodyOptions,
	IgePhysicsBodyState,
	IgePhysicsCharacterState,
	IgePhysicsImpact,
	IgeRagdollState
} from "@/engine/physics/IgePhysics3dTypes";
import type { IgeRagdoll3d } from "@/engine/physics/IgeRagdoll3d";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import { addFloor, createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * What every physics backend must do, through IgePhysics3d's public API
 * only. Each test runs once per backend (physicsTestBackends()), so a new
 * backend (Rapier, IGE's own) is checked against the same behaviour as
 * Jolt. Vehicles have their own suite (IgePhysicsVehicle3d.test.ts) and
 * Jolt's memory checks are Jolt's own (IgeJolt*.test.ts).
 *
 * One IGE unit is a centimetre here (unitsPerMetre 100); the floor's top
 * is at y = 0. Backends may let resting bodies sink a little into what
 * holds them up (Jolt: up to 2 cm), so rest heights are within 3 units.
 * Entities are drawn between the last two steps, so they lag the bodies'
 * state by up to a step.
 */

/** How far a resting body may sink into what it rests on (IGE units). */
const SLOP = 3;

function expectRestingAt (actual: number, expected: number) {
	expect(actual).toBeLessThan(expected + 0.5);
	expect(actual).toBeGreaterThan(expected - SLOP);
}

beforeAll(() => stubWebGlEngine());

const box = (x: number, y: number, z: number) => ({ type: "box" as const, halfExtents: { x, y, z } });

/** A cube's 8 corners and 12 triangles. */
function cubeGeometry (half: number, id: string): IgeGeometryData3d {
	const vertices: number[] = [];
	for (const x of [-half, half]) for (const y of [-half, half]) for (const z of [-half, half]) vertices.push(x, y, z);
	const indices = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
	return { id, vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}

/** An auto-rigged humanoid (hips, spine, head, arms, legs; bone_N), joints in metres, facing +Z. */
const HUMANOID: [number, number, number, number][] = [
	[-1, 0.099, 0.015, -0.092], [0, 0.099, 0.072, -0.096], [1, 0.099, 0.14, -0.099], [2, 0.099, 0.218, -0.103],
	[3, 0.099, 0.303, -0.106], [4, 0.099, 0.328, -0.089],
	[3, 0.142, 0.285, -0.106], [6, 0.22, 0.25, -0.106], [7, 0.273, 0.132, -0.11], [8, 0.288, 0.026, -0.039],
	[3, 0.06, 0.285, -0.114], [10, -0.018, 0.25, -0.124], [11, -0.068, 0.132, -0.163], [12, -0.118, 0.026, -0.167],
	[0, 0.163, -0.017, -0.096], [14, 0.206, -0.213, -0.106], [15, 0.245, -0.38, -0.146], [16, 0.263, -0.447, -0.05],
	[0, 0.035, -0.017, -0.106], [18, 0.003, -0.213, -0.142], [19, -0.022, -0.38, -0.181], [20, -0.064, -0.447, -0.085]
];

/** A skinned entity with a humanoid skeleton about 170 units tall, its feet `feet` above its origin's y. */
function humanoid (x: number, y: number, z: number): IgeEntity {
	const scale = 220;
	const bones = HUMANOID.map(([parent, bx, by, bz], index) => {
		const p = parent >= 0 ? HUMANOID[parent] : [0, 0, 0, 0];
		const local = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, (bx - p[1]) * scale, (by - p[2]) * scale, (bz - p[3]) * scale, 1]);
		return { name: `bone_${index}`, index, parentIndex: parent, childIndices: [] as number[], localBindTransform: local, inverseBindMatrix: new Float32Array(16) };
	});
	for (const bone of bones) if (bone.parentIndex >= 0) bones[bone.parentIndex].childIndices.push(bone.index);
	const data = { id: `humanoid-${Math.random()}`, name: "humanoid", bones, rootBoneIndices: [0], boneCount: bones.length } as IgeSkeletonData;
	const entity = new IgeEntity().skin({ id: "humanoid-mesh" } as IgeGeometryData3d, data);
	entity.translateTo(x, y, z);
	entity.updateTransform();
	return entity;
}

/** Every bone's world position. */
function bonePositions (entity: IgeEntity) {
	entity.updateTransform();
	return HUMANOID.map((_, index) => entity.bonePosition(`bone_${index}`)!);
}

function expectNear (actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }, within: number) {
	expect(Math.hypot(actual.x - expected.x, actual.y - expected.y, actual.z - expected.z)).toBeLessThan(within);
}

describe.each(physicsTestBackends())("IgePhysics3d contract on $name", (backend) => {
	let physics: IgePhysics3d;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
	});

	afterEach(() => physics.destroy());

	function addStatic (x: number, y: number, z: number, hx: number, hy: number, hz: number, options: Partial<IgePhysicsBodyOptions> = {}) {
		const entity = new IgeEntity().translateTo(x, y, z);
		const body = physics.addBody(entity, { type: "static", shape: box(hx, hy, hz), ...options });
		return { entity, body };
	}

	function addDynamic (x: number, y: number, z: number, options: Partial<IgePhysicsBodyOptions> = {}) {
		const entity = new IgeEntity().translateTo(x, y, z);
		const body = physics.addBody(entity, { shape: box(25, 25, 25), ...options });
		return { entity, body };
	}

	describe("the world", () => {
		it("says which backend runs it, and changes gravity", () => {
			expect(physics.backendName()).toBe(backend.name);
			expect(physics.stats().backend).toBe(backend.name);
			expect(physics.unitsPerMetre()).toBe(100);
			expect(physics.gravity()).toBeCloseTo(-9.81, 6);

			const { entity } = addDynamic(0, 1000, 0, { linearDamping: 0 });
			run(physics, 0.5);
			const normal = 1000 - entity._translate.y;
			expect(normal).toBeGreaterThan(100); // about 123 units in half a second
			expect(normal).toBeLessThan(140);

			physics.gravity(-20);
			const { entity: heavy } = addDynamic(500, 1000, 0, { linearDamping: 0 });
			run(physics, 0.5);
			expect(1000 - heavy._translate.y).toBeGreaterThan(normal * 1.8);
		});
	});

	describe("bodies", () => {
		it("drop onto a static floor and come to rest there, their entities following", () => {
			addFloor(physics);
			const crate = addDynamic(0, 300, 0);
			const ball = new IgeEntity().translateTo(200, 300, 0);
			const ballBody = physics.addBody(ball, { shape: { type: "sphere", radius: 20 } });
			const person = new IgeEntity().translateTo(400, 300, 0);
			const personBody = physics.addBody(person, {
				shape: { type: "capsule", radius: 20, halfHeight: 30 },
				offset: { x: 0, y: 50, z: 0 },
				lockRotation: true
			});
			run(physics, 4);

			expectRestingAt(crate.entity._translate.y, 25);
			expectRestingAt(ball._translate.y, 20);
			expectRestingAt(person._translate.y, 0); // its feet, the capsule above them
			for (const body of [crate.body, ballBody, personBody]) {
				const v = body.velocity();
				expect(Math.hypot(v.x, v.y, v.z)).toBeLessThan(1);
				expect(body.asleep()).toBe(true);
			}
			// Upright: it fell flat and the capsule never turns
			expect(person.quaternion()).toBeFalsy();
			expect(crate.body.getState().rotation.w).toBeCloseTo(1, 3);
		});

		it("follow their entity when kinematic, pushing dynamic bodies; static ones stay put", () => {
			addFloor(physics);
			const paddle = new IgeEntity().translateTo(-300, 50, 0);
			physics.addBody(paddle, { type: "kinematic", shape: box(20, 50, 100) });
			const crate = addDynamic(0, 25, 0, { density: 200 });
			const wall = addStatic(0, 50, 1000, 50, 50, 50);

			run(physics, 2, (t) => {
				paddle.translateTo(-300 + t * 400, 50, 0);
				wall.entity.translateTo(t * 100, 50, 1000); // moving a static body's entity does nothing
			});
			expect(crate.entity._translate.x).toBeGreaterThan(150);
			expect(physics.raycast({ x: 0, y: 500, z: 1000 }, { x: 0, y: -1, z: 0 }, 1000)?.entity).toBe(wall.entity);
			expect(wall.body.getState().position.x).toBeCloseTo(0, 3);
		});

		it("are made from meshes, heightfields, convex hulls and compounds", () => {
			// A mesh floor: two triangles, 10 m square, at x = 3000
			const ground = new IgeEntity().translateTo(3000, 0, 0);
			physics.addBody(ground, {
				type: "static",
				shape: {
					type: "mesh",
					geometry: {
						id: "groundMesh",
						vertices: new Float32Array([-500, 0, -500, 500, 0, -500, 500, 0, 500, -500, 0, 500]),
						indices: new Uint32Array([0, 2, 1, 0, 3, 2])
					}
				}
			});
			const onMesh = new IgeEntity().translateTo(3000, 200, 0);
			physics.addBody(onMesh, { shape: { type: "sphere", radius: 20 } });

			// A heightfield 100 units high from x = 6000
			const hills = new IgeEntity().translateTo(6000, 0, 0);
			physics.addBody(hills, { type: "static", shape: { type: "heightfield", heights: new Array(9).fill(100), size: 3, spacing: 200 } });
			const onHills = new IgeEntity().translateTo(6200, 300, 200);
			physics.addBody(onHills, { shape: { type: "sphere", radius: 20 } });

			// A convex hull and a compound table, on a box floor
			addFloor(physics, 2000);
			const hull = new IgeEntity().translateTo(0, 200, 0);
			physics.addBody(hull, { shape: { type: "convex", geometry: cubeGeometry(25, "hullCube") } });
			const table = new IgeEntity().translateTo(500, 200, 0);
			physics.addBody(table, {
				shape: {
					type: "compound",
					children: [
						{ shape: box(60, 5, 40), position: { x: 0, y: 70, z: 0 } },
						...[[-50, -30], [50, -30], [-50, 30], [50, 30]].map(([x, z]) => ({ shape: box(5, 35, 5), position: { x, y: 35, z } }))
					]
				}
			});
			run(physics, 3);

			expectRestingAt(onMesh._translate.y, 20);
			expectRestingAt(onHills._translate.y, 120);
			expectRestingAt(hull._translate.y, 25);
			expectRestingAt(table._translate.y, 0); // standing on its legs
			const top = physics.raycast({ x: 500, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000);
			expect(top?.entity).toBe(table);
			expectRestingAt(top!.point.y, 75);

			// Meshes and heightfields can't move
			expect(() => physics.addBody(new IgeEntity(), { shape: { type: "mesh", geometry: cubeGeometry(10, "dynamicMesh") } })).toThrow();
		});

		it("weigh what their density says, and take impulses, velocities and teleports", () => {
			addFloor(physics);
			const light = addDynamic(0, 200, 0, { shape: box(50, 50, 50), density: 250 });
			const standard = addDynamic(500, 200, 0, { shape: box(50, 50, 50) });
			expect(light.body.mass()).toBeCloseTo(250, -1);
			expect(standard.body.mass()).toBeCloseTo(1000, -1);
			expect(physics.addBody(new IgeEntity(), { type: "static", shape: box(10, 10, 10) }).mass()).toBe(Infinity);

			const ball = new IgeEntity().translateTo(0, 2000, 3000);
			const body = physics.addBody(ball, { shape: { type: "sphere", radius: 10 }, gravityFactor: 0, linearDamping: 0, angularDamping: 0 });
			body.applyImpulse(body.mass() * 100, 0, 0);
			run(physics, 1 / 60);
			expect(body.velocity().x).toBeCloseTo(100, 0);
			body.setVelocity(0, 0, -200);
			body.setAngularVelocity(0, 3, 0);
			run(physics, 0.5);
			expect(body.getState().position.z).toBeCloseTo(3000 - 100, 0);
			expect(body.angularVelocity().y).toBeCloseTo(3, 1);

			body.teleport(-1000, 500, -1000);
			expect(ball._translate.x).toBe(-1000);
			expect(body.velocity().z).toBeCloseTo(0, 3);
			run(physics, 0.1);
			expect(ball._translate.x).toBeCloseTo(-1000, 3);

			// Character-style movement keeps the vertical velocity
			const runner = addDynamic(1000, 2000, 0);
			run(physics, 0.3);
			const falling = runner.body.velocity().y;
			expect(falling).toBeLessThan(-200);
			runner.body.setVelocityXZ(100, -50);
			expectNear(runner.body.velocity(), { x: 100, y: falling, z: -50 }, 0.01);
		});

		it("stand or topple by where their weight sits", () => {
			addFloor(physics);
			// A post 3 m tall on a 30 cm base: upright with its weight in the middle, over on its side with it 40 cm out
			const tilt = (entity: IgeEntity) => {
				const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
				return (Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (q.x * q.x + q.z * q.z)))) * 180) / Math.PI;
			};
			const post = (x: number, options: Partial<IgePhysicsBodyOptions>) => {
				const entity = new IgeEntity().translateTo(x, 0, 0);
				physics.addBody(entity, { shape: box(15, 150, 15), offset: { x: 0, y: 150, z: 0 }, ...options });
				return entity;
			};
			const plain = post(0, {});
			const leaning = post(1000, { centreOfMass: { x: 40, y: 150, z: 0 } });
			// Most of its weight in its foot: shoved at the top it rocks and stays up; with its weight in the middle it falls
			const footed = post(2000, { centreOfMass: { x: 0, y: 10, z: 0 } });
			const middled = post(3000, {});
			run(physics, 2);
			expect(tilt(plain)).toBeLessThan(1);
			expect(tilt(leaning)).toBeGreaterThan(80);
			expect(leaning._translate.x).toBeGreaterThan(1000);
			for (const entity of [footed, middled]) {
				const body = physics.bodyOf(entity)!;
				body.applyImpulse(body.mass() * 40, 0, 0, { x: entity._translate.x, y: 290, z: 0 });
			}
			run(physics, 4);
			expect(tilt(footed)).toBeLessThan(20);
			expect(tilt(middled)).toBeGreaterThan(80);
		});

		it("don't sink into thin ground when fast with continuous collision (ccd)", () => {
			// Ground a centimetre thick; a thin bar thrown down at it at 40 m/s, spinning like a felled lamp post
			addStatic(0, -0.5, 0, 2000, 0.5, 2000);
			const lowest = (entity: IgeEntity) => {
				const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
				let y = Infinity;
				for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
					const v = { x: sx * 10, y: sy * 200, z: sz * 10 };
					const tx = 2 * (q.y * v.z - q.z * v.y), tz = 2 * (q.x * v.y - q.y * v.x);
					y = Math.min(y, entity._translate.y + v.y + q.w * (2 * (q.z * v.x - q.x * v.z)) + (q.z * tx - q.x * tz));
				}
				return y;
			};
			const results = [false, true].map((ccd, i) => {
				const entity = new IgeEntity().translateTo(i * 1000, 400, 0);
				const body = physics.addBody(entity, { shape: box(10, 200, 10), ccd, linearDamping: 0 });
				body.setVelocity(0, -4000, 0);
				body.setAngularVelocity(0, 0, 6);
				let deepest = Infinity;
				run(physics, 2, () => { deepest = Math.min(deepest, lowest(entity)); });
				return { deepest, end: lowest(entity) };
			});
			// It may dig in for a step before the contact pushes it out, but never through, and it ends lying on top
			expect(results[1].deepest).toBeGreaterThan(-5);
			expect(results[1].end).toBeGreaterThan(-3);
			expect(results[1].deepest).toBeGreaterThan(results[0].deepest - 1e-6);
		});

		it("can be taken out of the simulation and put back", () => {
			addFloor(physics);
			const crate = addDynamic(0, 300, 0);
			crate.body.enabled(false);
			expect(crate.body.enabled()).toBe(false);
			run(physics, 1);
			expect(crate.entity._translate.y).toBe(300);
			expect(physics.raycast({ x: 0, y: 1000, z: 0 }, { x: 0, y: -1, z: 0 }, 2000)?.entity).not.toBe(crate.entity);
			crate.body.enabled(true);
			run(physics, 2);
			expectRestingAt(crate.entity._translate.y, 25);
		});
	});

	describe("collision layers", () => {
		it("let ignored pairs pass through each other, and raycasts see what a layer collides with", async () => {
			physics.destroy();
			physics = await createTestPhysics({
				layers: [{ name: "static", static: true }, { name: "moving" }, { name: "characters" }, { name: "corpses" }],
				ignore: [["characters", "corpses"]]
			}, backend);
			addFloor(physics);
			const corpse = addDynamic(0, 25, 0, { shape: box(50, 25, 50), layer: "corpses" });
			const walker = addDynamic(0, 200, 0, { layer: "characters" });
			const crate = addDynamic(0, 400, 40, { layer: "moving" });
			run(physics, 3);

			expectRestingAt(corpse.entity._translate.y, 25);
			expectRestingAt(walker.entity._translate.y, 25); // through the corpse, onto the floor
			expect(crate.entity._translate.y).toBeGreaterThan(70); // on the corpse

			const down = { x: 0, y: -1, z: 0 };
			expect(physics.raycast({ x: -30, y: 300, z: -30 }, down, 1000)?.entity).toBe(corpse.entity);
			const seen = physics.raycast({ x: -30, y: 300, z: -30 }, down, 1000, { layer: "characters" });
			expect(seen?.entity).not.toBe(corpse.entity);
			expect(Math.abs(seen!.point.y)).toBeLessThan(1);
			expect(() => physics.addBody(new IgeEntity(), { shape: box(1, 1, 1), layer: "ghosts" })).toThrow();
		});
	});

	describe("sensors", () => {
		it("report bodies entering and leaving, and follow their entity", () => {
			addFloor(physics);
			const pad = new IgeEntity().translateTo(0, 60, 0);
			const zone = physics.addSensor(pad, { shape: box(50, 50, 50) });
			const entered: IgePhysicsBody3d[] = [], left: IgePhysicsBody3d[] = [];
			zone.on("enter", (body: IgePhysicsBody3d) => { entered.push(body); });
			zone.on("exit", (body: IgePhysicsBody3d) => { left.push(body); });

			const ball = new IgeEntity().translateTo(-300, 60, 0);
			const ballBody = physics.addBody(ball, { shape: { type: "sphere", radius: 20 }, gravityFactor: 0, linearDamping: 0 });
			ballBody.setVelocity(300, 0, 0);
			let inside = false;
			run(physics, 2, () => {
				if (Math.abs(ball._translate.x) < 30) inside = inside || zone.overlapping().includes(ballBody);
			});
			expect(inside).toBe(true);
			expect(entered).toEqual([ballBody]);
			expect(left).toEqual([ballBody]);
			expect(zone.overlapping()).toEqual([]);
			expect(zone.entity).toBe(pad);

			// Moved over a resting crate, it reports the crate (not the floor: it's static)
			const crate = addDynamic(1000, 25, 0);
			run(physics, 1);
			pad.translateTo(1000, 30, 0);
			run(physics, 0.1);
			expect(entered).toContain(crate.body);
			expect(zone.overlapping().map((b) => b.entity)).toEqual([crate.entity]);

			// includeStatic: the floor too
			const ground = physics.addSensor(new IgeEntity().translateTo(-2000, 0, 0), { shape: box(50, 20, 50), includeStatic: true });
			run(physics, 0.1);
			expect(ground.overlapping().length).toBe(1);
			expect(ground.overlapping()[0].type).toBe("static");

			zone.destroy();
			run(physics, 0.1);
			expect(physics.raycast({ x: 1000, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000)?.entity).toBe(crate.entity);
		});
	});

	describe("raycasts", () => {
		it("find the nearest body, with the point, normal and distance", () => {
			addFloor(physics);
			const block = addStatic(0, 50, 0, 50, 50, 50);
			const down = physics.raycast({ x: 10, y: 500, z: 10 }, { x: 0, y: -2, z: 0 }, 1000)!;
			expect(down.entity).toBe(block.entity);
			expect(down.body).toBe(block.body);
			expectNear(down.point, { x: 10, y: 100, z: 10 }, 0.5);
			expectNear(down.normal, { x: 0, y: 1, z: 0 }, 0.01);
			expect(down.distance).toBeCloseTo(400, 0);

			const side = physics.raycast({ x: -500, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 1000)!;
			expect(side.point.x).toBeCloseTo(-50, 0);
			expectNear(side.normal, { x: -1, y: 0, z: 0 }, 0.01);

			expect(physics.raycast({ x: 0, y: 500, z: 0 }, { x: 0, y: 1, z: 0 }, 1000)).toBeNull();
			expect(physics.raycast({ x: 0, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 300)).toBeNull();
			expect(physics.raycast({ x: 2000, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000)?.point.y).toBeCloseTo(0, 0);
		});
	});

	describe("characters", () => {
		it("walk at the set speed, stop at walls, and are found by raycasts", () => {
			addFloor(physics);
			const wall = addStatic(600, 100, 0, 20, 100, 200);
			const entity = new IgeEntity();
			const hero = physics.addCharacter(entity, { radius: 30, height: 170 });
			run(physics, 0.5);
			expect(hero.onGround()).toBe(true);
			hero.move(200, 0);
			run(physics, 1);
			expect(entity._translate.x).toBeGreaterThan(170);
			expect(entity._translate.x).toBeLessThan(230);
			expect(hero.velocity().x).toBeCloseTo(200, -1);
			run(physics, 3);
			expect(entity._translate.x).toBeGreaterThan(530);
			expect(entity._translate.x).toBeLessThan(580 - 25);
			expect(Math.abs(entity._translate.y)).toBeLessThan(2);

			hero.move(0, 0);
			const x = entity._translate.x;
			const hit = physics.raycast({ x, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000);
			expect(hit?.entity).toBe(entity);
			expect(hit?.body).toBe(hero.body);
			expect(physics.bodyOf(entity)).toBe(hero.body);
			expect(wall.entity).toBeDefined();
		});

		it("climb a step but not a tall block, and walk up gentle slopes but not steep ones", () => {
			addFloor(physics);
			addStatic(500, 10, 0, 200, 10, 150); // a 20-unit step
			addStatic(500, 30, 1000, 200, 30, 150); // a 60-unit block
			const ramp = (z: number, degrees: number) => {
				const entity = new IgeEntity().translateTo(1000, 0, z).rotateTo(0, 0, (degrees * Math.PI) / 180);
				physics.addBody(entity, { type: "static", shape: box(400, 10, 150) });
			};
			ramp(2000, 20);
			ramp(3000, 70);

			const walkers = [0, 1000, 2000, 3000].map((z) => {
				const entity = new IgeEntity().translateTo(z < 2000 ? 0 : 500, 0, z);
				const character = physics.addCharacter(entity, { radius: 30, height: 170 });
				return { entity, character };
			});
			run(physics, 3, () => walkers.forEach((w) => w.character.move(200, 0)));
			const [onStep, atBlock, upGentle, atSteep] = walkers.map((w) => w.entity._translate);

			expect(onStep.y).toBeCloseTo(20, 0);
			expect(onStep.x).toBeGreaterThan(400);
			expect(atBlock.x).toBeLessThan(300 - 25);
			expect(atBlock.y).toBeLessThan(2);
			expect(upGentle.y).toBeGreaterThan(25);
			expect(atSteep.y).toBeLessThan(20);
			expect(atSteep.x).toBeLessThan(990);
		});

		it("jump when on the ground, and land again", () => {
			addFloor(physics);
			const entity = new IgeEntity();
			const hero = physics.addCharacter(entity, { radius: 30, height: 170 });
			run(physics, 0.5);
			hero.jump(400);
			let top = 0, airborne = false;
			run(physics, 0.6, () => {
				top = Math.max(top, entity._translate.y);
				airborne = airborne || !hero.onGround();
			});
			expect(airborne).toBe(true);
			expect(top).toBeGreaterThan(60); // about 82 units for 4 m/s
			expect(top).toBeLessThan(100);
			run(physics, 1);
			expect(hero.onGround()).toBe(true);
			expect(Math.abs(entity._translate.y)).toBeLessThan(2);

			// No jumping in mid-air
			hero.teleport(0, 300, 0);
			hero.jump(400);
			run(physics, 0.1);
			expect(hero.velocity().y).toBeLessThan(0);
		});

		it("push light bodies, are shoved by crowds unless unpushable, and can be switched off", () => {
			addFloor(physics);
			const pusher = new IgeEntity().translateTo(0, 0, 0);
			const hero = physics.addCharacter(pusher, { radius: 30, height: 170, maxStrength: 900 });
			const crate = addDynamic(150, 25, 0, { density: 100 });
			run(physics, 2, () => hero.move(200, 0));
			expect(crate.entity._translate.x).toBeGreaterThan(300);

			const shoved = (pushable: boolean, z: number) => {
				const entity = new IgeEntity().translateTo(0, 0, z);
				const character = physics.addCharacter(entity, { radius: 30, height: 170, pushable });
				const zombie = new IgeEntity().translateTo(-120, 0, z);
				const body = physics.addBody(zombie, { shape: { type: "capsule", radius: 30, halfHeight: 55 }, offset: { x: 0, y: 85, z: 0 }, lockRotation: true, friction: 0, density: 1500 });
				return { entity, character, body };
			};
			const pushed = shoved(true, 2000), held = shoved(false, 3000);
			run(physics, 1.5, () => {
				pushed.body.setVelocityXZ(150, 0);
				held.body.setVelocityXZ(150, 0);
			});
			expect(pushed.entity._translate.x).toBeGreaterThan(40);
			expect(Math.abs(held.entity._translate.x)).toBeLessThan(5);

			// Switched off, it's passed through and not found
			held.character.enabled(false);
			expect(held.character.enabled()).toBe(false);
			run(physics, 1.5, () => held.body.setVelocityXZ(150, 0));
			expect(held.body.entity._translate.x).toBeGreaterThan(50);
			const hit = physics.raycast({ x: 0, y: 500, z: 3000 }, { x: 0, y: -1, z: 0 }, 1000);
			expect(hit?.entity).not.toBe(held.entity);
			held.character.enabled(true);
			run(physics, 0.1);
		});

		it("are seen by sensors", () => {
			addFloor(physics);
			const zone = physics.addSensor(new IgeEntity().translateTo(400, 60, 0), { shape: box(60, 60, 60) });
			const entity = new IgeEntity();
			const hero = physics.addCharacter(entity, { radius: 30, height: 170 });
			const seen: IgePhysicsBody3d[] = [];
			zone.on("enter", (body: IgePhysicsBody3d) => { seen.push(body); });
			run(physics, 3, () => hero.move(200, 0));
			expect(seen).toEqual([hero.body]);
		});
	});

	describe("impacts", () => {
		it("report hard knocks and what was hit, and only past the threshold", () => {
			const floor = addFloor(physics);
			const crate = addDynamic(0, 300, 0, { impacts: 100 });
			const quiet = addDynamic(500, 300, 0);
			const impacts: IgePhysicsImpact[] = [];
			crate.body.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });
			let quietImpacts = 0;
			quiet.body.on("impact", () => { quietImpacts++; });
			run(physics, 2);

			expect(impacts.length).toBeGreaterThanOrEqual(1);
			expect(impacts[0].speed).toBeGreaterThan(500); // it lands at about 7 m/s
			expect(impacts[0].impulse).toBeCloseTo(impacts[0].speed * crate.body.mass(), -1);
			expect(impacts[0].others.map((b) => b.entity)).toContain(floor);
			expect(quietImpacts).toBe(0);

			// Resting, it reports nothing; a gentle nudge stays under the threshold
			const count = impacts.length;
			run(physics, 1);
			crate.body.setVelocity(50, 0, 0);
			run(physics, 1);
			expect(impacts.length).toBe(count);
		});
	});

	describe("ragdolls", () => {
		it("fall from a skinned entity's pose, drive its skeleton and are found by raycasts", () => {
			addFloor(physics);
			const before = physics.stats();
			const zombie = humanoid(0, 200, 0);
			const ragdoll = physics.createRagdoll(zombie, { velocity: { x: 100, y: 0, z: 0 } });
			expect(physics.stats().ragdolls).toBe(1);
			expect(physics.stats().bodies).toBeGreaterThan(before.bodies + 6);
			const start = bonePositions(zombie);
			expect(start[4].y).toBeGreaterThan(250); // the head, as posed
			run(physics, 3);

			const lying = bonePositions(zombie);
			for (const p of lying) {
				expect(p.y).toBeGreaterThan(-5);
				expect(p.y).toBeLessThan(60);
			}
			expect(lying[0].x).toBeGreaterThan(start[0].x + 20); // thrown along +x
			const hips = lying[0];
			expect(physics.raycast({ x: hips.x, y: 300, z: hips.z }, { x: 0, y: -1, z: 0 }, 500)?.entity).toBe(zombie);

			ragdoll.destroy();
			expect(physics.stats().ragdolls).toBe(0);
			expect(physics.stats().bodies).toBe(before.bodies);
			expect(physics.raycast({ x: hips.x, y: 300, z: hips.z }, { x: 0, y: -1, z: 0 }, 500)?.entity).not.toBe(zombie);
			ragdoll.destroy(); // twice is harmless
		});

		it("come to rest after restAfter, keeping their pose", () => {
			addFloor(physics);
			const before = physics.stats();
			const zombie = humanoid(0, 200, 0);
			const rested: IgeRagdoll3d[] = [];
			physics.on("ragdollRest", (r: IgeRagdoll3d) => { rested.push(r); });
			const ragdoll = physics.createRagdoll(zombie, { restAfter: 1.5 });
			run(physics, 1);
			expect(ragdoll.rested()).toBe(false);
			run(physics, 1);
			expect(ragdoll.rested()).toBe(true);
			expect(rested).toEqual([ragdoll]);
			expect(physics.stats().ragdolls).toBe(0);
			expect(physics.stats().bodies).toBe(before.bodies);

			const pose = bonePositions(zombie);
			run(physics, 1);
			bonePositions(zombie).forEach((p, i) => expectNear(p, pose[i], 0.001));
		});
	});

	describe("state", () => {
		it("round-trips a moving body through JSON into another world, which carries on the same", async () => {
			addFloor(physics);
			const options: IgePhysicsBodyOptions = { shape: box(25, 15, 40), friction: 0.6 };
			const thrown = new IgeEntity().translateTo(0, 400, 0);
			const body = physics.addBody(thrown, options);
			body.setVelocity(300, 200, 0);
			body.setAngularVelocity(1, 2, 0.5);
			run(physics, 0.25);

			const state = body.getState();
			const json = JSON.parse(JSON.stringify(state)) as IgePhysicsBodyState;
			expect(json).toEqual(state);
			expect(state.asleep).toBe(false);
			expectNear(state.position, thrown._translate, 10); // the entity is a step behind

			const other = await createTestPhysics({}, backend);
			addFloor(other);
			const copyEntity = new IgeEntity().translateTo(-5000, 100, 5000);
			const copy = other.addBody(copyEntity, options);
			copy.setState(json);
			const restored = copy.getState();
			expectNear(restored.position, state.position, 0.01);
			expectNear(restored.velocity, state.velocity, 0.01);
			expectNear(restored.angularVelocity, state.angularVelocity, 0.001);
			expect(Math.abs(restored.rotation.w)).toBeCloseTo(Math.abs(state.rotation.w), 5);
			expectNear(copyEntity._translate, state.position, 0.01);

			// In flight, then landing and tumbling: both worlds do the same
			run(physics, 0.3);
			run(other, 0.3);
			expectNear(copyEntity._translate, thrown._translate, 1);
			run(physics, 2);
			run(other, 2);
			expectNear(copyEntity._translate, thrown._translate, 5);
			other.destroy();
		});

		it("keeps a sleeping body asleep, and gives upright bodies' state at their entity's origin", async () => {
			addFloor(physics);
			const crate = addDynamic(0, 100, 0);
			const options: IgePhysicsBodyOptions = { shape: { type: "capsule", radius: 20, halfHeight: 30 }, offset: { x: 0, y: 50, z: 0 }, lockRotation: true };
			const person = new IgeEntity().translateTo(300, 0, 0);
			const personBody = physics.addBody(person, options);
			run(physics, 4);
			const state = JSON.parse(JSON.stringify(crate.body.getState())) as IgePhysicsBodyState;
			expect(state.asleep).toBe(true);
			const personState = personBody.getState();
			expectNear(personState.position, { x: 300, y: 0, z: 0 }, 1);
			expect(personState.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });

			const other = await createTestPhysics({}, backend);
			addFloor(other);
			const copy = other.addBody(new IgeEntity(), { shape: box(25, 25, 25) });
			copy.setState(state);
			expect(copy.asleep()).toBe(true);
			run(other, 0.5);
			expectNear(copy.entity._translate, crate.entity._translate, 0.5);

			const personCopy = other.addBody(new IgeEntity(), options);
			personCopy.setState({ ...personState, position: { x: 700, y: 0, z: 0 } });
			expectNear(personCopy.getState().position, { x: 700, y: 0, z: 0 }, 0.01);
			run(other, 1);
			expectNear(personCopy.entity._translate, { x: 700, y: 0, z: 0 }, 1);
			other.destroy();
		});

		it("moves kinematic and static bodies and their entities", () => {
			const lift = new IgeEntity().translateTo(0, 0, 0);
			const liftBody = physics.addBody(lift, { type: "kinematic", shape: box(50, 5, 50) });
			const wall = addStatic(1000, 0, 0, 50, 50, 50);
			liftBody.setState({ ...liftBody.getState(), position: { x: 0, y: 300, z: 0 } });
			wall.body.setState({ ...wall.body.getState(), position: { x: 2000, y: 0, z: 0 } });
			run(physics, 0.1);
			expect(lift._translate.y).toBe(300);
			expect(physics.raycast({ x: 0, y: 1000, z: 0 }, { x: 0, y: -1, z: 0 }, 2000)?.point.y).toBeCloseTo(305, 0);
			expect(physics.raycast({ x: 2000, y: 1000, z: 0 }, { x: 0, y: -1, z: 0 }, 2000)?.entity).toBe(wall.entity);
		});

		it("round-trips a character", async () => {
			addFloor(physics);
			const entity = new IgeEntity();
			const hero = physics.addCharacter(entity, { radius: 30, height: 170 });
			run(physics, 1, () => hero.move(150, 50));
			const state = JSON.parse(JSON.stringify(hero.getState())) as IgePhysicsCharacterState;
			expectNear(state.position, entity._translate, 5); // the entity is a step behind
			expect(state.velocity.x).toBeCloseTo(150, -1);

			const other = await createTestPhysics({}, backend);
			addFloor(other);
			const copyEntity = new IgeEntity().translateTo(-1000, 0, -1000);
			const copy = other.addCharacter(copyEntity, { radius: 30, height: 170 });
			copy.setState(state);
			expectNear(copyEntity._translate, state.position, 0.01);
			expectNear(copy.getState().position, state.position, 0.01);
			run(physics, 0.5, () => hero.move(150, 50));
			run(other, 0.5, () => copy.move(150, 50));
			expectNear(copyEntity._translate, entity._translate, 2);
			other.destroy();
		});

		it("round-trips a falling ragdoll", async () => {
			const zombie = humanoid(2000, 1000, 0);
			const ragdoll = physics.createRagdoll(zombie, { velocity: { x: 50, y: 100, z: 0 } });
			run(physics, 0.2);
			const ragdollState = JSON.parse(JSON.stringify(ragdoll.getState())) as IgeRagdollState;
			expect(ragdollState.parts.length).toBe(ragdoll._parts.length);

			const other = await createTestPhysics({}, backend);
			const zombieCopy = humanoid(2000, 400, 0);
			const ragdollCopy = other.createRagdoll(zombieCopy);
			ragdollCopy.setState(ragdollState);
			bonePositions(zombieCopy).forEach((p, i) => expectNear(p, bonePositions(zombie)[i], 0.5));
			run(physics, 0.2);
			run(other, 0.2);
			bonePositions(zombieCopy).forEach((p, i) => expectNear(p, bonePositions(zombie)[i], 2));
			expect(() => ragdollCopy.setState({ parts: [] })).toThrow();
			other.destroy();
		});
	});

	describe("freeing", () => {
		it("removes and frees everything, and destroys a world with everything in it", () => {
			addFloor(physics);
			const before = physics.stats();
			const crate = addDynamic(0, 25, 0);
			const sensor = physics.addSensor(new IgeEntity().translateTo(500, 0, 0), { shape: box(50, 50, 50) });
			const heroEntity = new IgeEntity().translateTo(1000, 0, 0);
			const hero = physics.addCharacter(heroEntity, { radius: 30, height: 170 });
			const ragdoll = physics.createRagdoll(humanoid(1500, 100, 0));
			const car = physics.addVehicle(new IgeEntity().translateTo(3000, 20, 0));
			run(physics, 0.5);
			expect(physics.stats().ragdolls).toBe(1);
			expect(physics.stats().vehicles).toBe(1);

			crate.body.destroy();
			crate.body.destroy();
			sensor.destroy();
			hero.destroy();
			hero.destroy();
			ragdoll.destroy();
			car.destroy();
			const after = physics.stats();
			expect(after.bodies).toBe(before.bodies);
			expect(after.ragdolls).toBe(0);
			expect(after.vehicles).toBe(0);
			expect(physics.bodyOf(crate.entity)).toBeUndefined();
			expect(physics.bodyOf(heroEntity)).toBeUndefined();
			for (const x of [0, 500, 1000, 3000]) {
				expect(physics.raycast({ x, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000)?.point.y).toBeCloseTo(0, 0);
			}
			run(physics, 0.5);

			// Everything at once, freed with the world (afterEach)
			addDynamic(0, 100, 0, { impacts: true });
			physics.addSensor(new IgeEntity(), { shape: box(50, 50, 50) });
			physics.addCharacter(new IgeEntity().translateTo(1000, 0, 0), { radius: 30, height: 170, pushable: false });
			physics.createRagdoll(humanoid(1500, 100, 0));
			physics.addVehicle(new IgeEntity().translateTo(3000, 20, 0), { type: "motorcycle" });
			run(physics, 0.5);
		});
	});
});

describe("IgePhysics3d options", () => {
	it("still reads the old top-level Jolt options, with a warning", async () => {
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		const backend = physicsTestBackends()[0];
		const physics = await createTestPhysics({ jolt: {}, maxBodyPairs: 2048, maxContactConstraints: 1024 }, backend);
		expect(physics._options.jolt).toEqual({ maxBodyPairs: 2048, maxContactConstraints: 1024 });
		addFloor(physics);
		run(physics, 0.1);
		physics.destroy();
		warn.mockRestore();
	});
});

describe("the public physics API", () => {
	it("names no physics engine's types", () => {
		const dir = join(__dirname, "../engine/physics");
		const neutral = [
			"IgePhysics3d.ts", "IgePhysics3dTypes.ts", "IgePhysicsBody3d.ts", "IgePhysicsBackend.ts", "IgePhysicsCharacter3d.ts",
			"IgeRagdoll3d.ts", "IgePhysicsVehicle3d.ts", "IgePhysicsVehicle3dApi.ts", "IgePhysicsVehicle3dBackend.ts"
		];
		for (const file of neutral) {
			const source = readFileSync(join(dir, file), "utf8");
			expect({ file, engine: /from "jolt-physics"|import\("jolt-physics|JoltApi/.test(source) }).toEqual({ file, engine: false });
		}
	});
});
