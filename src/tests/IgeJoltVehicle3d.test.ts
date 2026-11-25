/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeJoltBackend } from "@/engine/physics/IgeJoltBackend";
import type { IgePhysicsVehicle3dApi } from "@/engine/physics/IgePhysicsVehicle3dApi";
import { addFloor, createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * Jolt only: vehicles give back every byte of WebAssembly memory they take.
 * (The vehicle behaviour tests in IgePhysicsVehicle3d.test.ts don't depend
 * on the backend.)
 */

beforeAll(() => stubWebGlEngine());

const joltBackend = physicsTestBackends().find((backend) => backend.name === "jolt");
const itJolt = joltBackend ? it : it.skip;

itJolt("frees every Jolt object a vehicle makes", async () => {
	const physics = await createTestPhysics({}, joltBackend);
	addFloor(physics);
	const jolt = (physics._backend as IgeJoltBackend)._jolt;
	const used = () => jolt.JoltInterface.prototype.sGetTotalMemory() - jolt.JoltInterface.prototype.sGetFreeMemory();

	const cycle = (count: number) => {
		const vehicles: IgePhysicsVehicle3dApi[] = [];
		for (let i = 0; i < count; i++) {
			const entity = new IgeEntity();
			entity.translateTo(i * 600, 20, 0);
			const wheels = [0, 1, 2, 3].map(() => new IgeEntity().mount(entity) as IgeEntity);
			const vehicle = physics.addVehicle(entity, i % 2
				? { type: "motorcycle" }
				: { wheelCast: i % 4 ? "ray" : "cylinder", wheels: [
					{ position: { x: 78, y: 53, z: 135 }, steer: 30, entity: wheels[0] },
					{ position: { x: -78, y: 53, z: 135 }, steer: 30, entity: wheels[1] },
					{ position: { x: 78, y: 53, z: -130 }, entity: wheels[2] },
					{ position: { x: -78, y: 53, z: -130 }, entity: wheels[3] }
				] });
			vehicles.push(vehicle);
		}
		run(physics, 0.5, () => vehicles.forEach((v) => v.drive({ forward: 1, right: 0.5, handbrake: 0.5 })));
		vehicles[0].kinematic(true);
		vehicles[0].setState({ ...vehicles[0].getState() });
		run(physics, 0.1);
		vehicles.forEach((v) => v.destroy());
		run(physics, 0.1);
	};

	cycle(4); // warm up the world's own caches
	const before = used();
	for (let i = 0; i < 5; i++) cycle(20);
	// 100 vehicles: leaking even the smallest object (a step listener) would be over 2 KB
	expect(used() - before).toBeLessThan(1024);
	physics.destroy();
});
