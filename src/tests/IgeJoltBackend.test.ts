/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeJoltBackend } from "@/engine/physics/IgeJoltBackend";
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
