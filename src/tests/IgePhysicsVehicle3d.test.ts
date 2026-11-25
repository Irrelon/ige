/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsImpact } from "@/engine/physics/IgePhysics3dTypes";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type {
	IgePhysicsVehicle3dApi,
	IgePhysicsVehicleInput,
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
		// Not just before a gear change: traction control's hold on the throttle isn't in the state, so a copy can change
		// up a few steps early and fall behind (at 3 s, 4,650 rpm in first)
		run(physics, 2.5, () => vehicle.drive({ forward: 1, right: 0.3 }));
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


/*
 * Kerbs and jumps: a vehicle should sit on its wheels, not bounce about
 * between them. A kerb is a static block 15 cm high.
 */
describe.each(physicsTestBackends())("IgePhysics3d vehicles on kerbs and landing jumps on $name", (backend) => {
	let physics: IgePhysics3d;
	const KERB = 15;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
		addFloor(physics, 200000);
	});

	afterEach(() => physics.destroy());

	/** A static block on the floor, height tall, over x0..x1 and z0..z1: a kerb or a raised pavement. */
	function addBlock (x0: number, x1: number, z0: number, z1: number, height: number) {
		const block = new IgeEntity();
		block.translateTo((x0 + x1) / 2, height / 2, (z0 + z1) / 2);
		physics.addBody(block, { type: "static", shape: { type: "box", halfExtents: { x: (x1 - x0) / 2, y: height / 2, z: (z1 - z0) / 2 } } });
	}

	/** A vehicle at x, y, z, turned yaw degrees left of +Z. */
	function addVehicle (options: IgePhysicsVehicleOptions, x: number, y: number, z: number, yaw: number = 0) {
		const vehicle = physics.addVehicle(new IgeEntity().translateTo(x, y, z), options);
		const half = (yaw * Math.PI) / 360;
		vehicle.setState({ ...vehicle.getState(), position: { x, y, z }, rotation: { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) } });
		return vehicle;
	}

	/** Throttle and brakes holding a speed in km/h. */
	function cruise (vehicle: IgePhysicsVehicle3dApi, kmh: number) {
		return () => {
			const speed = vehicle.speedKmh();
			return { forward: Math.max(0, Math.min(1, (kmh - speed) * 0.3)), brake: Math.max(0, Math.min(1, (speed - kmh - 2) * 0.2)) };
		};
	}

	/** Step until a condition holds (30 seconds at most). */
	function until (vehicle: IgePhysicsVehicle3dApi, condition: () => boolean, input: () => Partial<IgePhysicsVehicleInput> = () => ({})) {
		for (let time = 0; !condition() && time < 30; time += 1 / 60) {
			vehicle.drive(input());
			physics.update(1 / 60);
		}
		expect(condition()).toBe(true);
	}

	/**
	 * Step a vehicle for some seconds, noting how many times each wheel
	 * lifts off, when (seconds from the start) every wheel was first on the
	 * floor (not on a kerb), and when the body was last moving up or down
	 * at over 0.1 m/s, or pitching or rolling at over 0.1 radians a second.
	 */
	function watch (vehicle: IgePhysicsVehicle3dApi, seconds: number, input: () => Partial<IgePhysicsVehicleInput> = () => ({})) {
		const n = vehicle.wheelCount();
		const touching = Array.from({ length: n }, (_, i) => vehicle.wheel(i).contact);
		const result = { liftOffs: touching.map(() => 0), touchDowns: touching.map(() => 0), down: -1, unsettled: -1 };
		for (let step = 1; step <= Math.round(seconds * 60); step++) {
			vehicle.drive(input());
			physics.update(1 / 60);
			const time = step / 60;
			let down = true;
			for (let i = 0; i < n; i++) {
				const wheel = vehicle.wheel(i);
				if (wheel.contact !== touching[i]) {
					if (wheel.contact) result.touchDowns[i]++;
					else result.liftOffs[i]++;
					touching[i] = wheel.contact;
				}
				if (!wheel.contact || wheel.point.y > KERB / 3) down = false;
			}
			if (down && result.down < 0) result.down = time;
			const v = vehicle.velocity(), w = vehicle.angularVelocity();
			if (Math.abs(v.y) > 0.1 * U || Math.hypot(w.x, w.z) > 0.1) result.unsettled = time;
		}
		return result;
	}

	for (const type of ["car", "motorcycle"] as const) {
		it(`keeps every wheel on flat ground at rest: ${type}`, () => {
			const vehicle = addVehicle({ type }, 0, 20, 0);
			run(physics, 1.5);
			const rest = watch(vehicle, 3);
			expect(rest.liftOffs).toEqual(rest.liftOffs.map(() => 0));
			for (let i = 0; i < vehicle.wheelCount(); i++) expect(vehicle.wheel(i).contact).toBe(true);
			expect(rest.unsettled).toBe(-1);
		});
	}

	it("sits still with one side up a kerb, and drives along it", () => {
		// The left wheels (+X) on a raised pavement, the right ones in the road
		addBlock(50, 5000, -20000, 20000, KERB);
		const vehicle = addVehicle({}, 0, 20 + KERB, -10000);
		run(physics, 2);
		const parked = watch(vehicle, 3);
		expect(parked.liftOffs).toEqual([0, 0, 0, 0]);
		expect(parked.unsettled).toBe(-1);
		expect(vehicle.tilt()).toBeGreaterThan(3);
		expect(vehicle.tilt()).toBeLessThan(8);

		until(vehicle, () => vehicle.speedKmh() > 29, cruise(vehicle, 30));
		const driving = watch(vehicle, 3, cruise(vehicle, 30));
		expect(driving.liftOffs).toEqual([0, 0, 0, 0]);
		expect(vehicle.tilt()).toBeLessThan(8);
	});

	for (const [type, kmh] of [["car", 10], ["car", 30], ["car", 60], ["motorcycle", 30]] as const) {
		it(`drops off a kerb at ${kmh} km/h with one bounce, settled within half a second: ${type}`, () => {
			addBlock(-2000, 2000, -10000, 0, KERB);
			const vehicle = addVehicle({ type }, 0, 20 + KERB, -(1500 + kmh * 100));
			until(vehicle, () => vehicle.getState().position.z > -300, cruise(vehicle, kmh));
			const drop = watch(vehicle, 4, cruise(vehicle, kmh));
			// Each wheel leaves the edge at most once (slowly, it rolls down it), and lands once
			for (const lifts of drop.liftOffs) expect(lifts).toBeLessThanOrEqual(1);
			expect(drop.down).toBeGreaterThan(0);
			expect(drop.unsettled - drop.down).toBeLessThan(0.5);
			// (A motorcycle stands pitched a couple of degrees: its springs sag by different amounts)
			expect(vehicle.tilt()).toBeLessThan(type === "car" ? 1 : 5);
		});
	}

	for (const kmh of [10, 30]) {
		it(`drives off a kerb at an angle at ${kmh} km/h, a wheel at a time, without rocking`, () => {
			// Heading 30 degrees left of +Z, so the front left wheel goes over the edge first and the back right last
			addBlock(-20000, 20000, -20000, 0, KERB);
			const vehicle = addVehicle({}, -1000, 20 + KERB, -1732, 30);
			until(vehicle, () => vehicle.getState().position.z > -400, cruise(vehicle, kmh));
			const drop = watch(vehicle, 5, cruise(vehicle, kmh));
			for (const lifts of drop.liftOffs) expect(lifts).toBeLessThanOrEqual(1);
			expect(drop.down).toBeGreaterThan(0);
			// It pitches and rolls as the last wheel drops, so a little longer than straight off
			expect(drop.unsettled - drop.down).toBeLessThan(0.6);
			expect(vehicle.tilt()).toBeLessThan(1);
		});
	}

	for (const type of ["car", "motorcycle"] as const) {
		it(`lands from a jump without bouncing back off its wheels: ${type}`, () => {
			const vehicle = addVehicle({ type }, 0, 20, 0);
			run(physics, 1);
			// 1.5 m up at 50 km/h, its wheels turning at that speed
			const speed = (50 / 3.6) * U;
			const state = vehicle.getState();
			vehicle.setState({
				...state,
				position: { ...state.position, y: 150 },
				velocity: { x: 0, y: 0, z: speed },
				wheelSpin: state.wheelSpin!.map(() => speed / (type === "car" ? 34 : 31))
			});
			until(vehicle, () => !vehicle.grounded());
			const landing = watch(vehicle, 3);
			for (const lifts of landing.liftOffs) expect(lifts).toBe(0);
			expect(landing.down).toBeGreaterThan(0);
			expect(landing.unsettled - landing.down).toBeLessThan(0.5);
			expect(Math.abs(vehicle.velocity().y)).toBeLessThan(0.05 * U);
			expect(vehicle.upsideDown()).toBe(false);
			expect(vehicle.tilt()).toBeLessThan(type === "car" ? 1 : 10);
		});
	}
});


