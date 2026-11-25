/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import { type IgeJolt, type IgeJoltBackend, igeJoltInit, igeJoltPhysics, igeJoltWasmWithMemory } from "@/engine/physics/IgeJoltBackend";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import { addFloor, createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * Jolt only: bodies of every shape, sensors, characters and ragdolls give
 * back every byte of WebAssembly memory they take (vehicles: see
 * IgeJoltVehicle3d.test.ts). Their behaviour is checked for every backend
 * in IgePhysics3dContract.test.ts.
 */

beforeAll(() => stubWebGlEngine());

const joltBackend = physicsTestBackends().find((backend) => backend.name === "jolt");
const itJolt = joltBackend ? it : it.skip;

/** A chain of five bones, 20 units apart, standing up. */
function chain (): IgeEntity {
	const bones = [0, 1, 2, 3, 4].map((index) => ({
		name: `b${index}`, index, parentIndex: index - 1, childIndices: index < 4 ? [index + 1] : [],
		localBindTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, index ? 20 : 0, 0, 1]),
		inverseBindMatrix: new Float32Array(16)
	}));
	const data = { id: `chain-${Math.random()}`, name: "chain", bones, rootBoneIndices: [0], boneCount: 5 } as IgeSkeletonData;
	return new IgeEntity().skin({ id: "chainMesh" } as IgeGeometryData3d, data);
}

itJolt("frees every Jolt object bodies, sensors, characters and ragdolls make", async () => {
	const physics = await createTestPhysics({}, joltBackend);
	addFloor(physics);
	const jolt = (physics._backend as IgeJoltBackend)._jolt;
	const used = () => jolt.JoltInterface.prototype.sGetTotalMemory() - jolt.JoltInterface.prototype.sGetFreeMemory();
	const cube = (half: number): IgeGeometryData3d => {
		const v: number[] = [];
		for (const x of [-half, half]) for (const y of [-half, half]) for (const z of [-half, half]) v.push(x, y, z);
		return { id: "leakCube", vertices: new Float32Array(v), indices: new Uint32Array([0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3]) };
	};

	const cycle = () => {
		const at = (x: number, y: number) => new IgeEntity().translateTo(x, y, 0);
		const bodies = [
			physics.addBody(at(0, 100), { shape: { type: "box", halfExtents: { x: 20, y: 20, z: 20 } }, impacts: true, density: 300 }),
			physics.addBody(at(100, 100), { shape: { type: "sphere", radius: 20 }, ccd: true }),
			physics.addBody(at(200, 100), { shape: { type: "capsule", radius: 20, halfHeight: 30 }, lockRotation: true }),
			physics.addBody(at(300, 100), { shape: { type: "convex", geometry: cube(20) } }),
			physics.addBody(at(400, 100), { shape: { type: "compound", children: [{ shape: { type: "box", halfExtents: { x: 20, y: 5, z: 20 } } }, { shape: { type: "sphere", radius: 10 }, position: { x: 0, y: 20, z: 0 } }] } }),
			physics.addBody(at(500, 0), { type: "static", shape: { type: "mesh", geometry: cube(30) } }),
			physics.addBody(at(600, 0), { type: "static", shape: { type: "heightfield", heights: new Array(9).fill(10), size: 3, spacing: 30 } }),
			physics.addBody(at(700, 50), { type: "kinematic", shape: { type: "box", halfExtents: { x: 20, y: 20, z: 20 } } })
		];
		const sensor = physics.addSensor(at(0, 50), { shape: { type: "box", halfExtents: { x: 100, y: 50, z: 100 } } });
		const characters = [
			physics.addCharacter(at(-300, 0), { radius: 30, height: 170 }),
			physics.addCharacter(at(-500, 0), { radius: 30, height: 170, pushable: false })
		];
		characters[1].enabled(false); // freed while out of the world too
		const ragdolls = [0, 1].map((i) => physics.createRagdoll(chain().translateTo(-800 - i * 200, 100, 0), {
			parts: [{ bone: "b0", to: "b1", radius: 5 }, { bone: "b1", to: "b2", radius: 5 }, { bone: "b2", to: "b4", radius: 5 }],
			restAfter: i ? 0.2 : undefined
		}));
		bodies[0].enabled(false);
		bodies[0].enabled(true);
		run(physics, 0.4, () => characters[0].move(100, 0));
		physics.raycast({ x: 0, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000);
		bodies.forEach((b) => b.destroy());
		sensor.destroy();
		characters.forEach((c) => c.destroy());
		ragdolls.forEach((r) => r.destroy());
		run(physics, 0.1);
	};

	cycle(); // warm up the world's own caches
	cycle();
	const before = used();
	for (let i = 0; i < 10; i++) cycle();
	// 160 objects: leaking even the smallest (a character's contact listener, about 20 bytes) would be over 200 bytes
	expect(used() - before).toBeLessThan(128);
	physics.destroy();
});

itJolt("builds mesh shapes without leaving a JS wrapper per vertex or triangle, and they collide", async () => {
	const physics = await createTestPhysics({}, joltBackend);
	const jolt = (physics._backend as IgeJoltBackend)._jolt as IgeJolt & { getCache (kind: unknown): Record<number, unknown> };
	const cached = () => Object.keys(jolt.getCache(jolt.Float3)).length + Object.keys(jolt.getCache(jolt.IndexedTriangle)).length;

	// A 60 x 60 grid of 50-unit cells with a gentle wave, indexed, and the same as loose triangles
	const n = 60, cell = 50;
	const height = (x: number, z: number) => 10 * Math.sin(x / 300) * Math.cos(z / 300);
	const v: number[] = [], idx: number[] = [];
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) v.push(i * cell - (n * cell) / 2, height(i * cell, j * cell), j * cell - (n * cell) / 2);
	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) {
			const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
			idx.push(a, c, b, b, c, d);
		}
	}
	const loose: number[] = [];
	for (const k of idx) loose.push(v[k * 3], v[k * 3 + 1], v[k * 3 + 2]);
	const indexed: IgeGeometryData3d = { id: "grid", vertices: new Float32Array(v), indices: new Uint32Array(idx) };
	const unindexed: IgeGeometryData3d = { id: "gridLoose", vertices: new Float32Array(loose) };

	const before = cached();
	physics.addBody(new IgeEntity(), { type: "static", shape: { type: "mesh", geometry: indexed } });
	physics.addBody(new IgeEntity().translateTo(5000, 0, 0), { type: "static", shape: { type: "mesh", geometry: unindexed } });
	// 3,721 vertices and 7,200 triangles each: at most the first two elements of each list were looked at
	expect(cached() - before).toBeLessThanOrEqual(4);

	// Balls dropped on both land on the surface, where its height says
	const balls = [0, 5000].map((x) => ({ x, ball: new IgeEntity().translateTo(x + 120, 150, -80) }));
	for (const { ball } of balls) physics.addBody(ball, { shape: { type: "sphere", radius: 20 } });
	run(physics, 2);
	for (const { x, ball } of balls) {
		const t = ball._translate;
		expect(t.y - 20).toBeCloseTo(height(t.x - x + (n * cell) / 2, t.z + (n * cell) / 2), -1);
		expect(t.y).toBeGreaterThan(0);
	}
	physics.destroy();
});

