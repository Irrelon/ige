/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsImpact } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgePhysicsVehicle3dApi,
	IgePhysicsVehicleLanding,
	IgePhysicsVehicleOptions,
	IgePhysicsVehicleState
} from "@/engine/physics/IgePhysicsVehicle3dApi";
import { addFloor, createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * Vehicles driven headlessly through the engine's vehicle API
 * (IgePhysicsVehicle3dApi), once per physics backend (see
 * physicsTestBackends()). One IGE unit is a centimetre here (unitsPerMetre
 * 100).
 */

const U = 100;

beforeAll(() => stubWebGlEngine());

/** Rotate v by the quaternion q. */
function rotate (v: { x: number; y: number; z: number }, q: { x: number; y: number; z: number; w: number }) {
	const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
	return { x: v.x + q.w * tx + (q.y * tz - q.z * ty), y: v.y + q.w * ty + (q.z * tx - q.x * tz), z: v.z + q.w * tz + (q.x * ty - q.y * tx) };
}

/** Heading in degrees: 0 along +Z, negative turning right (towards -X). */
function heading (vehicle: IgePhysicsVehicle3dApi): number {
	const f = rotate({ x: 0, y: 0, z: 1 }, vehicle.getState().rotation);
	return (Math.atan2(f.x, f.z) * 180) / Math.PI;
}

describe.each(physicsTestBackends())("IgePhysics3d vehicles on $name", (backend) => {
	let physics: IgePhysics3d;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
		addFloor(physics, 200000);
	});

	afterEach(() => physics.destroy());

	function addVehicle (options: IgePhysicsVehicleOptions = {}, x: number = 0, z: number = 0) {
		const entity = new IgeEntity();
		entity.translateTo(x, 20, z);
		return { entity, vehicle: physics.addVehicle(entity, options) };
	}

	/** Drive flat out until the vehicle reaches a speed. */
	function speedUp (vehicle: IgePhysicsVehicle3dApi, kmh: number) {
		for (let t = 0; t < 15 && vehicle.speedKmh() < kmh; t += 1 / 60) run(physics, 1 / 60, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.speedKmh()).toBeGreaterThanOrEqual(kmh);
	}

	it("comes to rest on its suspension with its origin on the ground", () => {
		const { entity, vehicle } = addVehicle();
		run(physics, 2);

		expect(Math.abs(vehicle.speed())).toBeLessThan(1);
		expect(vehicle.grounded()).toBe(true);
		expect(vehicle.upsideDown()).toBe(false);
		expect(vehicle.tilt()).toBeLessThan(1);
		expect(vehicle.wheelCount()).toBe(4);
		for (let i = 0; i < 4; i++) {
			const wheel = vehicle.wheel(i);
			expect(wheel.contact).toBe(true);
			expect(wheel.compression).toBeGreaterThan(0.2);
			expect(wheel.compression).toBeLessThan(0.9);
			expect(wheel.point.y).toBeCloseTo(0, 0);
		}
		// The default car's origin is on the ground, and the entity follows the body
		expect(Math.abs(entity._translate.y)).toBeLessThan(5);
		const state = vehicle.getState();
		expect(entity._translate.x).toBeCloseTo(state.position.x, 3);
		expect(entity._translate.y).toBeCloseTo(state.position.y, 3);
	});

	it("accelerates along its facing (+Z) and shifts up", () => {
		const { entity, vehicle } = addVehicle();
		run(physics, 1);
		const gears = new Set<number>();
		run(physics, 5, () => {
			vehicle.drive({ forward: 1 });
			gears.add(vehicle.gear());
			expect(vehicle.rpm()).toBeLessThanOrEqual(6500 + 1);
		});

		expect(vehicle.speedKmh()).toBeGreaterThan(70);
		expect(vehicle.speedKmh()).toBeCloseTo((vehicle.speed() / U) * 3.6, 6);
		expect(entity._translate.z).toBeGreaterThan(30 * U);
		expect(Math.abs(entity._translate.x)).toBeLessThan(2 * U);
		expect(Math.max(...gears)).toBeGreaterThanOrEqual(2);
		expect(vehicle.rpm()).toBeGreaterThan(1000);
	});

	it("steers right towards -X, with less lock at speed", () => {
		const { entity, vehicle } = addVehicle();
		run(physics, 1);
		speedUp(vehicle, 30);
		const before = heading(vehicle);
		const x = entity._translate.x;
		run(physics, 2, () => vehicle.drive({ forward: 0.5, right: 1 }));

		expect(heading(vehicle) - before).toBeLessThan(-45);
		expect(entity._translate.x).toBeLessThan(x - 5 * U);
		expect(vehicle.wheel(0).steer).toBeGreaterThan(5);
		expect(vehicle.wheel(2).steer).toBe(0);
		expect(vehicle.tilt()).toBeLessThan(10);

		// Faster, the lock narrows
		const slowLock = vehicle.wheel(0).steer;
		speedUp(vehicle, 100);
		run(physics, 0.5, () => vehicle.drive({ forward: 1, right: 1 }));
		expect(vehicle.wheel(0).steer).toBeLessThan(slowLock);
	});

	it("brakes to a stop, then reverses while the brake is held", () => {
		const { entity, vehicle } = addVehicle();
		run(physics, 1);
		speedUp(vehicle, 60);
		const z = entity._translate.z;
		let time = 0;
		while (vehicle.speedKmh() > 1 && time < 5) {
			run(physics, 1 / 60, () => vehicle.drive({ brake: 1 }));
			time += 1 / 60;
		}
		expect(time).toBeLessThan(3);
		expect(entity._translate.z - z).toBeLessThan(25 * U);

		run(physics, 2, () => vehicle.drive({ brake: 1 }));
		expect(vehicle.speedKmh()).toBeLessThan(-3);
		expect(vehicle.gear()).toBeLessThan(0);

		// Throttle while reversing brakes first, then drives forward
		run(physics, 3, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.speedKmh()).toBeGreaterThan(5);
	});

	it("stays stopped on the brake when reverseOnBrake is off", () => {
		const { vehicle } = addVehicle({ reverseOnBrake: false });
		run(physics, 1);
		run(physics, 2, () => vehicle.drive({ brake: 1 }));
		expect(Math.abs(vehicle.speedKmh())).toBeLessThan(0.5);
	});

	it("locks the rear wheels with the handbrake, and the tail swings round", () => {
		const { vehicle } = addVehicle();
		run(physics, 1);
		speedUp(vehicle, 60);
		const before = heading(vehicle);
		run(physics, 0.5, () => vehicle.drive({ right: 1, handbrake: 1 }));

		for (const rear of [2, 3]) {
			expect(Math.abs(vehicle.wheel(rear).spin)).toBeLessThan(1);
			expect(vehicle.wheel(rear).longitudinalSlip).toBeLessThan(-5 * U);
		}
		expect(vehicle.wheel(0).spin).toBeGreaterThan(10);
		run(physics, 0.5, () => vehicle.drive({ right: 1, handbrake: 1 }));
		expect(heading(vehicle) - before).toBeLessThan(-50);
		expect(vehicle.upsideDown()).toBe(false);
	});

	it("keeps a motorcycle upright, and leans it into turns", () => {
		const { vehicle } = addVehicle({ type: "motorcycle" });
		expect(vehicle.wheelCount()).toBe(2);
		run(physics, 2);
		expect(vehicle.tilt()).toBeLessThan(10);
		expect(vehicle.wheel(0).contact && vehicle.wheel(1).contact).toBe(true);

		let most = 0;
		run(physics, 4, () => {
			vehicle.drive({ forward: 1 });
			most = Math.max(most, vehicle.tilt());
		});
		expect(vehicle.speedKmh()).toBeGreaterThan(40);
		expect(most).toBeLessThan(25);

		const before = heading(vehicle);
		run(physics, 2, () => vehicle.drive({ forward: 0.5, right: 1 }));
		expect(vehicle.tilt()).toBeGreaterThan(10);
		expect(vehicle.tilt()).toBeLessThan(60);
		expect(heading(vehicle) - before).toBeLessThan(-20);
		expect(vehicle.upsideDown()).toBe(false);
		expect(vehicle.grounded()).toBe(true);
	});

	it("reports slip while the tyres slide", () => {
		const { vehicle } = addVehicle({ tractionControl: false });
		run(physics, 1);
		let spin = 0;
		run(physics, 1, () => {
			vehicle.drive({ forward: 1 });
			spin = Math.max(spin, vehicle.wheel(2).longitudinalSlip, vehicle.wheel(3).longitudinalSlip);
		});
		expect(spin).toBeGreaterThan(1 * U);

		speedUp(vehicle, 70);
		let sideways = 0;
		run(physics, 1, () => {
			vehicle.drive({ right: 1, handbrake: 1 });
			for (let i = 0; i < 4; i++) sideways = Math.max(sideways, Math.abs(vehicle.wheel(i).lateralSlip));
		});
		expect(sideways).toBeGreaterThan(2 * U);
	});

	it("round-trips its state through JSON and carries on from it", async () => {
		const { vehicle } = addVehicle();
		run(physics, 1);
		run(physics, 3, () => vehicle.drive({ forward: 1, right: 0.3 }));
		const state = vehicle.getState();
		const json = JSON.parse(JSON.stringify(state)) as IgePhysicsVehicleState;
		expect(json).toEqual(state);
		expect(state.wheelSpin).toHaveLength(4);
		expect(state.input).toEqual({ forward: 1, right: 0.3, brake: 0, handbrake: 0, pitch: 0, roll: 0 });

		// The same car in another world, put in that state, matches it...
		const other = await createTestPhysics({}, backend);
		addFloor(other, 200000);
		const copyEntity = new IgeEntity();
		const copy = other.addVehicle(copyEntity);
		copy.setState(json);
		const restored = copy.getState();
		for (const key of ["position", "velocity", "angularVelocity"] as const) {
			expect(restored[key].x).toBeCloseTo(state[key].x, 2);
			expect(restored[key].y).toBeCloseTo(state[key].y, 2);
			expect(restored[key].z).toBeCloseTo(state[key].z, 2);
		}
		expect(Math.abs(restored.rotation.w)).toBeCloseTo(Math.abs(state.rotation.w), 4);
		expect(restored.gear).toBe(state.gear);
		expect(restored.rpm).toBeCloseTo(state.rpm!, 0);
		expect(restored.steer).toBeCloseTo(state.steer!, 6);
		expect(restored.input).toEqual(state.input);
		restored.wheelSpin!.forEach((spin, i) => expect(spin).toBeCloseTo(state.wheelSpin![i], 3));
		expect(copyEntity._translate.z).toBeCloseTo(state.position.z, 2);

		// ...and carries on the same way (the input came with the state)
		run(physics, 0.5);
		run(other, 0.5);
		const a = vehicle.getState().position, b = copy.getState().position;
		expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.25 * U);
		expect(copy.speedKmh()).toBeCloseTo(vehicle.speedKmh(), -1);
		other.destroy();
	});

	it("follows given states in kinematic mode, pushing bodies out of its way", () => {
		const { entity, vehicle } = addVehicle({}, 5000, 0);
		run(physics, 1);
		const crate = new IgeEntity();
		crate.translateTo(5000, 50, 800);
		const crateBody = physics.addBody(crate, { shape: { type: "box", halfExtents: { x: 50, y: 50, z: 50 } }, density: 100 });
		run(physics, 0.5);

		vehicle.kinematic(true);
		expect(vehicle.kinematic()).toBe(true);
		const start = vehicle.getState();
		const speed = 10 * U;
		let time = 0;
		// States arrive at 30 Hz, physics steps at 60 Hz
		run(physics, 2, () => {
			time += 1 / 60;
			if (Math.round(time * 60) % 2 === 0) {
				vehicle.setState({
					...start,
					position: { x: start.position.x, y: start.position.y, z: start.position.z + speed * time },
					velocity: { x: 0, y: 0, z: speed },
					angularVelocity: { x: 0, y: 0, z: 0 },
					rpm: 3000,
					gear: 2,
					steer: 0.5
				});
			}
		});
		expect(entity._translate.z).toBeGreaterThan(start.position.z + speed * 1.9);
		expect(entity._translate.z).toBeLessThan(start.position.z + speed * 2.1);
		expect(Math.abs(entity._translate.x - 5000)).toBeLessThan(1);
		expect(crateBody.velocity().z + crate._translate.z).toBeGreaterThan(800 + speed);
		// Its wheels follow the ground, steer and roll at its speed
		expect(vehicle.grounded()).toBe(true);
		expect(vehicle.wheel(0).steer).toBeGreaterThan(5);
		expect(vehicle.wheel(2).spin).toBeCloseTo(speed / U / 0.34, 0);
		expect(vehicle.rpm()).toBe(3000);
		expect(vehicle.gear()).toBe(2);

		// With no new states it carries on for `extrapolate` seconds, then holds
		const last = entity._translate.z;
		run(physics, 1);
		expect(entity._translate.z - last).toBeGreaterThan(speed * 0.2);
		expect(entity._translate.z - last).toBeLessThan(speed * 0.4);

		// Back to simulated, it carries on at the speed it was moved
		vehicle.setState({ ...vehicle.getState(), velocity: { x: 0, y: 0, z: speed } });
		vehicle.kinematic(false);
		run(physics, 0.1);
		expect(vehicle.speed()).toBeGreaterThan(speed * 0.8);
	});

	it("poses wheel entities: suspension, steering and spin", () => {
		const entity = new IgeEntity();
		const wheels = [0, 1, 2, 3].map(() => new IgeEntity().mount(entity) as IgeEntity);
		const layout = [{ x: 78, z: 135, steer: 32 }, { x: -78, z: 135, steer: 32 }, { x: 78, z: -130 }, { x: -78, z: -130 }];
		entity.translateTo(0, 20, 0);
		const vehicle = physics.addVehicle(entity, {
			wheels: layout.map((w, i) => ({ position: { x: w.x, y: 53, z: w.z }, steer: w.steer, entity: wheels[i] }))
		});
		run(physics, 1);
		// Centres a wheel radius above the ground, under their fixing points
		for (const wheel of wheels) {
			expect(wheel._translate.y).toBeGreaterThan(25);
			expect(wheel._translate.y).toBeLessThan(45);
		}
		expect(wheels[0]._translate.x).toBeCloseTo(78, 3);

		speedUp(vehicle, 20);
		run(physics, 0.5, () => vehicle.drive({ forward: 0.3, right: 1 }));
		// Axles: the front one turned (right, so it points back on the left), the rear one straight
		const front = rotate({ x: 1, y: 0, z: 0 }, wheels[0].quaternion()!);
		const rear = rotate({ x: 1, y: 0, z: 0 }, wheels[2].quaternion()!);
		expect(front.z).toBeGreaterThan(0.2);
		expect(rear.x).toBeCloseTo(1, 3);
		const spinBefore = { ...wheels[2].quaternion()! };
		run(physics, 0.05, () => vehicle.drive({ forward: 0.3 }));
		const spinAfter = { ...wheels[2].quaternion()! };
		expect(Math.abs(spinBefore.x - spinAfter.x) + Math.abs(spinBefore.w - spinAfter.w)).toBeGreaterThan(0.01);
	});

	it("is found by raycasts and vehicleOf()", () => {
		const { entity, vehicle } = addVehicle({}, -3000, 0);
		run(physics, 1);
		const hit = physics.raycast({ x: -3000, y: 500, z: 0 }, { x: 0, y: -1, z: 0 }, 1000);
		expect(hit?.entity).toBe(entity);
		expect(physics.vehicleOf(entity)).toBe(vehicle);
		expect(vehicle.wheel(0).entity).not.toBeNull();

		// Removing the body a raycast found removes the vehicle with it
		const vehicles = physics.stats().vehicles;
		hit!.body.destroy();
		expect(physics.stats().vehicles).toBe(vehicles - 1);
		expect(physics.vehicleOf(entity)).toBeUndefined();
		run(physics, 0.2);
	});

	it("drives a six-wheeled bus with a manual gearbox and all-wheel drive", () => {
		const entity = new IgeEntity();
		entity.translateTo(0, 20, -8000);
		const half = { x: 125, y: 150, z: 550 };
		const vehicle = physics.addVehicle(entity, {
			mass: 11000,
			chassis: { type: "box", halfExtents: half },
			chassisOffset: { x: 0, y: 200, z: 0 },
			drive: "all",
			engine: { maxTorque: 1500, maxRpm: 3000 },
			gearbox: { mode: "manual", ratios: [6, 3.5, 2, 1.3, 1], shiftUpRpm: 2500 },
			antiRoll: 40000,
			wheels: [
				{ position: { x: 105, y: 75, z: 380 }, radius: 50, width: 30, steer: 35 },
				{ position: { x: -105, y: 75, z: 380 }, radius: 50, width: 30, steer: 35 },
				{ position: { x: 105, y: 75, z: -280 }, radius: 50, width: 30 },
				{ position: { x: -105, y: 75, z: -280 }, radius: 50, width: 30 },
				{ position: { x: 105, y: 75, z: -400 }, radius: 50, width: 30 },
				{ position: { x: -105, y: 75, z: -400 }, radius: 50, width: 30 }
			]
		});
		run(physics, 2);
		expect(vehicle.wheelCount()).toBe(6);
		expect(vehicle.tilt()).toBeLessThan(2);
		vehicle.shift(1);
		run(physics, 3, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.gear()).toBe(1);
		expect(vehicle.speedKmh()).toBeGreaterThan(10);
		for (let i = 0; i < 6; i++) expect(vehicle.wheel(i).contact).toBe(true);
	});

	it("frees its bodies when removed, and the world when destroyed with vehicles in it", () => {
		const before = physics.stats();
		const vehicles = [0, 1, 2, 3, 4].map((i) => addVehicle(i % 2 ? { type: "motorcycle" } : {}, i * 1000, 3000).vehicle);
		run(physics, 0.5, () => vehicles.forEach((v) => v.drive({ forward: 1 })));
		expect(physics.stats().vehicles).toBe(5);
		expect(physics.stats().bodies).toBe(before.bodies + 5);

		vehicles.slice(0, 3).forEach((v) => v.destroy());
		vehicles[0].destroy(); // twice is harmless
		physics.removeVehicle(vehicles[3]);
		expect(physics.stats().vehicles).toBe(1);
		expect(physics.stats().bodies).toBe(before.bodies + 1);
		expect(physics.raycast({ x: 0, y: 500, z: 3000 }, { x: 0, y: -1, z: 0 }, 1000)?.entity).not.toBe(vehicles[0].entity);
		expect(physics.vehicleOf(vehicles[0].entity)).toBeUndefined();
		run(physics, 0.5);
		// The last one is freed by physics.destroy() in afterEach
	});

	it("can be taken out of the simulation and put back", () => {
		const { entity, vehicle } = addVehicle();
		run(physics, 1);
		vehicle.enabled(false);
		const y = entity._translate.y;
		run(physics, 1, () => vehicle.drive({ forward: 1 }));
		expect(entity._translate.y).toBe(y);
		vehicle.enabled(true);
		run(physics, 2, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.speedKmh()).toBeGreaterThan(20);
	});

	/** A static wall (IGE units, centre and half sizes). */
	function addWall (x: number, y: number, z: number, hx: number, hy: number, hz: number) {
		const entity = new IgeEntity().translateTo(x, y, z);
		physics.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: hx, y: hy, z: hz } } });
		return entity;
	}

	/** A rotation of `degrees` about an axis. */
	function turn (axis: { x: number; y: number; z: number }, degrees: number) {
		const s = Math.sin((degrees * Math.PI) / 360);
		return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos((degrees * Math.PI) / 360) };
	}

	it("reports impacts with what it hit, and none while just driving", () => {
		const { vehicle } = addVehicle({ impacts: true }, 0, -6000);
		const wall = addWall(0, 150, 1500, 1000, 150, 50);
		const impacts: IgePhysicsImpact[] = [];
		vehicle.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });

		// Pulling away, braking hard, turning and a handbrake slide on open ground
		run(physics, 1);
		run(physics, 3, () => vehicle.drive({ forward: 1 }));
		run(physics, 1, () => vehicle.drive({ brake: 1 }));
		run(physics, 1.5, () => vehicle.drive({ forward: 1, right: 1 }));
		run(physics, 1, () => vehicle.drive({ right: -1, handbrake: 1 }));
		expect(impacts).toEqual([]);

		// Into the wall at about 40 km/h
		vehicle.setState({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, velocity: { x: 0, y: 0, z: 11 * U }, angularVelocity: { x: 0, y: 0, z: 0 } });
		run(physics, 2, () => vehicle.drive({ forward: 0.3 }));
		expect(impacts.length).toBeGreaterThanOrEqual(1);
		const hit = impacts.reduce((a, b) => (b.speed > a.speed ? b : a));
		expect(hit.speed).toBeGreaterThan(5 * U);
		expect(hit.impulse).toBeCloseTo(hit.speed * 1300, -2);
		expect(hit.others.map((b) => b.entity)).toContain(wall);
	});

	it("knocks people over, who report the vehicle that hit them", () => {
		const { entity, vehicle } = addVehicle({}, 0, -3000);
		const person = new IgeEntity().translateTo(0, 0, 0);
		const body = physics.addBody(person, {
			shape: { type: "capsule", radius: 30, halfHeight: 55 }, offset: { x: 0, y: 85, z: 0 }, density: 1000, impacts: 300
		});
		const hits: IgePhysicsImpact[] = [];
		body.on("impact", (impact: IgePhysicsImpact) => { hits.push(impact); });
		run(physics, 1);
		speedUp(vehicle, 30);
		run(physics, 4, () => vehicle.drive({ forward: 0.5 }));

		const byCar = hits.filter((hit) => hit.others.some((other) => other.entity === entity));
		expect(byCar.length).toBeGreaterThanOrEqual(1);
		expect(physics.vehicleOf(byCar[0].others.find((other) => other.entity === entity)!.entity)).toBe(vehicle);
		expect(Math.hypot(person._translate.x, person._translate.z)).toBeGreaterThan(200);
	});

	it("keeps its wheels out of a wall it slides into side-on", () => {
		const { vehicle } = addVehicle({}, 0, 4000);
		addWall(-250, 100, 4000, 50, 100, 600); // its right side, the wall's face at x = -200
		run(physics, 1);
		vehicle.setState({ ...vehicle.getState(), velocity: { x: -6 * U, y: 0, z: 0 } });
		let deepest = Infinity;
		run(physics, 1.5, () => {
			const state = vehicle.getState();
			for (const z of [135, -130]) {
				// The right wheels' outer faces (x = -0.78 m - half the width)
				const face = rotate({ x: -78 - 11, y: 30, z }, state.rotation);
				deepest = Math.min(deepest, state.position.x + face.x);
			}
		});
		expect(deepest).toBeGreaterThan(-200 - 1);
	});

	it("knows when it's in the air, and reports landing", () => {
		const { vehicle } = addVehicle({}, 0, 8000);
		const landings: IgePhysicsVehicleLanding[] = [];
		vehicle.on("landed", (landing: IgePhysicsVehicleLanding) => { landings.push(landing); });
		run(physics, 1);
		expect(vehicle.airborne()).toBe(false);
		expect(landings).toEqual([]);

		// Off a 3 m drop at 10 m/s
		vehicle.setState({ position: { x: 0, y: 300, z: 8000 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, velocity: { x: 0, y: 0, z: 10 * U }, angularVelocity: { x: 0, y: 0, z: 0 } });
		run(physics, 0.2);
		expect(vehicle.airborne()).toBe(true);
		expect(vehicle.grounded()).toBe(false);
		run(physics, 1.5);
		expect(vehicle.airborne()).toBe(false);
		expect(landings.length).toBe(1);
		expect(landings[0].onWheels).toBe(true);
		expect(landings[0].speed).toBeGreaterThan(6 * U); // about 7.3 m/s after 2.4 m of fall
		expect(landings[0].speed).toBeLessThan(8.5 * U);
		expect(landings[0].velocity.z).toBeGreaterThan(8 * U);
		expect(landings[0].airTime).toBeGreaterThan(0.6);
		expect(landings[0].tilt).toBeLessThan(15);

		// Dropped on its roof
		vehicle.setState({ position: { x: 0, y: 400, z: 12000 }, rotation: turn({ x: 0, y: 0, z: 1 }, 180), velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
		run(physics, 2);
		expect(landings.length).toBe(2);
		expect(landings[1].onWheels).toBe(false);
		expect(landings[1].tilt).toBeGreaterThan(150);
		expect(vehicle.airborne()).toBe(false);
		expect(vehicle.grounded()).toBe(false);
	});

	it("pitches and rolls in the air with air control", () => {
		const spins = (input: { pitch?: number; roll?: number }, options: IgePhysicsVehicleOptions = {}) => {
			const { vehicle } = addVehicle(options, 0, -20000);
			vehicle.setState({ position: { x: 0, y: 5000, z: -20000 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
			run(physics, 0.1);
			run(physics, 0.6, () => vehicle.drive(input));
			const state = vehicle.getState();
			vehicle.destroy();
			return { nose: rotate({ x: 0, y: 0, z: 1 }, state.rotation), left: rotate({ x: 1, y: 0, z: 0 }, state.rotation), spin: Math.hypot(state.angularVelocity.x, state.angularVelocity.y, state.angularVelocity.z) };
		};
		const still = spins({});
		expect(still.nose.y).toBeCloseTo(0, 2);
		expect(still.spin).toBeLessThan(0.01);

		const noseDown = spins({ pitch: 1 });
		expect(noseDown.nose.y).toBeLessThan(-0.3); // 20 to 60 degrees down
		expect(noseDown.nose.y).toBeGreaterThan(-0.9);
		expect(noseDown.spin).toBeLessThanOrEqual((150 * Math.PI) / 180 + 0.01);
		expect(spins({ pitch: -1 }).nose.y).toBeGreaterThan(0.3);
		expect(spins({ roll: 1 }).left.y).toBeGreaterThan(0.3); // right side down: the left side up
		expect(spins({ pitch: 1 }, { airControl: 0 }).nose.y).toBeCloseTo(0, 2);

		// On the ground, pitch and roll do nothing to a car
		const { vehicle } = addVehicle({}, 3000, -20000);
		run(physics, 1);
		run(physics, 1, () => vehicle.drive({ pitch: 1, roll: 1 }));
		expect(vehicle.tilt()).toBeLessThan(2);
	});

	it("rocks itself back onto its wheels from its roof, with a second or two of steering", () => {
		const { vehicle } = addVehicle({}, 0, 16000);
		vehicle.setState({ position: { x: 0, y: 200, z: 16000 }, rotation: turn({ x: 0, y: 0, z: 1 }, 180), velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
		run(physics, 3);
		expect(vehicle.upsideDown()).toBe(true);
		run(physics, 0.5, () => vehicle.drive({ right: 1 }));
		expect(vehicle.upsideDown()).toBe(true); // not at once
		let time = 0.5;
		while (vehicle.tilt() > 60 && time < 4) {
			run(physics, 1 / 60, () => vehicle.drive({ right: 1 }));
			time += 1 / 60;
		}
		expect(time).toBeLessThan(3);
		run(physics, 2, () => vehicle.drive({}));
		expect(vehicle.tilt()).toBeLessThan(10);
		expect(vehicle.grounded()).toBe(true);

		// Not while moving, nor with self-righting off
		const { vehicle: other } = addVehicle({ selfRighting: 0 }, 3000, 16000);
		other.setState({ position: { x: 3000, y: 200, z: 16000 }, rotation: turn({ x: 0, y: 0, z: 1 }, 180), velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
		run(physics, 6, () => other.drive({ right: 1, roll: 1 }));
		expect(other.upsideDown()).toBe(true);
	});

	it("keeps a motorcycle upright until let go, when it falls over; upright again once stood up", () => {
		const { vehicle } = addVehicle({ type: "motorcycle" }, 0, 20000);
		run(physics, 3);
		expect(vehicle.upright()).toBe(true);
		expect(vehicle.tilt()).toBeLessThan(10);

		vehicle.upright(false);
		expect(vehicle.getState().upright).toBe(false);
		run(physics, 4);
		expect(vehicle.tilt()).toBeGreaterThan(60);

		// Stood back up and ridden away
		vehicle.setState({ position: { x: 0, y: 20, z: 20000 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, upright: true });
		expect(vehicle.upright()).toBe(true);
		run(physics, 3);
		expect(vehicle.tilt()).toBeLessThan(10);
		run(physics, 2, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.speedKmh()).toBeGreaterThan(20);
		expect(vehicle.tilt()).toBeLessThan(25);
	});

	it("pulls wheelies leaning back on the throttle, and stoppies leaning forward on the brake", () => {
		const ride = (z: number, kmh: number, input: { forward?: number; brake?: number; pitch?: number }, seconds: number) => {
			const { vehicle } = addVehicle({ type: "motorcycle" }, 0, z);
			run(physics, 1);
			if (kmh) speedUp(vehicle, kmh);
			let frontUp = 0, rearUp = 0, most = 0;
			run(physics, seconds, () => {
				vehicle.drive(input);
				if (!vehicle.wheel(0).contact && vehicle.wheel(1).contact) frontUp += 1 / 60;
				if (!vehicle.wheel(1).contact && vehicle.wheel(0).contact) rearUp += 1 / 60;
				most = Math.max(most, vehicle.tilt());
			});
			expect(vehicle.upsideDown()).toBe(false);
			return { frontUp, rearUp, most };
		};
		const plain = ride(-30000, 15, { forward: 1 }, 1.5);
		const wheelie = ride(-34000, 15, { forward: 1, pitch: -1 }, 1.5);
		expect(wheelie.frontUp).toBeGreaterThan(0.3);
		expect(wheelie.frontUp).toBeGreaterThan(plain.frontUp + 0.2);
		expect(wheelie.most).toBeGreaterThan(15);

		const braking = ride(-38000, 50, { brake: 1 }, 1);
		const stoppie = ride(-42000, 50, { brake: 1, pitch: 1 }, 1);
		expect(stoppie.rearUp).toBeGreaterThan(0.2);
		expect(stoppie.rearUp).toBeGreaterThan(braking.rearUp + 0.1);

		// Leaning back while stopped doesn't tip it over
		const standing = ride(-46000, 0, { pitch: -1 }, 2);
		expect(standing.most).toBeLessThan(40);
	});
});
