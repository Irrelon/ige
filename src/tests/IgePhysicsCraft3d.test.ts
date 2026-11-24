/**
 * @jest-environment <rootDir>/src/tests/support/jestNativeImportEnvironment.js
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsImpact } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgePhysicsAircraft3dApi,
	IgePhysicsAircraftOptions,
	IgePhysicsBoat3dApi,
	IgePhysicsBoatOptions,
	IgePhysicsCraftLanding,
	IgePhysicsCraftState
} from "@/engine/physics/IgePhysicsCraft3dApi";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeSkeletonData } from "@/types/IgeSkeletonData";
import { createTestPhysics, physicsTestBackends, run, stubWebGlEngine } from "./support/physics3dTestWorld";

/*
 * Boats, planes, helicopters and floating bodies, flown and driven
 * headlessly through the engine's public API only, once per physics
 * backend (physicsTestBackends()). Flight and buoyancy are engine-neutral
 * code over the backend's forces, so these check the backend's forces,
 * torques, inertia, raycasts and kinematic switching as much as the
 * handling. One IGE unit is a centimetre (unitsPerMetre 100).
 */

const U = 100;

beforeAll(() => stubWebGlEngine());

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const level = { x: 0, y: 0, z: 0, w: 1 };
const still = { x: 0, y: 0, z: 0 };

/** A rotation of `degrees` about an axis. */
function turn (axis: { x: number; y: number; z: number }, degrees: number) {
	const s = Math.sin((degrees * Math.PI) / 360);
	return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos((degrees * Math.PI) / 360) };
}

/** A skinned entity with a chain of five bones 30 units apart, standing up: enough for a ragdoll. */
function chain (x: number, y: number): IgeEntity {
	const bones = [0, 1, 2, 3, 4].map((index) => ({
		name: `b${index}`, index, parentIndex: index - 1, childIndices: index < 4 ? [index + 1] : [],
		localBindTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, index ? 30 : 0, 0, 1]),
		inverseBindMatrix: new Float32Array(16)
	}));
	const data = { id: `chain-${Math.random()}`, name: "chain", bones, rootBoneIndices: [0], boneCount: 5 } as IgeSkeletonData;
	const entity = new IgeEntity().skin({ id: "chainMesh" } as IgeGeometryData3d, data);
	entity.translateTo(x, y, 0);
	entity.updateTransform();
	return entity;
}

/** Fly towards a pitch (degrees, nose up) with the stick, as a pilot would. */
function holdPitch (plane: IgePhysicsAircraft3dApi, pitch: number, extra: Record<string, unknown> = {}) {
	plane.fly({ pitch: clamp(-(pitch - plane.attitude().pitch) * 0.15, -1, 1), ...extra });
}

/** A pilot holding height: the pitch it flies at follows the sinking or climbing. Call the result every step. */
function levelPilot (plane: IgePhysicsAircraft3dApi) {
	let trim = plane.attitude().pitch;
	return (extra: Record<string, unknown> = {}) => {
		const climbing = plane.verticalSpeed() / U;
		trim = clamp(trim - climbing * 0.5 / 60, -10, 40);
		holdPitch(plane, clamp(trim - climbing * 0.4, -12, 45), extra);
	};
}