/** A WebAssembly module with a memory of `pages` (exported as "mem"), or importing one as "a"."m" (min and max `pages`). */
function moduleWithMemory (pages: number, imported: boolean): Uint8Array {
	const leb = (value: number) => {
		const out: number[] = [];
		do { let b = value % 128; value = Math.floor(value / 128); if (value) b |= 0x80; out.push(b); } while (value);
		return out;
	};
	const limits = [1, ...leb(pages), ...leb(pages)];
	const section = (id: number, body: number[]) => [id, ...leb(body.length), ...body];
	const head = [0, 0x61, 0x73, 0x6d, 1, 0, 0, 0];
	const memory = imported
		? section(2, [1, 1, 0x61, 1, 0x6d, 2, ...limits])
		: section(5, [1, ...limits]);
	const exported = section(7, [1, 3, 0x6d, 0x65, 0x6d, 2, 0]);
	return new Uint8Array([...head, ...memory, ...exported]);
}

it("resizes a WebAssembly module's memory, made or imported, only when it's the size asked about", () => {
	const made = igeJoltWasmWithMemory(moduleWithMemory(2048, false), 2048, 3072)!;
	expect(made).not.toBeNull();
	const instance = new WebAssembly.Instance(new WebAssembly.Module(made));
	expect((instance.exports.mem as WebAssembly.Memory).buffer.byteLength).toBe(3072 * 65536);

	const imports = igeJoltWasmWithMemory(moduleWithMemory(2048, true), 2048, 3072)!;
	const memory = new WebAssembly.Memory({ initial: 3072, maximum: 3072 });
	// The unpatched module refuses a memory bigger than it declares; the patched one takes it
	expect(() => new WebAssembly.Instance(new WebAssembly.Module(moduleWithMemory(2048, true)), { a: { m: memory } })).toThrow();
	expect(() => new WebAssembly.Instance(new WebAssembly.Module(imports), { a: { m: memory } })).not.toThrow();

	expect(igeJoltWasmWithMemory(moduleWithMemory(1024, false), 2048, 3072)).toBeNull();
	expect(igeJoltWasmWithMemory(new Uint8Array([1, 2, 3]), 2048, 3072)).toBeNull();
});

itJolt("loads Jolt with more memory than its own 128 MB, and holds more worlds", async () => {
	const { igeNativeImport, igeNativeWebAssembly } = globalThis as unknown as {
		igeNativeImport: (name: string) => Promise<{ default: () => Promise<IgeJolt> }>;
		igeNativeWebAssembly: typeof WebAssembly;
	};
	const module = await igeNativeImport("jolt-physics");
	const jolt = await igeJoltInit(() => module.default(), 320, igeNativeWebAssembly);
	expect(jolt.HEAP8.length).toBe(320 * 1024 * 1024);
	const used = () => jolt.JoltInterface.prototype.sGetTotalMemory() - jolt.JoltInterface.prototype.sGetFreeMemory();
	// Eight worlds of 16,384 bodies (about 22 MB each): more than 128 MB holds
	const worlds: IgePhysics3d[] = [];
	for (let i = 0; i < 8; i++) {
		worlds.push(await createTestPhysics({ maxBodies: 16384, jolt: { maxBodyPairs: 65536, maxContactConstraints: 20000 } }, { name: "jolt", factory: () => igeJoltPhysics({ load: async () => jolt }) }));
	}
	expect(used()).toBeGreaterThan(150 * 1024 * 1024);
	for (const world of worlds) {
		addFloor(world);
		const ball = new IgeEntity().translateTo(0, 100, 0);
		world.addBody(ball, { shape: { type: "sphere", radius: 20 } });
		run(world, 1);
		expect(ball._translate.y).toBeCloseTo(20, -1);
	}
	for (const world of worlds) world.destroy();
	expect(() => igeJoltInit(() => module.default(), 5000)).toThrow();
});
