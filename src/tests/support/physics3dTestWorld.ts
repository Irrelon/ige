import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysics3dOptions } from "@/engine/physics/IgePhysics3dTypes";
import type { IgePhysicsBackendFactory } from "@/engine/physics/IgePhysicsBackend";
import { igeJoltPhysics } from "@/engine/physics/IgeJoltBackend";
import { IgeWebGlSkeletonManager } from "@/engine/webgl/IgeWebGlSkeletonManager";

/*
 * Headless physics worlds for tests, for every physics backend. Jolt is
 * an ESM-only package that jest's CommonJS require can't load, so the test
 * file must use the native import environment:
 *     @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 *
 * This file is the only place a test names a backend. The behaviour tests
 * use the engine's API only, and run once per backend in
 * physicsTestBackends() (all of them, or the ones named in the
 * IGE_PHYSICS_BACKENDS environment variable, comma-separated):
 *     describe.each(physicsTestBackends())("vehicles on $name", (backend) => {
 *         const physics = await createTestPhysics({}, backend);
 *     });
 * A new backend adds itself to BACKENDS.
 */

export interface PhysicsTestBackend {
	name: string;
	factory: () => IgePhysicsBackendFactory;
}

const nativeImport = (name: string): Promise<any> =>
	(globalThis as unknown as { igeNativeImport: (name: string) => Promise<any> }).igeNativeImport(name);

let joltModule: Promise<any> | undefined;

const BACKENDS: PhysicsTestBackend[] = [
	{
		name: "jolt",
		factory: () => igeJoltPhysics({ load: () => (joltModule ??= nativeImport("jolt-physics").then((m) => m.default())) })
	}
];

/** The backends the physics tests run against. */
export function physicsTestBackends (): PhysicsTestBackend[] {
	const wanted = (process.env.IGE_PHYSICS_BACKENDS || "").split(",").map((name) => name.trim()).filter(Boolean);
	const list = wanted.length ? BACKENDS.filter((backend) => wanted.includes(backend.name)) : BACKENDS;
	if (!list.length) throw new Error(`No physics test backend called ${wanted.join(", ")} (there are ${BACKENDS.map((b) => b.name).join(", ")})`);
	return list;
}

const OPTIONS: Partial<IgePhysics3dOptions> = {
	unitsPerMetre: 100,
	gravity: -9.81,
	fixedTimeStep: 1 / 60,
	maxSubSteps: 4,
	interpolate: true,
	threads: false,
	maxBodies: 1024,
	jolt: { maxBodyPairs: 4096, maxContactConstraints: 4096 },
	layers: [{ name: "static", static: true }, { name: "moving" }],
	ignore: []
};

/**
 * A physics world as the engine makes it (IgePhysics3d.create()), without
 * the engine's frame loop: step it with update() or run(). The first test
 * backend unless one is given.
 */
export async function createTestPhysics (options: Partial<IgePhysics3dOptions> = {}, backend: PhysicsTestBackend = physicsTestBackends()[0]): Promise<IgePhysics3d> {
	return IgePhysics3d.create({ ...OPTIONS, ...options, backend: backend.factory() });
}

/**
 * A stand-in for the engine: updateTransform() builds 3D world matrices when
 * the renderer is the WebGL one, worlds add and remove their behaviour, and
 * skeletons (ragdolls) get their bone matrices worked out.
 */
export function stubWebGlEngine (): void {
	const skeletonManager = new IgeWebGlSkeletonManager();
	Object.defineProperty(ige, "engine", {
		value: {
			renderer: () => ({ classId: "IgeWebGlRenderer", frameId: () => 1, skeletonManager }),
			addBehaviour: () => {},
			removeBehaviour: () => {}
		},
		configurable: true,
		writable: true
	});
}

/** Step a world for some seconds of simulated time, calling each() before every step. */
export function run (physics: IgePhysics3d, seconds: number, each?: (time: number) => void): void {
	const step = 1 / 60;
	for (let t = 0; t < seconds - 1e-9; t += step) {
		each?.(t);
		physics.update(step);
	}
}

/** A static floor: a 400 m square slab with its top at y = 0. */
export function addFloor (physics: IgePhysics3d, halfSize: number = 20000): IgeEntity {
	const floor = new IgeEntity();
	floor.translateTo(0, -50, 0);
	physics.addBody(floor, { type: "static", shape: { type: "box", halfExtents: { x: halfSize, y: 50, z: halfSize } } });
	return floor;
}