describe.each(physicsTestBackends())("IgePhysics3d boats and aircraft on $name", (backend) => {
	let physics: IgePhysics3d;

	beforeEach(async () => {
		physics = await createTestPhysics({}, backend);
	});

	afterEach(() => physics.destroy());

	/** A sea 30 m deep, its surface at y = 0. */
	function sea (waves: { direction: number; length: number; amplitude: number }[] = []) {
		const bed = new IgeEntity().translateTo(0, -3050, 0);
		physics.addBody(bed, { type: "static", shape: { type: "box", halfExtents: { x: 500000, y: 50, z: 500000 } } });
		return physics.water({ level: 0, waves })!;
	}

	/** Dry land, its top at y = 0. */
	function land () {
		const ground = new IgeEntity().translateTo(0, -50, 0);
		physics.addBody(ground, { type: "static", shape: { type: "box", halfExtents: { x: 1000000, y: 50, z: 1000000 } } });
		return ground;
	}

	function addBoat (options: IgePhysicsBoatOptions = {}, x: number = 0, z: number = 0): { entity: IgeEntity; boat: IgePhysicsBoat3dApi } {
		const entity = new IgeEntity().translateTo(x, 0, z);
		return { entity, boat: physics.addBoat(entity, options) };
	}

	function addAircraft (options: IgePhysicsAircraftOptions = {}, x: number = 0, z: number = 0): { entity: IgeEntity; plane: IgePhysicsAircraft3dApi } {
		const entity = new IgeEntity().translateTo(x, 0, z);
		return { entity, plane: physics.addAircraft(entity, options) };
	}

	describe("boats", () => {
		it("float at rest as deep as their weight says, level", () => {
			sea();
			// A 6 x 2 x 1 m hull of 3 t, its centre of mass in the middle: it displaces 5.4 m³ fully under
			const { entity, boat } = addBoat({ hull: { length: 600, width: 200, height: 100 }, mass: 3000, centreOfMass: { x: 0, y: 30, z: 0 } });
			run(physics, 6);
			const share = 3000 / (1025 * 6 * 2 * 1 * 0.45);
			expect(boat.submerged()).toBeCloseTo(share, 1);
			expect(entity._translate.y).toBeGreaterThan(-share * 100 - 3);
			expect(entity._translate.y).toBeLessThan(-share * 100 + 3);
			expect(boat.tilt()).toBeLessThan(1);
			expect(Math.abs(boat.speed())).toBeLessThan(5);
			expect(boat.airborne()).toBe(false);
			expect(boat.kind).toBe("boat");

			// Every preset floats upright, the bigger ones deeper
			const depths = (["speedboat", "fishingBoat", "yacht", "cargoShip"] as const).map((preset, i) => {
				const made = addBoat({ preset }, 10000 + i * 30000, 0);
				run(physics, 4);
				expect(made.boat.tilt()).toBeLessThan(3);
				expect(made.boat.submerged()).toBeGreaterThan(0.1);
				expect(made.boat.submerged()).toBeLessThan(0.5);
				return -made.entity._translate.y;
			});
			for (let i = 1; i < depths.length; i++) expect(depths[i]).toBeGreaterThan(depths[i - 1]);
		});

		it("right themselves from a heavy tilt, and from upside down", () => {
			sea();
			const { boat } = addBoat({ preset: "speedboat" });
			run(physics, 2);
			boat.setState({ ...boat.getState(), rotation: turn({ x: 0, y: 0, z: 1 }, 60) });
			run(physics, 3);
			expect(boat.tilt()).toBeLessThan(10);

			boat.setState({ ...boat.getState(), rotation: turn({ x: 0, y: 0, z: 1 }, 180), velocity: still });
			expect(boat.tilt()).toBeGreaterThan(170);
			run(physics, 5);
			expect(boat.tilt()).toBeLessThan(15);
		});

		it("move with the throttle up to their top speed, turn with the rudder, and go astern", () => {
			sea();
			const { entity, boat } = addBoat({ preset: "speedboat" });
			run(physics, 2);
			let fastest = 0;
			run(physics, 15, () => {
				boat.drive({ throttle: 1 });
				fastest = Math.max(fastest, boat.speedKmh());
			});
			expect(boat.speedKmh()).toBeGreaterThan(85); // 28 m/s is about 100 km/h
			expect(fastest).toBeLessThan(105);
			expect(entity._translate.z).toBeGreaterThan(200 * U);
			expect(Math.abs(entity._translate.x)).toBeLessThan(5 * U);
			expect(boat.propellerInWater()).toBe(true);

			// Full right rudder: the heading swings right (towards -X) and it leans into the turn
			const before = boat.attitude().heading;
			let lean = 0;
			run(physics, 2, () => {
				boat.drive({ throttle: 1, steer: 1 });
				lean = Math.max(lean, boat.attitude().roll);
			});
			expect(boat.attitude().heading - before).toBeLessThan(-40);
			expect(lean).toBeGreaterThan(4);
			expect(boat.speedKmh()).toBeGreaterThan(50);
			expect(boat.tilt()).toBeLessThan(30);

			// Astern
			run(physics, 8, () => boat.drive({ throttle: -1 }));
			expect(boat.speedKmh()).toBeLessThan(-10);
			expect(boat.input()).toEqual({ throttle: -1, steer: 0 });
		});

		it("turn harder the faster they go", () => {
			sea();
			const turnRate = (throttle: number, z: number) => {
				const { boat } = addBoat({ preset: "fishingBoat" }, 0, z);
				run(physics, 10, () => boat.drive({ throttle }));
				const before = boat.attitude().heading;
				run(physics, 1, () => boat.drive({ throttle, steer: 1 }));
				return Math.abs(boat.attitude().heading - before);
			};
			const crawling = turnRate(0.15, 0), cruising = turnRate(1, 40000);
			expect(cruising).toBeGreaterThan(crawling * 1.5);
		});

		it("lift their bow and ride higher as they get onto the plane (speedboats)", () => {
			sea();
			const { boat } = addBoat({ preset: "speedboat" });
			run(physics, 3);
			const restPitch = boat.attitude().pitch, restShare = boat.submerged();
			let most = restPitch;
			run(physics, 4, () => {
				boat.drive({ throttle: 1 });
				most = Math.max(most, boat.attitude().pitch);
			});
			expect(most - restPitch).toBeGreaterThan(2);
			expect(most).toBeLessThan(15);
			run(physics, 8, () => boat.drive({ throttle: 1 }));
			expect(boat.submerged()).toBeLessThan(restShare * 0.8);
			expect(boat.attitude().pitch).toBeLessThan(most);
		});

		it("only push with the propeller in the water", () => {
			land();
			const { entity, boat } = addBoat({ preset: "speedboat" });
			run(physics, 1);
			run(physics, 3, () => boat.drive({ throttle: 1 }));
			expect(boat.propellerInWater()).toBe(false);
			expect(boat.submerged()).toBe(0);
			expect(Math.abs(entity._translate.z)).toBeLessThan(5);
		});

		it("ride the waves they're drawn on", () => {
			const water = sea([{ direction: 0, length: 3000, amplitude: 40 }]);
			const { entity, boat } = addBoat({ preset: "fishingBoat" });
			run(physics, 3);
			let lowest = Infinity, highest = -Infinity, error = 0;
			run(physics, 6, () => {
				lowest = Math.min(lowest, entity._translate.y);
				highest = Math.max(highest, entity._translate.y);
				error = Math.max(error, Math.abs(boat.getState().position.y + 55 - water.heightAt(entity._translate.x, entity._translate.z)));
			});
			expect(highest - lowest).toBeGreaterThan(30); // up and down most of 80 cm
			expect(error).toBeLessThan(40);
			expect(boat.tilt()).toBeLessThan(12);
		});
	});

	describe("floating bodies", () => {
		it("float or sink by their density", () => {
			sea();
			const crate = (density: number, x: number) => {
				const entity = new IgeEntity().translateTo(x, 100, 0);
				const body = physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density });
				return { entity, body, float: physics.addBuoyancy(body) };
			};
			const light = crate(300, 0), heavy = crate(2000, 500), nearly = crate(900, 1000);
			const ball = new IgeEntity().translateTo(1500, 100, 0);
			const ballBody = physics.addBody(ball, { shape: { type: "sphere", radius: 25 }, density: 500 });
			const ballFloat = physics.addBuoyancy(ballBody);
			expect(physics.stats().floating).toBe(4);
			run(physics, 10);

			// A crate of density 300 rides with about 29% of it under (its centre 12.4 cm above the water)
			expect(light.float.submerged()).toBeCloseTo(300 / 1025, 1);
			expect(light.entity._translate.y).toBeGreaterThan(6);
			expect(light.entity._translate.y).toBeLessThan(18);
			expect(light.float.inWater()).toBe(true);
			expect(nearly.float.submerged()).toBeGreaterThan(0.8);
			expect(nearly.entity._translate.y).toBeGreaterThan(-40);
			expect(ballFloat.submerged()).toBeGreaterThan(0.3);
			expect(ballFloat.submerged()).toBeLessThan(0.7);
			// The heavy one goes to the bottom
			expect(heavy.entity._translate.y).toBeLessThan(-2900);

			// Its own volume: as if it were full of air
			light.float.destroy();
			const buoy = physics.addBuoyancy(heavy.body, { volume: 0.216 * 3 });
			run(physics, 12);
			expect(heavy.entity._translate.y).toBeGreaterThan(-60);
			expect(buoy.inWater()).toBe(true);
		});

		it("float a person (a ragdoll) by its density", () => {
			sea();
			// Standing half in the water (dropped in, one only rises slowly: it's barely lighter than the sea)
			const person = physics.createRagdoll(chain(0, -60));
			const heavy = physics.createRagdoll(chain(1000, -60), { density: 1500 });
			const floating = physics.addBuoyancy(person);
			physics.addBuoyancy(heavy);
			expect(physics.stats().floating).toBe(person.getState().parts.length * 2);
			run(physics, 15);
			// Flesh is about as dense as water: afloat in the sea, mostly under
			expect(floating.inWater()).toBe(true);
			expect(floating.submerged()).toBeGreaterThan(0.75);
			expect(Math.max(...person.getState().parts.map((part) => part.position.y))).toBeGreaterThan(-40);
			expect(Math.max(...heavy.getState().parts.map((part) => part.position.y))).toBeLessThan(-2800);
			floating.destroy();
			heavy.destroy(); // its parts stop floating with it
			expect(physics.stats().floating).toBe(0);
			run(physics, 0.5);
		});

		it("drift with the current", () => {
			physics.water({ level: 0, current: { x: 100, z: 0 } });
			const entity = new IgeEntity().translateTo(0, 0, 0);
			const body = physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density: 400 });
			physics.addBuoyancy(body, { drag: { x: 2, y: 2, z: 2 } });
			run(physics, 6);
			expect(body.velocity().x).toBeGreaterThan(60);
			expect(entity._translate.x).toBeGreaterThan(200);
		});
	});

	describe("planes", () => {
		it("take off near their expected speed, climb, stall, recover and land (light plane)", () => {
			land();
			const { entity, plane } = addAircraft({ preset: "lightPlane", impacts: true });
			const impacts: IgePhysicsImpact[] = [], landings: IgePhysicsCraftLanding[] = [];
			plane.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });
			plane.on("landed", (landing: IgePhysicsCraftLanding) => { landings.push(landing); });
			expect(plane.type).toBe("plane");

			// On its wheels, origin on the ground
			run(physics, 2);
			expect(plane.grounded()).toBe(true);
			expect(plane.wheelCount()).toBe(3);
			for (let i = 0; i < 3; i++) expect(plane.wheel(i).contact).toBe(true);
			expect(Math.abs(entity._translate.y)).toBeLessThan(5);
			expect(plane.tilt()).toBeLessThan(2);
			expect(plane.gearDown()).toBe(true);

			// Full throttle; rotate at 28 m/s (the stall speed is 25 m/s)
			let liftoff = 0;
			for (let t = 0; t < 40 && !liftoff; t += 1 / 60) {
				run(physics, 1 / 60, () => {
					if (plane.airspeed() > 28 * U) holdPitch(plane, 10, { throttle: 1 });
					else plane.fly({ throttle: 1 });
				});
				if (plane.altitude() > 100) liftoff = plane.airspeed() / U;
			}
			expect(liftoff).toBeGreaterThan(25);
			expect(liftoff).toBeLessThan(34);
			expect(plane.engine()).toBeCloseTo(1, 2);

			// Climbs; the gear comes up once it's away
			run(physics, 20, () => holdPitch(plane, 10));
			expect(plane.altitude()).toBeGreaterThan(60 * U);
			expect(plane.verticalSpeed()).toBeGreaterThan(2 * U);
			expect(plane.airborne()).toBe(true);
			run(physics, 5, () => holdPitch(plane, 10, { gear: false }));
			expect(plane.gear()).toBe(0);
			expect(plane.gearDown()).toBe(false);
			run(physics, 40, () => holdPitch(plane, 10));
			expect(plane.altitude()).toBeGreaterThan(200 * U);

			// Throttle closed, holding height: it slows until the wing stalls
			let stalled = false;
			const pilot = levelPilot(plane);
			for (let t = 0; t < 90 && !stalled; t += 1 / 60) {
				run(physics, 1 / 60, () => pilot({ throttle: 0 }));
				stalled = plane.stalled();
			}
			expect(stalled).toBe(true);
			expect(plane.angleOfAttack()).toBeGreaterThan(14);
			expect(plane.airspeed()).toBeLessThan(32 * U);
			// Stalled, the nose drops and it sinks, even with the stick held back
			const pitch = plane.attitude().pitch, height = plane.altitude();
			run(physics, 2, () => plane.fly({ pitch: -1 }));
			expect(plane.attitude().pitch).toBeLessThan(pitch - 5);
			expect(plane.altitude()).toBeLessThan(height);

			// Stick let go and full throttle: it flies again and climbs away
			let flying = 0;
			for (let t = 0; t < 8 && !flying; t += 1 / 60) {
				run(physics, 1 / 60, () => plane.fly({ throttle: 1 }));
				if (!plane.stalled()) flying = t;
			}
			expect(flying).toBeGreaterThan(0);
			run(physics, 20, () => holdPitch(plane, 8));
			expect(plane.stalled()).toBe(false);
			expect(plane.airspeed()).toBeGreaterThan(28 * U);
			expect(plane.verticalSpeed()).toBeGreaterThan(0);
			expect(impacts.map((impact) => impact.speed)).toEqual([]);

			// On final for a runway at 33 m/s, gear and flaps down: descend at 3 m/s, flare, touch down, brake
			landings.length = 0;
			plane.setState({
				position: { x: 0, y: 40 * U, z: -600 * U }, rotation: level, velocity: { x: 0, y: 0, z: 33 * U }, angularVelocity: still,
				engine: 0.3, gear: 1, flaps: 1, input: { throttle: 0.3, flaps: 1, gear: true }
			});
			expect(plane.gearDown()).toBe(true);
			let touched = false, stopped = false;
			for (let t = 0; t < 90 && !stopped; t += 1 / 60) {
				run(physics, 1 / 60, () => {
					if (touched) {
						plane.fly({ throttle: 0, brake: 1 });
						return;
					}
					const height = plane.heightAboveGround() / U;
					const sink = height > 6 ? -3 : -0.6;
					const throttle = clamp((33 - plane.airspeed() / U) * 0.2 + 0.3, 0, 1) * (height > 3 ? 1 : 0);
					holdPitch(plane, clamp(plane.attitude().pitch + (sink - plane.verticalSpeed() / U) * 1.5, -8, 12), { throttle });
				});
				touched = touched || landings.length > 0;
				stopped = touched && Math.abs(plane.speedKmh()) < 1;
			}
			expect(landings[0].onGear).toBe(true);
			expect(landings[0].onWater).toBe(false);
			expect(landings[0].speed).toBeLessThan(2 * U);
			expect(stopped).toBe(true);
			run(physics, 2, () => plane.fly({ brake: 1 }));
			expect(plane.grounded()).toBe(true);
			expect(plane.tilt()).toBeLessThan(5);
			expect(impacts.map((impact) => impact.speed)).toEqual([]);
		});

		it("go much faster as a jet; an airliner takes a long run to lift off", () => {
			land();
			const topSpeed = (preset: "lightPlane" | "jet", z: number) => {
				const { plane } = addAircraft({ preset }, 0, z);
				plane.setState({
					position: { x: 0, y: 500 * U, z }, rotation: level, velocity: { x: 0, y: 0, z: 60 * U }, angularVelocity: still,
					engine: 1, gear: 0, input: { throttle: 1, gear: false }
				});
				const pilot = levelPilot(plane);
				run(physics, 80, () => pilot());
				expect(Math.abs(plane.altitude() - 500 * U)).toBeLessThan(150 * U);
				return plane.airspeed() / U;
			};
			const light = topSpeed("lightPlane", 0);
			const jet = topSpeed("jet", 200000);
			expect(light).toBeGreaterThan(55);
			expect(light).toBeLessThan(70); // 65 m/s
			expect(jet).toBeGreaterThan(220); // 250 m/s
			expect(jet).toBeGreaterThan(light * 3);

			const { entity, plane } = addAircraft({ preset: "airliner" }, 300000, 0);
			run(physics, 2);
			let liftoff = 0;
			for (let t = 0; t < 70 && !liftoff; t += 1 / 60) {
				run(physics, 1 / 60, () => {
					if (plane.airspeed() > 72 * U) holdPitch(plane, 10, { throttle: 1 });
					else plane.fly({ throttle: 1 });
				});
				if (plane.altitude() > 300) liftoff = plane.airspeed() / U;
			}
			expect(liftoff).toBeGreaterThan(65);
			expect(entity._translate.z).toBeGreaterThan(700 * U);
		});

		it("take off from water on floats, and land on it (floatplane)", () => {
			sea([{ direction: 10, length: 4000, amplitude: 10 }]);
			const { plane } = addAircraft({ preset: "floatplane", impacts: true });
			const landings: IgePhysicsCraftLanding[] = [];
			plane.on("landed", (landing: IgePhysicsCraftLanding) => { landings.push(landing); });
			run(physics, 4);
			expect(plane.submerged()).toBeGreaterThan(0.1);
			expect(plane.submerged()).toBeLessThan(0.5);
			expect(plane.grounded()).toBe(true);
			expect(plane.tilt()).toBeLessThan(5);

			// It turns on the water with rudder and a little throttle
			const before = plane.attitude().heading;
			run(physics, 4, () => plane.fly({ throttle: 0.3, yaw: 1 }));
			expect(plane.attitude().heading - before).toBeLessThan(-30);

			let airborne = false;
			for (let t = 0; t < 40 && !airborne; t += 1 / 60) {
				run(physics, 1 / 60, () => {
					if (plane.airspeed() > 26 * U) holdPitch(plane, 8, { throttle: 1, flaps: 0.5 });
					else plane.fly({ throttle: 1, flaps: 0.5 });
				});
				airborne = plane.altitude() > 300;
			}
			expect(airborne).toBe(true);
			run(physics, 8, () => holdPitch(plane, 8));
			expect(plane.submerged()).toBe(0);

			// Back down onto the water
			plane.setState({ ...plane.getState(), position: { x: 0, y: 15 * U, z: 0 }, rotation: turn({ x: 1, y: 0, z: 0 }, -3), velocity: { x: 0, y: -1.5 * U, z: 30 * U }, angularVelocity: still });
			landings.length = 0;
			run(physics, 12, () => plane.fly({ throttle: 0.2, flaps: 1 }));
			expect(landings.length).toBeGreaterThanOrEqual(1);
			expect(landings[0].onWater).toBe(true);
			expect(plane.submerged()).toBeGreaterThan(0.1);
			expect(plane.tilt()).toBeLessThan(10);
		});

		it("report impacts with what they hit", () => {
			land();
			const wall = new IgeEntity().translateTo(0, 2000, 5000);
			physics.addBody(wall, { type: "static", shape: { type: "box", halfExtents: { x: 3000, y: 2000, z: 100 } } });
			const { entity, plane } = addAircraft({ preset: "lightPlane", impacts: true });
			const impacts: IgePhysicsImpact[] = [];
			plane.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });
			plane.setState({ position: { x: 0, y: 1000, z: 0 }, rotation: level, velocity: { x: 0, y: 0, z: 40 * U }, angularVelocity: still, engine: 0.8, gear: 0, input: { throttle: 0.8, gear: false } });
			run(physics, 2);
			expect(impacts.length).toBeGreaterThanOrEqual(1);
			const hit = impacts.reduce((a, b) => (b.speed > a.speed ? b : a));
			expect(hit.speed).toBeGreaterThan(10 * U);
			expect(hit.impulse).toBeCloseTo(hit.speed * 1100, -3);
			expect(hit.others.map((b) => b.entity)).toContain(wall);
			expect(entity._translate.z).toBeLessThan(5000);
		});
	});

	describe("helicopters", () => {
		it("sit on the ground, climb, hover with the collective centred, fly, and land softly", () => {
			land();
			const { entity, heli } = (() => {
				const made = addAircraft({ preset: "helicopter", impacts: true });
				return { entity: made.entity, heli: made.plane };
			})();
			const landings: IgePhysicsCraftLanding[] = [], impacts: IgePhysicsImpact[] = [];
			heli.on("landed", (landing: IgePhysicsCraftLanding) => { landings.push(landing); });
			heli.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });
			expect(heli.type).toBe("helicopter");

			// Centred collective on the ground: it stays put, rotor turning
			run(physics, 3, () => heli.fly({}));
			expect(heli.grounded()).toBe(true);
			expect(Math.abs(heli.altitude())).toBeLessThan(5);
			expect(heli.rotor()).toBeCloseTo(1, 3);

			// Collective up: climbs about 10 m/s
			run(physics, 3, () => heli.fly({ collective: 1 }));
			expect(heli.altitude()).toBeGreaterThan(18 * U);
			expect(heli.verticalSpeed()).toBeGreaterThan(8 * U);
			expect(heli.airborne()).toBe(true);

			// Centred: it settles and holds that height, level, without drifting
			run(physics, 3, () => heli.fly({}));
			const held = heli.altitude(), x = entity._translate.x, z = entity._translate.z;
			run(physics, 8, () => heli.fly({}));
			expect(Math.abs(heli.altitude() - held)).toBeLessThan(0.5 * U);
			expect(Math.hypot(entity._translate.x - x, entity._translate.z - z)).toBeLessThan(1 * U);
			expect(heli.tilt()).toBeLessThan(1);

			// Cyclic forward: it tilts and flies forward, holding height; let go, it levels and slows down
			run(physics, 8, () => heli.fly({ pitch: 1 }));
			expect(heli.speed()).toBeGreaterThan(25 * U);
			expect(heli.attitude().pitch).toBeLessThan(-20);
			expect(Math.abs(heli.altitude() - held)).toBeLessThan(5 * U);
			run(physics, 12, () => heli.fly({}));
			expect(heli.speed()).toBeLessThan(8 * U);
			expect(heli.tilt()).toBeLessThan(12);

			// Tail rotor: it turns on the spot
			const before = heli.attitude().heading;
			run(physics, 1, () => heli.fly({ yaw: 1 }));
			expect(heli.attitude().heading - before).toBeLessThan(-45);

			// Collective down: it comes down and eases onto the ground
			let time = 0;
			while (!heli.grounded() && time < 20) {
				run(physics, 1 / 60, () => heli.fly({ collective: -1 }));
				time += 1 / 60;
			}
			expect(heli.grounded()).toBe(true);
			expect(landings.length).toBe(1);
			expect(landings[0].onGear).toBe(true);
			expect(landings[0].speed).toBeLessThan(1.5 * U);
			run(physics, 3, () => heli.fly({}));
			expect(Math.abs(heli.altitude())).toBeLessThan(5);
			expect(heli.grounded()).toBe(true);
			expect(impacts.map((impact) => impact.speed)).toEqual([]);
		});

		it("land on a helipad on a roof", () => {
			land();
			const pad = new IgeEntity().translateTo(0, 1000, 3000);
			physics.addBody(pad, { type: "static", shape: { type: "box", halfExtents: { x: 800, y: 1000, z: 800 } } });
			const { plane: heli } = addAircraft({ preset: "helicopter" });
			heli.setState({ position: { x: 0, y: 4000, z: 3000 }, rotation: level, velocity: still, angularVelocity: still, rotor: 1 });
			let time = 0;
			while (!heli.grounded() && time < 20) {
				run(physics, 1 / 60, () => heli.fly({ collective: -1 }));
				time += 1 / 60;
			}
			run(physics, 2, () => heli.fly({}));
			expect(heli.altitude()).toBeGreaterThan(2000 - 5);
			expect(heli.altitude()).toBeLessThan(2000 + 5);
			expect(heli.grounded()).toBe(true);
		});
	});

	describe("state", () => {
		it("round-trips a plane, a helicopter and a boat through JSON into another world, which carries on the same", async () => {
			sea();
			const { plane } = addAircraft({ preset: "lightPlane" }, 0, -200000);
			plane.setState({ position: { x: 0, y: 30000, z: -200000 }, rotation: level, velocity: { x: 0, y: 0, z: 45 * U }, angularVelocity: still, engine: 0.7, gear: 0, flaps: 0.5, input: { throttle: 0.7, gear: false, flaps: 0.5 } });
			run(physics, 2, () => plane.fly({ roll: 0.3 }));
			const { plane: heli } = addAircraft({ preset: "helicopter" }, 50000, -200000);
			heli.setState({ position: { x: 50000, y: 3000, z: -200000 }, rotation: level, velocity: still, angularVelocity: still, rotor: 1 });
			run(physics, 2, () => heli.fly({ pitch: 0.5, yaw: 0.2 }));
			const { boat } = addBoat({ preset: "speedboat" }, 100000, 0);
			run(physics, 4, () => boat.drive({ throttle: 1, steer: 0.4 }));

			const states = [plane.getState(), heli.getState(), boat.getState()];
			const json = JSON.parse(JSON.stringify(states)) as IgePhysicsCraftState[];
			expect(json).toEqual(states);
			expect(states[0].gear).toBe(0);
			expect(states[0].flaps).toBeCloseTo(0.5, 6);
			expect(states[0].engine).toBeCloseTo(0.7, 6);
			expect(states[0].input).toMatchObject({ throttle: 0.7, roll: 0.3, gear: false });
			expect(states[1].rotor).toBe(1);
			expect(states[2].input).toEqual({ throttle: 1, steer: 0.4 });

			const other = await createTestPhysics({}, backend);
			const bed = new IgeEntity().translateTo(0, -3050, 0);
			other.addBody(bed, { type: "static", shape: { type: "box", halfExtents: { x: 500000, y: 50, z: 500000 } } });
			other.water({ level: 0 });
			const copies = [
				other.addAircraft(new IgeEntity(), { preset: "lightPlane" }),
				other.addAircraft(new IgeEntity(), { preset: "helicopter" }),
				other.addBoat(new IgeEntity(), { preset: "speedboat" })
			];
			copies.forEach((copy, i) => copy.setState(json[i]));
			copies.forEach((copy, i) => {
				const restored = copy.getState();
				expect(restored.position.x).toBeCloseTo(states[i].position.x, 1);
				expect(restored.position.y).toBeCloseTo(states[i].position.y, 1);
				expect(restored.velocity.z).toBeCloseTo(states[i].velocity.z, 1);
				expect(restored.input).toEqual(states[i].input);
			});
			// The water's clock comes with the world: set it the same so the waves match
			other.water()!.time(physics.water()!.time());

			run(physics, 1);
			run(other, 1);
			const originals = [plane, heli, boat];
			copies.forEach((copy, i) => {
				const a = originals[i].getState().position, b = copy.getState().position;
				expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.5 * U);
			});
			other.destroy();
		});

		it("follows given states in kinematic mode, pushing bodies, and carries on when let go", () => {
			land();
			const { entity, plane } = addAircraft({ preset: "helicopter" }, 0, 0);
			run(physics, 1);
			const crate = new IgeEntity().translateTo(0, 200, 800);
			const crateBody = physics.addBody(crate, { shape: { type: "box", halfExtents: { x: 50, y: 50, z: 50 } }, density: 100 });
			run(physics, 0.5);

			plane.kinematic(true);
			expect(plane.kinematic()).toBe(true);
			const speed = 10 * U;
			let time = 0;
			// States at 30 Hz, steps at 60 Hz
			run(physics, 2, () => {
				time += 1 / 60;
				if (Math.round(time * 60) % 2 === 0) {
					plane.setState({ position: { x: 0, y: 0, z: speed * time }, rotation: level, velocity: { x: 0, y: 0, z: speed }, angularVelocity: still, rotor: 0.5 });
				}
			});
			expect(entity._translate.z).toBeGreaterThan(speed * 1.9);
			expect(entity._translate.z).toBeLessThan(speed * 2.1);
			expect(Math.abs(entity._translate.y)).toBeLessThan(2);
			expect(plane.rotor()).toBe(0.5);
			expect(crateBody.velocity().z + crate._translate.z).toBeGreaterThan(800 + speed * 0.5);

			// No new states: it carries on for `extrapolate` seconds, then holds
			const last = entity._translate.z;
			run(physics, 1);
			expect(entity._translate.z - last).toBeGreaterThan(speed * 0.2);
			expect(entity._translate.z - last).toBeLessThan(speed * 0.4);

			// Simulated again, it carries on at the last state's speed
			plane.setState({ ...plane.getState(), position: { x: 0, y: 2000, z: entity._translate.z }, velocity: { x: 0, y: 0, z: speed } });
			plane.kinematic(false);
			run(physics, 0.1);
			expect(plane.speed()).toBeGreaterThan(speed * 0.8);
		});
	});

	describe("the world", () => {
		it("finds craft by entity and raycast, and frees them", () => {
			land();
			const before = physics.stats();
			const { entity: planeEntity, plane } = addAircraft({ preset: "jet" }, 0, 0);
			const { entity: boatEntity, boat } = addBoat({ preset: "yacht" }, 5000, 0);
			const crate = physics.addBody(new IgeEntity().translateTo(-5000, 100, 0), { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } } });
			const floating = physics.addBuoyancy(crate);
			expect(physics.stats().crafts).toBe(2);
			expect(physics.stats().bodies).toBe(before.bodies + 3);
			expect(physics.craftOf(planeEntity)).toBe(plane);
			expect(physics.craftOf(boatEntity)).toBe(boat);
			run(physics, 1);
			expect(physics.raycast({ x: 0, y: 1000, z: 0 }, { x: 0, y: -1, z: 0 }, 2000)?.entity).toBe(planeEntity);
			expect(physics.bodyOf(boatEntity)?.entity).toBe(boatEntity);

			plane.destroy();
			plane.destroy(); // twice is harmless
			physics.removeCraft(boat);
			crate.destroy(); // its buoyancy goes with it
			expect(physics.stats().crafts).toBe(0);
			expect(physics.stats().floating).toBe(0);
			expect(physics.stats().bodies).toBe(before.bodies);
			expect(physics.craftOf(planeEntity)).toBeUndefined();
			expect(physics.raycast({ x: 0, y: 1000, z: 0 }, { x: 0, y: -1, z: 0 }, 2000)?.entity).not.toBe(planeEntity);
			floating.destroy();
			run(physics, 0.5);

			// Everything at once, freed with the world (afterEach)
			physics.water({ level: -500 });
			addAircraft({ preset: "airliner" }, 0, 0);
			addAircraft({ preset: "floatplane" }, 9000, 0);
			addBoat({ preset: "cargoShip" }, 30000, 0);
			physics.addBuoyancy(physics.addBody(new IgeEntity().translateTo(-5000, 100, 0), { shape: { type: "sphere", radius: 30 } }));
			run(physics, 0.5);
		});
	});
});
