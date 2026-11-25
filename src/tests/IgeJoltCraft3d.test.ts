/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeJoltBackend } from "@/engine/physics/IgeJoltBackend";
import type { IgePhysicsCraft3dApi } from "@/engine/physics/IgePhysicsCraft3dApi";
import { createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * Jolt only: boats, aircraft and floating bodies give back every byte of
 * WebAssembly memory they take: their bodies (with a mass and centre of
 * mass of their own, switched to kinematic and back), and the filters
 * their landing gear's rays use to skip their own body. (Their behaviour
 * is checked for every backend in IgePhysicsCraft3d.test.ts.)
 */

beforeAll(() => stubWebGlEngine());

const joltBackend = physicsTestBackends().find((backend) => backend.name === "jolt");
const itJolt = joltBackend ? it : it.skip;

itJolt("frees every Jolt object boats, aircraft and floating bodies make", async () => {
	const physics = await createTestPhysics({}, joltBackend);
	const ground = new IgeEntity().translateTo(0, -3050, 0);
	physics.addBody(ground, { type: "static", shape: { type: "box", halfExtents: { x: 100000, y: 50, z: 100000 } } });
	const runway = new IgeEntity().translateTo(0, -50, -20000);
	physics.addBody(runway, { type: "static", shape: { type: "box", halfExtents: { x: 50000, y: 50, z: 5000 } } });
	physics.water({ level: 0, waves: [{ direction: 0, length: 2000, amplitude: 20 }] });
	const jolt = (physics._backend as IgeJoltBackend)._jolt;
	const used = () => jolt.JoltInterface.prototype.sGetTotalMemory() - jolt.JoltInterface.prototype.sGetFreeMemory();

	const cycle = (count: number) => {
		const crafts: IgePhysicsCraft3dApi[] = [];
		for (let i = 0; i < count; i++) {
			const x = (i % 10) * 3000;
			if (i % 4 === 0) {
				const boat = physics.addBoat(new IgeEntity().translateTo(x, 0, 10000), { preset: i % 8 ? "speedboat" : "fishingBoat" });
				boat.drive({ throttle: 1, steer: 0.5 });
				crafts.push(boat);
			} else if (i % 4 === 1) {
				const plane = physics.addAircraft(new IgeEntity().translateTo(x, 0, -20000), { preset: i % 8 === 1 ? "lightPlane" : "jet", impacts: true });
				plane.fly({ throttle: 1, yaw: 0.5, brake: 0.2 });
				crafts.push(plane);
			} else if (i % 4 === 2) {
				const heli = physics.addAircraft(new IgeEntity().translateTo(x, 0, -24000), { preset: "helicopter" });
				heli.fly({ collective: 1 });
				crafts.push(heli);
			} else {
				crafts.push(physics.addAircraft(new IgeEntity().translateTo(x, 0, 14000), { preset: "floatplane" }));
			}
		}
		const crates = [0, 1, 2].map((i) => {
			const body = physics.addBody(new IgeEntity().translateTo(i * 200, 100, 0), {
				shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density: 300 + i * 500, centreOfMass: { x: 0, y: -10, z: 0 }
			});
			physics.addBuoyancy(body);
			return body;
		});
		run(physics, 0.5);
		crafts[0].kinematic(true);
		crafts[0].setState({ ...crafts[0].getState() });
		crafts[1].kinematic(true);
		run(physics, 0.1);
		crafts[1].kinematic(false);
		run(physics, 0.1);
		crafts.forEach((craft) => craft.destroy());
		crates.forEach((crate) => crate.destroy());
		run(physics, 0.1);
	};

	// Warm up with the same load: Jolt's own buffers grow once to their high-water mark (a few KB)
	cycle(20);
	cycle(20);
	const before = used();
	for (let i = 0; i < 5; i++) cycle(20);
	// 100 craft and 15 floating crates. A clean run moves under 16 bytes; leaking just the
	// raycast filter of each aircraft that casts rays (about 20 bytes each) moves about 1 KB
	expect(used() - before).toBeLessThan(256);
	expect(physics.stats().crafts).toBe(0);
	expect(physics.stats().floating).toBe(0);
	physics.destroy();
});
