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

/** Rotation a, then b about the turned axes. */
function combine (a: { x: number; y: number; z: number; w: number }, b: { x: number; y: number; z: number; w: number }) {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
	};
}

/** The air-and-sea example's sea: a long swell, a shorter chop across it and a ripple (IGE units). */
const EXAMPLE_WAVES = [
	{ direction: 25, length: 6000, amplitude: 32, steepness: 0.4 },
	{ direction: 70, length: 2300, amplitude: 12, steepness: 0.5, phase: 1.3 },
	{ direction: -30, length: 1100, amplitude: 5, steepness: 0.35, phase: 2.1 }
];

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
	function sea (waves: { direction: number; length: number; amplitude: number; steepness?: number; phase?: number }[] = []) {
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
			let fastest = 0, hundred = 0;
			run(physics, 15, (time) => {
				boat.drive({ throttle: 1 });
				fastest = Math.max(fastest, boat.speedKmh());
				if (!hundred && boat.speedKmh() > 100) hundred = time;
			});
			expect(boat.speedKmh()).toBeGreaterThan(165); // 50 m/s is 180 km/h
			expect(fastest).toBeLessThan(185);
			expect(hundred).toBeLessThan(4);
			expect(entity._translate.z).toBeGreaterThan(500 * U);
			expect(Math.abs(entity._translate.x)).toBeLessThan(5 * U);
			expect(boat.propellerInWater()).toBe(true);

			// Full right rudder: the heading swings right (towards -X) and it leans into the turn
			const before = boat.attitude().heading;
			let lean = 0;
			run(physics, 2, () => {
				boat.drive({ throttle: 1, steer: 1 });
				lean = Math.max(lean, boat.attitude().roll);
			});
			expect(boat.attitude().heading - before).toBeLessThan(-35);
			expect(lean).toBeGreaterThan(4);
			expect(boat.speedKmh()).toBeGreaterThan(100);
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

		it("stay on top of the waves at full speed, and bank round full-rudder turns without flipping (speedboats)", () => {
			sea(EXAMPLE_WAVES);
			const { boat } = addBoat({ preset: "speedboat" });
			run(physics, 2);
			let lowest = Infinity, highest = -Infinity, tilt = 0, airborne = 0;
			run(physics, 20, (time) => {
				boat.drive({ throttle: 1 });
				if (time < 6) return;
				// Up to speed: bow up a little, leaping the odd crest, but no porpoising or flips
				const pitch = boat.attitude().pitch;
				lowest = Math.min(lowest, pitch);
				highest = Math.max(highest, pitch);
				tilt = Math.max(tilt, boat.tilt());
				if (boat.airborne()) airborne += 1 / 60;
			});
			expect(boat.speedKmh()).toBeGreaterThan(160);
			expect(lowest).toBeGreaterThan(-8);
			expect(highest).toBeLessThan(15);
			expect(tilt).toBeLessThan(20);
			expect(airborne).toBeLessThan(5);

			// Full rudder at top speed: it leans into the turn and stays upright, round and round
			const before = boat.attitude().heading;
			let lean = 0;
			tilt = 0;
			run(physics, 8, () => {
				boat.drive({ throttle: 1, steer: 1 });
				lean = Math.max(lean, boat.attitude().roll);
				tilt = Math.max(tilt, boat.tilt());
			});
			expect(Math.abs(boat.attitude().heading - before)).toBeGreaterThan(30);
			expect(lean).toBeGreaterThan(8);
			expect(tilt).toBeLessThan(35);
			// Flicked from side to side
			run(physics, 8, (time) => {
				boat.drive({ throttle: 1, steer: Math.sin(time * 2) > 0 ? 1 : -1 });
				tilt = Math.max(tilt, boat.tilt());
			});
			expect(tilt).toBeLessThan(35);
			expect(boat.speedKmh()).toBeGreaterThan(80);
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

			// Full throttle; rotate at 19.5 m/s (the stall speed is 16.7 m/s, 60 km/h)
			let liftoff = 0;
			for (let t = 0; t < 40 && !liftoff; t += 1 / 60) {
				run(physics, 1 / 60, () => {
					if (plane.airspeed() > 19.5 * U) holdPitch(plane, 10, { throttle: 1 });
					else plane.fly({ throttle: 1 });
				});
				if (plane.altitude() > 100) liftoff = plane.airspeed() / U;
			}
			expect(liftoff).toBeGreaterThan(16.7);
			expect(liftoff).toBeLessThan(25);
			expect(entity._translate.z).toBeLessThan(150 * U);
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
			expect(plane.angleOfAttack()).toBeGreaterThan(19);
			expect(plane.airspeed()).toBeLessThan(18 * U);
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
			expect(plane.airspeed()).toBeGreaterThan(22 * U);
			expect(plane.verticalSpeed()).toBeGreaterThan(0);
			expect(impacts.map((impact) => impact.speed)).toEqual([]);

			// On final for a runway at 23 m/s, gear and flaps down: descend at 3 m/s, flare, touch down, brake
			landings.length = 0;
			plane.setState({
				position: { x: 0, y: 40 * U, z: -600 * U }, rotation: level, velocity: { x: 0, y: 0, z: 23 * U }, angularVelocity: still,
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
					const throttle = clamp((23 - plane.airspeed() / U) * 0.2 + 0.3, 0, 1) * (height > 3 ? 1 : 0);
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
			plane.setState({ ...plane.getState(), position: { x: 0, y: 15 * U, z: 0 }, rotation: turn({ x: 1, y: 0, z: 0 }, -3), velocity: { x: 0, y: -1.5 * U, z: 20 * U }, angularVelocity: still });
			landings.length = 0;
			run(physics, 12, () => plane.fly({ throttle: 0.2, flaps: 1 }));
			expect(landings.length).toBeGreaterThanOrEqual(1);
			expect(landings[0].onWater).toBe(true);
			expect(landings[0].speed).toBeLessThan(1.5 * U); // it flares over the water
			expect(plane.submerged()).toBeGreaterThan(0.1);
			expect(plane.tilt()).toBeLessThan(10);
		});

		it("stall only when slow and nose-high, briefly, and fly again by themselves", () => {
			land();
			const stallKmh = { lightPlane: 60, floatplane: 63, jet: 132, airliner: 149 };
			(["lightPlane", "floatplane", "jet", "airliner"] as const).forEach((preset, i) => {
				const { plane } = addAircraft({ preset }, i * 100000, 0);
				const start = (speed: number) => plane.setState({
					position: { x: i * 100000, y: 1500 * U, z: 0 }, rotation: level, velocity: { x: 0, y: 0, z: speed * U }, angularVelocity: still,
					engine: 0.5, gear: 0, input: { throttle: 0.5, gear: false }
				});
				const twice = (stallKmh[preset] / 3.6) * 2;

				// A hard pull at twice the stall speed flies at the edge of the stall, not over it
				start(twice);
				let stalled = false, steepest = 0;
				run(physics, 1.5, () => {
					plane.fly({ pitch: -1 });
					stalled = stalled || plane.stalled();
					steepest = Math.max(steepest, plane.angleOfAttack());
				});
				expect(stalled).toBe(false);
				expect(steepest).toBeGreaterThan(5);

				// Slowing in level flight, throttle closed: it stalls at about its stall speed
				start(twice);
				const pilot = levelPilot(plane);
				for (let t = 0; t < 120 && !plane.stalled(); t += 1 / 60) run(physics, 1 / 60, () => pilot({ throttle: 0 }));
				expect(plane.stalled()).toBe(true);
				expect((plane.airspeed() / U) * 3.6).toBeGreaterThan(stallKmh[preset] * 0.9);
				expect((plane.airspeed() / U) * 3.6).toBeLessThan(stallKmh[preset] * 1.05);

				// Stick let go: a short nose drop and it flies again, within a second or two, and stays flying
				const pitch = plane.attitude().pitch;
				let lowest = pitch, flying = -1, again = false;
				for (let t = 0; t < 5; t += 1 / 60) {
					run(physics, 1 / 60, () => plane.fly({}));
					lowest = Math.min(lowest, plane.attitude().pitch);
					if (flying < 0 && !plane.stalled()) flying = t;
					else if (flying >= 0 && plane.stalled()) again = true;
				}
				expect(flying).toBeGreaterThan(0);
				expect(flying).toBeLessThan(preset === "airliner" ? 2 : 1.2);
				expect(pitch - lowest).toBeLessThan(25);
				expect(again).toBe(false);
				expect(Math.abs(plane.attitude().pitch)).toBeLessThan(10);
				plane.destroy();
			});
		});

		it("recover from a stall as quickly as stallRecovery says", () => {
			land();
			const recovery = (stallRecovery: number, x: number) => {
				const { plane } = addAircraft({ preset: "lightPlane", stallRecovery }, x, 0);
				plane.setState({ position: { x, y: 1500 * U, z: 0 }, rotation: level, velocity: { x: 0, y: 0, z: 30 * U }, angularVelocity: still, engine: 0, gear: 0, input: { throttle: 0, gear: false } });
				const pilot = levelPilot(plane);
				for (let t = 0; t < 120 && !plane.stalled(); t += 1 / 60) run(physics, 1 / 60, () => pilot({ throttle: 0 }));
				let time = 0;
				while (plane.stalled() && time < 10) {
					run(physics, 1 / 60, () => plane.fly({}));
					time += 1 / 60;
				}
				return time;
			};
			const quick = recovery(0.5, 0), slow = recovery(3, 100000);
			expect(quick).toBeLessThan(0.6);
			expect(slow).toBeGreaterThan(quick * 2);
			expect(slow).toBeLessThan(3);
		});

		it("touch down firm and crabbed without bouncing or tipping over", () => {
			land();
			// 3 m/s down, the nose 5 degrees right of its track, and a wing low, without the flare (assists off)
			([["lightPlane", 20, 0], ["lightPlane", 20, 5], ["jet", 45, 5], ["airliner", 50, 5]] as const).forEach(([preset, speed, bank], i) => {
				const x = i * 50000;
				const { plane } = addAircraft({ preset, impacts: true, assists: false }, x, 0);
				const impacts: IgePhysicsImpact[] = [];
				plane.on("impact", (impact: IgePhysicsImpact) => { impacts.push(impact); });
				plane.setState({
					position: { x, y: 0.4 * U, z: 0 }, rotation: combine(turn({ x: 0, y: 1, z: 0 }, -5), turn({ x: 0, y: 0, z: 1 }, bank)),
					velocity: { x: 0, y: -3 * U, z: speed * U }, angularVelocity: still, engine: 0, gear: 1, flaps: 1, input: { throttle: 0, flaps: 1, gear: true }
				});
				let touched = NaN, highest = -Infinity, roll = 0;
				run(physics, 5, (time) => {
					plane.fly({ brake: time > 1 ? 1 : 0 });
					if (Number.isNaN(touched) && plane.grounded()) touched = plane.altitude();
					if (Number.isNaN(touched)) return;
					highest = Math.max(highest, plane.altitude());
					roll = Math.max(roll, Math.abs(plane.attitude().roll));
				});
				expect(touched).toBeLessThan(0.4 * U);
				// No bounce: never more than a few centimetres back up
				expect(highest - touched).toBeLessThan(0.1 * U);
				expect(roll).toBeLessThan(bank + 1.5);
				expect(plane.grounded()).toBe(true);
				expect(plane.tilt()).toBeLessThan(5);
				for (let w = 0; w < 3; w++) expect(plane.wheel(w).contact).toBe(true);
				expect(impacts.map((impact) => impact.speed)).toEqual([]);
				plane.destroy();
			});
		});

		it("flare by themselves low over the ground with the gear down (assists)", () => {
			land();
			const touchdown = (assists: boolean, gear: boolean, x: number) => {
				const { plane } = addAircraft({ preset: "lightPlane", assists }, x, 0);
				const landings: IgePhysicsCraftLanding[] = [];
				plane.on("landed", (landing: IgePhysicsCraftLanding) => { landings.push(landing); });
				plane.setState({
					position: { x, y: 25 * U, z: 0 }, rotation: turn({ x: 1, y: 0, z: 0 }, 3), velocity: { x: 0, y: -1.6 * U, z: 23 * U }, angularVelocity: still,
					engine: 0.3, gear: gear ? 1 : 0, flaps: 1, input: { throttle: 0.3, flaps: 1, gear }
				});
				// The pilot holds a 2.5 m/s descent at 23 m/s down to 8 m, then lets go of the stick and closes the throttle
				for (let t = 0; t < 30 && !landings.length; t += 1 / 60) {
					const height = plane.heightAboveGround() / U;
					run(physics, 1 / 60, () => {
						if (height > 8) holdPitch(plane, clamp(plane.attitude().pitch + (-2.5 - plane.verticalSpeed() / U) * 1.5, -10, 10), { throttle: clamp((23 - plane.airspeed() / U) * 0.2 + 0.3, 0, 1) });
						else plane.fly({ throttle: 0 });
					});
				}
				expect(landings.length).toBe(1);
				plane.destroy();
				return landings[0];
			};
			const flared = touchdown(true, true, 0);
			const unflared = touchdown(false, true, 50000);
			const belly = touchdown(true, false, 100000);
			expect(flared.onGear).toBe(true);
			expect(flared.speed).toBeLessThan(1.5 * U);
			expect(unflared.speed).toBeGreaterThan(flared.speed * 1.8);
			// Gear up, no flare: it's a belly landing
			expect(belly.onGear).toBe(false);
			expect(belly.speed).toBeGreaterThan(flared.speed * 1.25);
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

		it("level within half a second of letting go of the cyclic, and stop drifting without overshooting", () => {
			land();
			const { plane: heli } = addAircraft({ preset: "helicopter" });
			const hover = () => {
				heli.setState({ position: { x: 0, y: 5000, z: 0 }, rotation: level, velocity: still, angularVelocity: still, rotor: 1 });
				run(physics, 2, () => heli.fly({}));
			};
			hover();
			// Tilted fully forward and let go: level in half a second, without tipping back past it
			heli.setState({ ...heli.getState(), rotation: turn({ x: 1, y: 0, z: 0 }, 32), velocity: still, angularVelocity: still });
			let back = 0;
			run(physics, 0.5, () => heli.fly({}));
			expect(heli.tilt()).toBeLessThan(2);
			run(physics, 1, () => {
				heli.fly({});
				back = Math.max(back, heli.attitude().pitch);
			});
			expect(back).toBeLessThan(3);

			// A second's push forward (or sideways), let go: it stops in a couple of seconds, without coming back
			for (const [pitch, roll] of [[1, 0], [0, 1]]) {
				hover();
				run(physics, 1, () => heli.fly({ pitch, roll }));
				const v = heli.velocity();
				expect(Math.hypot(v.x, v.z)).toBeGreaterThan(3 * U);
				const way = { x: v.x / Math.hypot(v.x, v.z), z: v.z / Math.hypot(v.x, v.z) };
				let reverse = 0, settled = -1;
				for (let t = 0; t < 4; t += 1 / 60) {
					run(physics, 1 / 60, () => heli.fly({}));
					const now = heli.velocity(), along = now.x * way.x + now.z * way.z;
					reverse = Math.min(reverse, along);
					if (settled < 0 && Math.hypot(now.x, now.z) < 0.5 * U) settled = t;
				}
				expect(settled).toBeGreaterThan(0);
				expect(settled).toBeLessThan(2.5);
				expect(reverse).toBeGreaterThan(-0.3 * U);
				expect(heli.tilt()).toBeLessThan(1);
			}

			// A gamepad stick held a little off the middle: a slow, steady drift, gently tilted
			hover();
			run(physics, 6, () => heli.fly({ pitch: 0.12 }));
			expect(heli.speed()).toBeGreaterThan(0.3 * U);
			expect(heli.speed()).toBeLessThan(4 * U);
			expect(heli.tilt()).toBeLessThan(6);
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
