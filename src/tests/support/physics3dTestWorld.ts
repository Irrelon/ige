import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgePhysics3d, type IgePhysics3dOptions } from "@/engine/physics/IgePhysics3d";

/*
 * Headless physics worlds for tests. Jolt is an ESM-only package that
 * jest's CommonJS require can't load, so the test file must use the native
 * import environment:
 *     @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 * createTestPhysics() is the only place a test touches the backend; the
 * tests themselves use the engine's API, so they can run against another
 * backend by changing this file.
 */

const OPTIONS: IgePhysics3dOptions = {
	unitsPerMetre: 100,
	gravity: -9.81,
	fixedTimeStep: 1 / 60,
	maxSubSteps: 4,
	interpolate: true,
	threads: false,
	maxBodies: 1024,
	maxBodyPairs: 4096,
	maxContactConstraints: 4096,
	layers: [{ name: "static", static: true }, { name: "moving" }],
	ignore: []
};

let joltModule: Promise<any> | undefined;

/** A physics world as the engine makes it, without the engine's frame loop (step it with update()). */
export async function createTestPhysics (options: Partial<IgePhysics3dOptions> = {}): Promise<IgePhysics3d> {
	if (!joltModule) {
		const load = (globalThis as unknown as { igeNativeImport: (name: string) => Promise<any> }).igeNativeImport;
		joltModule = load("jolt-physics").then((m) => m.default());
	}
	return new IgePhysics3d(await joltModule, { ...OPTIONS, ...options }, false);
}

/**
 * A stand-in for the engine: updateTransform() builds 3D world matrices when
 * the renderer is the WebGL one, and worlds add and remove their behaviour.
 */
export function stubWebGlEngine (): void {
	Object.defineProperty(ige, "engine", {
		value: { renderer: () => ({ classId: "IgeWebGlRenderer" }), addBehaviour: () => {}, removeBehaviour: () => {} },
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