/*
 * Kerbs met head-on and at an angle, wheel guards, combined grip, the
 * clutch, changing options after a vehicle is made, and the arcade assists.
 */
describe.each(physicsTestBackends())("IgePhysics3d vehicles up kerbs, guards, grip, clutch, options and assists on $name", (backend) => {
	let physics: IgePhysics3d;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
		addFloor(physics, 200000);
	});

	afterEach(() => physics.destroy());

	/**
	 * A saloon whose body is narrower than its wheels and starts 26 cm off
	 * the ground, as a game's own models give: the wheels stick out past
	 * the body, which only the wheel guards cover.
	 */
	function saloon (extra: Partial<IgePhysicsVehicleOptions> = {}): IgePhysicsVehicleOptions {
		const mass = 1400, share = mass / 4, k = share * (2 * Math.PI * 1.6) ** 2, r = 0.33;
		const rest = 0.3 - (share * 9.81) / k;
		return {
			mass, grip: 1.25, engine: { maxTorque: 360 }, antiRoll: 15000,
			chassis: {
				type: "compound", children: [
					{ shape: { type: "box", halfExtents: { x: 0.75 * U, y: 0.17 * U, z: 2.3 * U } }, position: { x: 0, y: 0.43 * U, z: 0 } },
					{ shape: { type: "box", halfExtents: { x: 0.65 * U, y: 0.3 * U, z: 1.1 * U } }, position: { x: 0, y: 0.9 * U, z: -0.2 * U } }
				]
			},
			wheels: [[0.78, 1.4], [-0.78, 1.4], [0.78, -1.35], [-0.78, -1.35]].map(([x, z], i) => ({
				position: { x: x * U, y: (r + rest) * U, z: z * U }, radius: r * U, width: 0.24 * U,
				suspensionStiffness: k, steer: i < 2 ? 34 : 0
			})),
			...extra
		};
	}

	/** A raised slab from z = 0 on, `height` tall: a box, or a road tile's kind of kerb (a triangle mesh: a top and a face). */
	function addKerb (height: number, mesh: boolean) {
		const entity = new IgeEntity();
		if (!mesh) {
			entity.translateTo(0, height / 2, 10000);
			physics.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: 20000, y: height / 2, z: 10000 } } });
			return;
		}
		const x0 = -20000, x1 = 20000, z0 = 0, z1 = 20000, h = height;
		const vertices = new Float32Array([x0, 0, z0, x1, 0, z0, x1, h, z0, x0, h, z0, x0, 0, z1, x1, 0, z1, x1, h, z1, x0, h, z1]);
		// The top facing up, the face towards -z
		const indices = new Uint32Array([3, 6, 2, 3, 7, 6, 0, 2, 1, 0, 3, 2]);
		physics.addBody(entity, { type: "static", shape: { type: "mesh", geometry: { id: `kerb${height}`, vertices, indices } as IgeGeometryData3d } });
	}

	/**
	 * Drive at a kerb at a speed, heading `yaw` degrees off square, and coast
	 * up it from just before it: the speed before, and after every wheel is
	 * up and half a second more (or how far it got).
	 */
	function strike (options: IgePhysicsVehicleOptions, kmh: number, yaw: number, height: number, mesh: boolean) {
		addKerb(height, mesh);
		const a = (yaw * Math.PI) / 180, back = 1500 + kmh * 120;
		const x = -Math.sin(a) * back, z = -Math.cos(a) * back;
		const vehicle = physics.addVehicle(new IgeEntity().translateTo(x, 20, z), options);
		vehicle.setState({ ...vehicle.getState(), position: { x, y: 20, z }, rotation: { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) } });
		let before = 0, up = -1, time = 0;
		for (; time < 30; time += 1 / 60) {
			const s = vehicle.speedKmh(), front = vehicle.getState().position.z + Math.cos(a) * 250;
			const coasting = front > -150;
			vehicle.drive(coasting ? {} : { forward: Math.max(0, Math.min(1, (kmh - s) * 0.3)), brake: Math.max(0, Math.min(1, (s - kmh - 2) * 0.2)) });
			physics.update(1 / 60);
			if (!coasting) {
				before = vehicle.speedKmh();
				continue;
			}
			let onTop = 0;
			for (let i = 0; i < vehicle.wheelCount(); i++) if (vehicle.wheel(i).contact && vehicle.wheel(i).point.y > height * 0.6) onTop++;
			if (onTop === vehicle.wheelCount() && up < 0) up = time;
			if ((up >= 0 && time > up + 0.5) || vehicle.speedKmh() < 0.5) break;
		}
		return { before, after: vehicle.speedKmh(), mounted: up >= 0, vehicle };
	}

	// Coasting on the flat over the same distance keeps 87 to 93% (engine braking); a kerb used to stop cars dead
	for (const [mesh, height] of [[false, 15], [true, 20]] as const) {
		for (const kmh of [10, 30, 60]) {
			for (const yaw of [0, 30]) {
				for (const [name, options] of [["the default car", {}], ["a saloon with its wheels outside its body", saloon()]] as const) {
					it(`${name} drives up a ${height} cm ${mesh ? "tile" : "box"} kerb at ${kmh} km/h ${yaw ? "at 30 degrees" : "head-on"}, keeping most of its speed`, () => {
						const result = strike(options, kmh, yaw, height, mesh);
						expect(result.mounted).toBe(true);
						expect(result.after / result.before).toBeGreaterThan(0.8);
						expect(result.vehicle.tilt()).toBeLessThan(8);
					});
				}
			}
		}
	}

	it("keeps its wheels out of a low wall side-on and a motorcycle's front wheel out of a wall, with its wheel guards", () => {
		const wall = (x: number, y: number, z: number, hx: number, hy: number, hz: number) => {
			const entity = new IgeEntity().translateTo(x, y, z);
			physics.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: hx, y: hy, z: hz } } });
		};
		// A 40 cm wall along the saloon's right side, its face at x = -300; the wheels' outer faces are 12 cm outside its body
		const side = (guards: boolean, z: number) => {
			wall(-325, 20, z, 25, 20, 600);
			const vehicle = physics.addVehicle(new IgeEntity().translateTo(-100, 20, z), saloon({ wheelGuards: guards }));
			run(physics, 1);
			vehicle.setState({ ...vehicle.getState(), velocity: { x: -6 * U, y: 0, z: 0 } });
			let deepest = Infinity;
			run(physics, 1.5, () => {
				const state = vehicle.getState();
				for (const wz of [140, -135]) deepest = Math.min(deepest, state.position.x + rotate({ x: -78 - 12, y: 30, z: wz }, state.rotation).x);
			});
			return deepest;
		};
		expect(side(true, 4000)).toBeGreaterThan(-300 - 2);
		expect(side(false, 8000)).toBeLessThan(-300 - 5);

		// A motorcycle ridden into a wall at 20 km/h: the front of its front wheel (1.06 m ahead of its origin) stays out
		const nose = (guards: boolean, x: number) => {
			wall(x, 100, 12000, 300, 100, 25); // its face at z = 11975
			const bike = physics.addVehicle(new IgeEntity().translateTo(x, 20, 11300), { type: "motorcycle", wheelGuards: guards });
			run(physics, 1);
			const speed = (20 / 3.6) * U;
			bike.setState({ ...bike.getState(), velocity: { x: 0, y: 0, z: speed }, wheelSpin: [speed / 31, speed / 31] });
			let furthest = -Infinity;
			run(physics, 2.5, () => {
				bike.drive({ forward: 0.6 });
				const state = bike.getState();
				furthest = Math.max(furthest, state.position.z + rotate({ x: 0, y: 70, z: 106 }, state.rotation).z);
			});
			return furthest;
		};
		const guarded = nose(true, 0);
		expect(guarded).toBeLessThan(11975 + 2);
		expect(guarded).toBeGreaterThan(11975 - 30);
	});

	it("loses sideways grip to wheelspin with combined grip: a powerful car does doughnuts, one with traction control doesn't", () => {
		// Full lock and full throttle from rest for five seconds; the slip angle is how far the car points from where it goes
		const doughnut = (options: IgePhysicsVehicleOptions, x: number) => {
			const vehicle = physics.addVehicle(new IgeEntity().translateTo(x, 20, 0), options);
			run(physics, 1);
			let slip = 0, samples = 0, turned = 0, last = heading(vehicle);
			run(physics, 5, (time) => {
				vehicle.drive({ forward: 1, right: 1 });
				const now = heading(vehicle);
				turned += Math.abs(((now - last + 540) % 360) - 180);
				last = now;
				// At the rear axle, which a car turning without sliding drives straight along
				const v = vehicle.velocity(), w = vehicle.angularVelocity().y;
				const arm = rotate({ x: 0, y: 0, z: -135 }, vehicle.getState().rotation);
				const vx = v.x + w * arm.z, vz = v.z - w * arm.x;
				if (time > 2 && Math.hypot(vx, vz) > 100) {
					const moving = (Math.atan2(vx, vz) * 180) / Math.PI;
					slip += Math.abs(((moving - now + 540) % 360) - 180);
					samples++;
				}
			});
			return { slip: slip / samples, turned };
		};
		const powerful = (combinedGrip: number) => saloon({ engine: { maxTorque: 560 }, grip: 1.45, tractionControl: false, combinedGrip });
		const loose = doughnut(powerful(1), 0);
		const apart = doughnut(powerful(0), 4000);
		const tidy = doughnut(saloon({ combinedGrip: 1 }), 8000);
		expect(loose.slip).toBeGreaterThan(12);
		expect(apart.slip).toBeLessThan(6);
		expect(loose.turned).toBeGreaterThan(apart.turned + 60);
		expect(tidy.slip).toBeLessThan(10);
	});

	it("pulls a heavy vehicle away in first with a clutch as strong as its engine", () => {
		// 11 tonnes and 1,250 N·m at 2,800 rpm: with a clutch of fixed strength (10, as every vehicle had) it slipped, the
		// revs ran up and the box changed up at walking pace
		const bus = (clutchStrength: number | undefined, x: number) => {
			const vehicle = physics.addVehicle(new IgeEntity().translateTo(x, 20, -20000), {
				mass: 11000, chassis: { type: "box", halfExtents: { x: 125, y: 150, z: 550 } }, chassisOffset: { x: 0, y: 200, z: 0 },
				engine: { maxTorque: 1250, maxRpm: 2800, minRpm: 700 }, antiRoll: 40000,
				gearbox: { ratios: [4.5, 2.8, 1.8, 1.25, 0.8], finalDrive: 6, shiftUpRpm: 2400, shiftDownRpm: 1200, clutchStrength },
				wheels: [380, -280, -400].flatMap((z, i) => [105, -105].map((side) => ({ position: { x: side, y: 75, z }, radius: 50, width: 30, steer: i === 0 ? 35 : 0 })))
			});
			run(physics, 1);
			let shiftedAt = -1;
			run(physics, 12, () => {
				vehicle.drive({ forward: 1 });
				if (shiftedAt < 0 && vehicle.gear() > 1) shiftedAt = vehicle.speedKmh();
			});
			return shiftedAt;
		};
		const fixed = bus(10, 0);
		const scaled = bus(undefined, 3000);
		// First gear tops out at 16.8 km/h at the shift point; a slipping clutch changes up before the wheels get there
		expect(scaled).toBeGreaterThan(16);
		expect(fixed).toBeGreaterThan(0);
		expect(fixed).toBeLessThan(scaled - 2);
	});

	it("changes options while driving, carrying on at the same speed, in place or made again", () => {
		const make = (x: number) => physics.addVehicle(new IgeEntity().translateTo(x, 20, -40000), {});
		const tuned = make(0), plain = make(3000);
		run(physics, 1);
		run(physics, 4, () => {
			tuned.drive({ forward: 1 });
			plain.drive({ forward: 1 });
		});
		const speed = tuned.speedKmh(), gear = tuned.gear();
		expect(speed).toBeGreaterThan(40);

		// In place: more power, less weight, stiffer springs
		tuned.setOptions({ mass: 1000, engine: { maxTorque: 900 }, antiRoll: 20000 });
		expect(tuned.speedKmh()).toBeCloseTo(speed, 0);
		expect(tuned.gear()).toBe(gear);
		expect(tuned.options().engine?.maxTorque).toBe(900);
		expect(tuned.options().mass).toBe(1000);
		const before = { tuned: tuned.speedKmh(), plain: plain.speedKmh() };
		run(physics, 2, () => {
			tuned.drive({ forward: 1 });
			plain.drive({ forward: 1 });
		});
		expect(tuned.speedKmh() - before.tuned).toBeGreaterThan((plain.speedKmh() - before.plain) * 1.3);
		for (let i = 0; i < 4; i++) expect(tuned.wheel(i).contact).toBe(true);

		// Made again: bigger wheels. Still the same vehicle, still moving, still found by raycasts
		const moving = tuned.speedKmh();
		tuned.setOptions({ wheels: [[78, 135], [-78, 135], [78, -130], [-78, -130]].map(([x, z], i) => ({ position: { x, y: 58, z }, radius: 38, steer: i < 2 ? 32 : 0 })) });
		expect(tuned.speedKmh()).toBeCloseTo(moving, 0);
		run(physics, 1, () => tuned.drive({ forward: 1 }));
		expect(tuned.speedKmh()).toBeGreaterThan(moving);
		expect(tuned.upsideDown()).toBe(false);
		const p = tuned.getState().position;
		const hit = physics.raycast({ x: p.x, y: 1000, z: p.z }, { x: 0, y: -1, z: 0 }, 2000);
		expect(hit?.entity).toBe(tuned.entity);
		expect(physics.vehicleOf(tuned.entity)).toBe(tuned);
		expect(() => tuned.setOptions({ type: "motorcycle" })).toThrow();
	});

	/** No arcade assists: a simulation's handling (and the steering lock narrowing only by highSpeedLock). */
	const SIM: Partial<IgePhysicsVehicleOptions> = { yawAssist: { strength: 0 }, stabilityAssist: { strength: 0 }, steering: { slip: Infinity } };

	/** A vehicle brought up to a speed on full throttle (so it's in its gear), somewhere of its own. */
	function atSpeed (options: IgePhysicsVehicleOptions, kmh: number, x: number) {
		const vehicle = physics.addVehicle(new IgeEntity().translateTo(x, 20, -150000), options);
		run(physics, 0.5);
		for (let t = 0; t < 40 && vehicle.speedKmh() < kmh; t += 1 / 60) run(physics, 1 / 60, () => vehicle.drive({ forward: 1 }));
		expect(vehicle.speedKmh()).toBeGreaterThanOrEqual(kmh);
		return vehicle;
	}

	/**
	 * Drive for some seconds with steering from the time (throttle holding the speed it started at): the most its rear
	 * axle slid (degrees: how far its velocity there points from its heading; 1.35 m behind the saloon's centre of
	 * mass), and its mean rate of turn (degrees a second, right positive) from 0.6 to 1.6 s.
	 */
	function manoeuvre (vehicle: IgePhysicsVehicle3dApi, seconds: number, right: (time: number) => number) {
		const kmh = vehicle.speedKmh();
		let slide = 0, turn = 0, samples = 0;
		const rates: number[] = [];
		run(physics, seconds, (time) => {
			const s = vehicle.speedKmh();
			vehicle.drive({ forward: Math.max(0, Math.min(1, 0.3 + (kmh - s) * 0.15)), right: right(time) });
			const state = vehicle.getState();
			const f = rotate({ x: 0, y: 0, z: 1 }, state.rotation), left = rotate({ x: 1, y: 0, z: 0 }, state.rotation);
			const v = vehicle.velocity(), w = vehicle.angularVelocity().y;
			const along = v.x * f.x + v.z * f.z, across = v.x * left.x + v.z * left.z - w * 137.5;
			slide = Math.max(slide, (Math.abs(Math.atan2(across, Math.max(1, along))) * 180) / Math.PI);
			rates.push((-w * 180) / Math.PI);
			if (time > 0.6 && time < 1.6) {
				turn += (-w * 180) / Math.PI;
				samples++;
			}
		});
		turn /= Math.max(1, samples);
		// Seconds until it first turns at 90% of that
		const reached = rates.findIndex((rate) => rate >= turn * 0.9);
		return { slide, turn, response: reached < 0 ? Infinity : (reached + 1) / 60 };
	}

	it("keeps a tail-happy car from spinning at full stick and in a lane change at speed, which spin it without the assists", () => {
		// Less grip at the back than the front: it oversteers, and without the assists a full stick, a lane change or a
		// quarter-second tap at 120 km/h spins it round
		const tailHappy = (extra: Partial<IgePhysicsVehicleOptions> = {}) => {
			const options = saloon(extra);
			options.wheels = options.wheels!.map((wheel, i) => ({ ...wheel, grip: i < 2 ? 1.3 : 1.05 }));
			return options;
		};
		const fullStick = () => 1, laneChange = (t: number) => (t < 0.5 ? 1 : t < 1 ? -1 : 0), tap = (t: number) => (t < 0.25 ? 1 : 0);
		let x = -100000;
		for (const right of [fullStick, laneChange, tap]) {
			const assisted = atSpeed(tailHappy(), 120, x += 5000);
			const held = manoeuvre(assisted, 3, right);
			expect(held.slide).toBeLessThan(6);
			expect(assisted.speedKmh()).toBeGreaterThan(90);
			expect(assisted.upsideDown()).toBe(false);

			const sim = atSpeed(tailHappy(SIM), 120, x += 5000);
			expect(manoeuvre(sim, 3, right).slide).toBeGreaterThan(45);
		}
	});

	it("turns at 120 km/h as hard as highSpeedG asks, quickly and in proportion to the stick, as before when slow, and settles at once", () => {
		// The default car at speed: 3 g (highSpeedG), a rate of turn of 3 g / 33 m/s = 51 degrees a second, a 38 m radius
		const full = manoeuvre(atSpeed({}, 120, -60000), 2, () => 1);
		const asked = ((3 * 9.81) / (120 / 3.6)) * (180 / Math.PI);
		expect(full.turn).toBeGreaterThan(asked * 0.85);
		expect(full.turn).toBeLessThan(asked * 1.25);
		expect(full.slide).toBeLessThan(8);
		expect(full.response).toBeLessThan(0.2);
		const half = manoeuvre(atSpeed({}, 120, -50000), 2, () => 0.5);
		expect(half.turn).toBeGreaterThan(full.turn * 0.35);
		expect(half.turn).toBeLessThan(full.turn * 0.7);

		// A gentler turn at speed asked for turns less
		const gentle = manoeuvre(atSpeed({ yawAssist: { highSpeedG: 1.5 } }, 120, -40000), 2, () => 1);
		expect(gentle.turn).toBeGreaterThan(full.turn * 0.4);
		expect(gentle.turn).toBeLessThan(full.turn * 0.7);

		// Below 60 km/h the high-speed turn changes nothing
		const slow = manoeuvre(atSpeed({}, 40, -35000), 2, () => 1);
		const slowGentle = manoeuvre(atSpeed({ yawAssist: { highSpeedG: 1.2, highSpeedRate: 4 } }, 40, -32000), 2, () => 1);
		expect(slow.turn).toBeCloseTo(slowGentle.turn, 0);

		// Half a second each way, then let go: its rate of turn is under 3 degrees a second within half a second
		const lane = atSpeed({}, 110, -30000);
		manoeuvre(lane, 1, (t) => (t < 0.5 ? 1 : -1));
		let settled = -1;
		run(physics, 1.5, (time) => {
			lane.drive({ forward: 0.4 });
			const calm = Math.abs(lane.angularVelocity().y) < (3 * Math.PI) / 180;
			if (calm && settled < 0) settled = time;
			if (!calm) settled = -1;
		});
		expect(settled).toBeGreaterThanOrEqual(0);
		expect(settled).toBeLessThan(0.5);
	});

	it("grips harder at speed with highSpeedGrip: on its line rather than drifting, the handbrake still swinging it, as before when slow", () => {
		// A hard turn at 120 km/h (4 g): the assists alone drift the car round it; with three times the grip at speed its
		// tyres hold it
		const drift = manoeuvre(atSpeed({ yawAssist: { highSpeedG: 4 } }, 120, -60000), 2, () => 1);
		const planted = manoeuvre(atSpeed({ yawAssist: { highSpeedG: 4, highSpeedGrip: 3 } }, 120, -55000), 2, () => 1);
		expect(drift.slide).toBeGreaterThan(4);
		expect(planted.slide).toBeLessThan(drift.slide * 0.6);
		expect(planted.turn).toBeGreaterThan(drift.turn * 0.9);

		// The handbrake's wheels don't get it: a handbrake turn at 100 km/h still swings round
		const vehicle = atSpeed({ yawAssist: { highSpeedG: 4, highSpeedGrip: 3 } }, 100, -50000);
		const before = heading(vehicle);
		run(physics, 0.8, () => vehicle.drive({ right: 1, handbrake: 1 }));
		expect(Math.abs(heading(vehicle) - before)).toBeGreaterThan(60);

		// Below 60 km/h it changes nothing
		const slow = manoeuvre(atSpeed({}, 40, -45000), 2, () => 1);
		const slowGrippy = manoeuvre(atSpeed({ yawAssist: { highSpeedGrip: 3 } }, 40, -40000), 2, () => 1);
		expect(slowGrippy.turn).toBeCloseTo(slow.turn, 1);
		expect(slowGrippy.slide).toBeCloseTo(slow.slide, 1);
	});

	it("keeps a tall van on its wheels at full lock with anti-rollover, which rolls over without it", () => {
		// 3 tonnes, its centre of mass 1.1 m up over a 1.7 m track: it can't corner at its tyres' 1.2 g without tipping
		const van = (extra: Partial<IgePhysicsVehicleOptions>): IgePhysicsVehicleOptions => ({
			mass: 3000, chassis: { type: "box", halfExtents: { x: 95, y: 110, z: 260 } }, chassisOffset: { x: 0, y: 150, z: 0 },
			centreOfMass: { x: 0, y: 110, z: 0 }, antiRoll: 20000,
			wheels: [170, -170].flatMap((z, i) => [85, -85].map((x) => ({ position: { x, y: 55, z }, radius: 36, steer: i === 0 ? 36 : 0 }))),
			...extra
		});
		const tilt = (options: IgePhysicsVehicleOptions, x: number) => {
			const vehicle = atSpeed(options, 50, x);
			let most = 0;
			manoeuvre(vehicle, 3, () => 1);
			run(physics, 0.5, () => {
				vehicle.drive({ forward: 0.3, right: 1 });
				most = Math.max(most, vehicle.tilt());
			});
			return { most, turning: Math.abs(vehicle.angularVelocity().y) };
		};
		const kept = tilt(van({}), -60000);
		expect(kept.most).toBeLessThan(8);
		expect(kept.turning).toBeGreaterThan(0.5);
		expect(tilt(van({ antiRollover: 0 }), -50000).most).toBeGreaterThan(60);
	});

	it("still slides when asked: handbrake turns swing round as far as without the assists, and powerful cars do doughnuts", () => {
		// From 60 km/h, full stick and the handbrake for 0.8 s
		const swing = (options: IgePhysicsVehicleOptions, x: number) => {
			const vehicle = atSpeed(options, 60, x);
			const before = heading(vehicle);
			run(physics, 0.8, () => vehicle.drive({ right: 1, handbrake: 1 }));
			return Math.abs(heading(vehicle) - before);
		};
		const assisted = swing(saloon(), -20000);
		expect(assisted).toBeGreaterThan(60);
		expect(assisted).toBeGreaterThan(swing(saloon(SIM), -10000) * 0.9);

		// Full lock and full throttle from rest without traction control: the tail stays out (the stability eases off
		// for wheelspin at low speed)
		const vehicle = physics.addVehicle(new IgeEntity().translateTo(0, 20, -150000), saloon({ engine: { maxTorque: 560 }, grip: 1.45, tractionControl: false }));
		run(physics, 1);
		let slide = 0, samples = 0;
		run(physics, 5, (time) => {
			vehicle.drive({ forward: 1, right: 1 });
			const state = vehicle.getState();
			const f = rotate({ x: 0, y: 0, z: 1 }, state.rotation), left = rotate({ x: 1, y: 0, z: 0 }, state.rotation);
			const v = vehicle.velocity(), w = vehicle.angularVelocity().y;
			const along = v.x * f.x + v.z * f.z, across = v.x * left.x + v.z * left.z - w * 137.5;
			if (time > 2 && Math.hypot(along, across) > 100) {
				slide += (Math.abs(Math.atan2(across, along)) * 180) / Math.PI;
				samples++;
			}
		});
		expect(slide / samples).toBeGreaterThan(12);
	});

	it("changes the assists while driving, and keeps them off motorcycles", () => {
		const car = physics.addVehicle(new IgeEntity().translateTo(0, 20, -150000), {});
		car.setOptions({ yawAssist: { lateralG: 1.5 } });
		car.setOptions({ stabilityAssist: { strength: 0.5 }, downforce: 0.3 });
		expect(car.options().yawAssist).toEqual({ lateralG: 1.5 });
		expect(car.options().stabilityAssist).toEqual({ strength: 0.5 });
		expect(car.options().downforce).toBe(0.3);
		car.setOptions({ yawAssist: { strength: 0 } });
		expect(car.options().yawAssist).toEqual({ lateralG: 1.5, strength: 0 });

		// A motorcycle leans into its turns: no assists unless asked for, and they don't change how it turns
		const bike = (options: IgePhysicsVehicleOptions, x: number) => {
			const vehicle = atSpeed({ type: "motorcycle", ...options }, 50, x);
			const before = heading(vehicle);
			run(physics, 1.5, () => vehicle.drive({ forward: 0.5, right: 0.5 }));
			return heading(vehicle) - before;
		};
		expect(bike({}, 10000)).toBeCloseTo(bike({ yawAssist: { strength: 0 }, stabilityAssist: { strength: 0 } }, 20000), 1);
	});
});
