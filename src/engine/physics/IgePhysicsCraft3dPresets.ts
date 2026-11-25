import type { IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgePhysicsAircraftPreset,
	IgePhysicsBoatPreset,
	IgePhysicsFloatPoint,
	IgePhysicsGearOptions,
	IgePhysicsWaterDrag
} from "@/engine/physics/IgePhysicsCraft3dApi";

/*
 * Starting points for boats and aircraft, in metres, metres per second and
 * SI units (scaled to IGE units when a craft is made). GTA-style arcade
 * figures: roughly real sizes and masses, quicker and more forgiving
 * handling. The entity's origin is on the keel under a boat's middle, and
 * on the ground under an aircraft resting on its wheels, skids or floats.
 */

type Vec3 = IgePhysicsVec3;

const box = (hx: number, hy: number, hz: number, x: number, y: number, z: number) =>
	({ shape: { type: "box" as const, halfExtents: { x: hx, y: hy, z: hz } }, position: { x, y, z } });

export interface IgeBoatPresetSpec {
	mass: number;
	hull: { length: number; width: number; height: number };
	/** Share of the hull's box that displaces water (the bow is narrower than a box). */
	fullness: number;
	shape: IgePhysicsShape;
	centreOfMass: Vec3;
	maxSpeed: number;
	thrust: number;
	reverse: number;
	/** Height of the propeller above the keel (negative: below it), metres; it sits just forward of the stern. */
	propellerDepth: number;
	turnRate: number;
	turnSpeed: number;
	bank: number;
	planing: { lift: number; bowRise: number; speed: number };
	stability: number;
	drag: Required<IgePhysicsWaterDrag>;
	/** Buoyancy grid: points along the hull and across it. */
	grid: { along: number; across: number };
}

export const BOAT_PRESETS: Record<IgePhysicsBoatPreset, IgeBoatPresetSpec> = {
	// A sports runabout: light, fast, bow up when it gets going, banks into turns
	speedboat: {
		mass: 1800,
		hull: { length: 7, width: 2.4, height: 1.2 },
		fullness: 0.45,
		shape: { type: "compound", children: [box(1.2, 0.6, 3.5, 0, 0.6, 0), box(0.9, 0.3, 0.7, 0, 1.45, 0.4)] },
		centreOfMass: { x: 0, y: 0.35, z: -0.6 },
		maxSpeed: 50,
		thrust: 28000,
		reverse: 0.4,
		propellerDepth: -0.15,
		turnRate: 50,
		turnSpeed: 8,
		bank: 14,
		planing: { lift: 0.35, bowRise: 6, speed: 12 },
		stability: 3,
		drag: { x: 6, y: 3, z: 0.1, angular: 2 },
		grid: { along: 4, across: 2 }
	},
	// A trawler: heavy, slow and steady
	fishingBoat: {
		mass: 15000,
		hull: { length: 12, width: 4, height: 2.2 },
		fullness: 0.55,
		shape: { type: "compound", children: [box(2, 1.1, 6, 0, 1.1, 0), box(1.4, 1.1, 1.6, 0, 3.3, 2)] },
		centreOfMass: { x: 0, y: 0.9, z: -0.3 },
		maxSpeed: 9,
		thrust: 36000,
		reverse: 0.5,
		propellerDepth: 0.1,
		turnRate: 20,
		turnSpeed: 4,
		bank: 4,
		planing: { lift: 0, bowRise: 0, speed: 1 },
		stability: 2,
		drag: { x: 2.5, y: 2.5, z: 0.1, angular: 1.5 },
		grid: { along: 4, across: 2 }
	},
	// A motor yacht: big, fairly quick, lifts its bow a little
	yacht: {
		mass: 60000,
		hull: { length: 22, width: 6, height: 3.2 },
		fullness: 0.5,
		shape: { type: "compound", children: [box(3, 1.6, 11, 0, 1.6, 0), box(2.4, 1.2, 5, 0, 4.4, -1)] },
		centreOfMass: { x: 0, y: 1.3, z: -1 },
		maxSpeed: 16,
		thrust: 150000,
		reverse: 0.4,
		propellerDepth: 0.1,
		turnRate: 14,
		turnSpeed: 6,
		bank: 3,
		planing: { lift: 0.1, bowRise: 2.5, speed: 12 },
		stability: 1.5,
		drag: { x: 2, y: 2, z: 0.08, angular: 1.2 },
		grid: { along: 5, across: 2 }
	},
	// A coaster: enormous, slow to get going, slower to turn
	cargoShip: {
		mass: 8000000,
		hull: { length: 120, width: 20, height: 12 },
		fullness: 0.7,
		shape: { type: "compound", children: [box(10, 6, 60, 0, 6, 0), box(8, 5, 6, 0, 17, -48)] },
		centreOfMass: { x: 0, y: 4, z: 0 },
		maxSpeed: 9,
		thrust: 2400000,
		reverse: 0.5,
		propellerDepth: 1,
		turnRate: 3,
		turnSpeed: 5,
		bank: 1,
		planing: { lift: 0, bowRise: 0, speed: 1 },
		stability: 1,
		drag: { x: 1.5, y: 1.5, z: 0.05, angular: 0.8 },
		grid: { along: 6, across: 2 }
	}
};

export interface IgeAircraftPresetSpec {
	type: "plane" | "helicopter";
	mass: number;
	shape: IgePhysicsShape;
	centreOfMass: Vec3;
	wingArea: number;
	stallSpeed: number;
	maxSpeed: number;
	thrust: number;
	engine: "propeller" | "jet";
	spoolTime: number;
	stallAngle: number;
	/** Seconds a stall lasts: the nose drops by itself and the wing flies again. */
	stallRecovery: number;
	pitchRate: number;
	rollRate: number;
	yawRate: number;
	response: number;
	flaps: { lift: number; drag: number };
	gear: Omit<IgePhysicsGearOptions, "entity">[];
	retractable: boolean;
	gearTime: number;
	floats?: { points: IgePhysicsFloatPoint[]; volume: number; drag: IgePhysicsWaterDrag };
	climbRate: number;
	descentRate: number;
	maxTilt: number;
	/** Helicopters: seconds to level once the cyclic is let go. */
	levelTime: number;
	spinUp: number;
}

/** A wheel whose strut is fixed so the entity's origin rests on the ground (static compression about 0.11 m). */
function wheel (x: number, z: number, radius: number, travel: number, extra: Partial<IgePhysicsGearOptions> = {}): Omit<IgePhysicsGearOptions, "entity"> {
	return { position: { x, y: radius + travel - 0.11, z }, radius, travel, ...extra };
}

/** Four buoyancy points along each of two floats. */
function floatPoints (x: number, from: number, to: number, height: number): IgePhysicsFloatPoint[] {
	const points: IgePhysicsFloatPoint[] = [];
	for (const side of [-1, 1]) {
		for (let i = 0; i < 4; i++) points.push({ position: { x: side * x, y: height / 2, z: from + ((i + 0.5) / 4) * (to - from) }, height });
	}
	return points;
}

const LIGHT_PLANE: IgeAircraftPresetSpec = {
	type: "plane",
	// A four-seat high-wing tourer
	mass: 1100,
	shape: {
		type: "compound",
		children: [
			box(0.6, 0.7, 2.2, 0, 1.3, 0.8), // cabin
			box(0.35, 0.35, 1.6, 0, 1.65, -3), // tail cone, swept up so the tail clears the ground rotating
			box(5.5, 0.08, 0.8, 0, 2.08, 0.2), // wing
			box(1.8, 0.05, 0.5, 0, 1.75, -4.1), // tailplane
			box(0.05, 0.75, 0.6, 0, 2.45, -4.2) // fin
		]
	},
	centreOfMass: { x: 0, y: 1.25, z: 0 },
	wingArea: 16,
	stallSpeed: 16.7,
	maxSpeed: 65,
	thrust: 3800,
	engine: "propeller",
	spoolTime: 0.8,
	stallAngle: 20,
	stallRecovery: 1,
	pitchRate: 55,
	rollRate: 70,
	yawRate: 30,
	response: 0.25,
	flaps: { lift: 0.3, drag: 0.04 },
	gear: [
		wheel(0, 1.6, 0.2, 0.3, { steer: 30, brake: false }),
		wheel(1.3, -0.4, 0.25, 0.25, { brake: true }),
		wheel(-1.3, -0.4, 0.25, 0.25, { brake: true })
	],
	retractable: true,
	gearTime: 3,
	climbRate: 0,
	descentRate: 0,
	maxTilt: 0,
	levelTime: 0,
	spinUp: 0
};

export const AIRCRAFT_PRESETS: Record<IgePhysicsAircraftPreset, IgeAircraftPresetSpec> = {
	lightPlane: LIGHT_PLANE,
	// The light plane on two floats: lands on water, sits on its floats on land
	floatplane: {
		...LIGHT_PLANE,
		mass: 1250,
		shape: {
			type: "compound",
			children: [
				box(0.6, 0.7, 2.2, 0, 2.2, 0.8),
				box(0.35, 0.35, 1.6, 0, 2.55, -3),
				box(5.5, 0.08, 0.8, 0, 2.98, 0.2),
				box(1.8, 0.05, 0.5, 0, 2.65, -4.1),
				box(0.05, 0.75, 0.6, 0, 3.35, -4.2),
				box(0.3, 0.3, 3, 1.3, 0.3, 0.4), // floats
				box(0.3, 0.3, 3, -1.3, 0.3, 0.4)
			]
		},
		centreOfMass: { x: 0, y: 1.7, z: 0.2 },
		stallSpeed: 17.4,
		maxSpeed: 58,
		thrust: 4200,
		gear: [],
		retractable: false,
		floats: { points: floatPoints(1.3, -2.6, 3.4, 0.6), volume: 4.3, drag: { x: 3, y: 2.5, z: 0.12, angular: 1.5 } }
	},
	// A fast jet: high thrust, a wide speed range, quick to roll
	jet: {
		type: "plane",
		mass: 9000,
		shape: {
			type: "compound",
			children: [
				box(0.8, 0.8, 4, 0, 1.9, 3.5), // nose and cockpit
				box(0.7, 0.6, 3.5, 0, 2.3, -4), // rear fuselage, swept up
				box(5, 0.1, 2, 0, 1.8, -1.5), // wing
				box(2.6, 0.08, 1, 0, 2.4, -6.2), // tailplane
				box(0.06, 1.2, 1, 0, 3.9, -6) // fin
			]
		},
		centreOfMass: { x: 0, y: 1.8, z: 0.3 },
		wingArea: 28,
		stallSpeed: 36.7,
		maxSpeed: 250,
		thrust: 95000,
		engine: "jet",
		spoolTime: 1.5,
		stallAngle: 23,
		stallRecovery: 1,
		pitchRate: 90,
		rollRate: 220,
		yawRate: 30,
		response: 0.2,
		flaps: { lift: 0.25, drag: 0.03 },
		gear: [
			wheel(0, 4.5, 0.3, 0.3, { steer: 25, brake: false }),
			wheel(1.6, -0.8, 0.35, 0.3, { brake: true }),
			wheel(-1.6, -0.8, 0.35, 0.3, { brake: true })
		],
		retractable: true,
		gearTime: 2,
		climbRate: 0,
		descentRate: 0,
		maxTilt: 0,
		levelTime: 0,
		spinUp: 0
	},
	// A narrow-body airliner: heavy, slow to answer, a long take-off run
	airliner: {
		type: "plane",
		mass: 65000,
		shape: {
			type: "compound",
			children: [
				box(2, 2, 11, 0, 4, 7.5), // forward fuselage
				box(1.8, 1.6, 7.5, 0, 4.8, -11), // rear fuselage, swept up
				box(17, 0.25, 3, 0, 3, -1), // wing
				box(6, 0.15, 2, 0, 5.6, -16.5), // tailplane
				box(0.15, 3.5, 2.5, 0, 9.5, -16), // fin
				box(0.9, 0.9, 2, 5.7, 2, 2), // engines
				box(0.9, 0.9, 2, -5.7, 2, 2)
			]
		},
		centreOfMass: { x: 0, y: 3.5, z: 0.8 },
		wingArea: 122,
		stallSpeed: 41.3,
		maxSpeed: 240,
		thrust: 220000,
		engine: "jet",
		spoolTime: 4,
		stallAngle: 19,
		stallRecovery: 1.5,
		pitchRate: 9,
		rollRate: 22,
		yawRate: 6,
		response: 1.2,
		flaps: { lift: 0.35, drag: 0.04 },
		gear: [
			wheel(0, 12.5, 0.5, 0.5, { steer: 60, brake: false }),
			wheel(3.8, -0.5, 0.6, 0.5, { brake: true }),
			wheel(-3.8, -0.5, 0.6, 0.5, { brake: true })
		],
		retractable: true,
		gearTime: 8,
		climbRate: 0,
		descentRate: 0,
		maxTilt: 0,
		levelTime: 0,
		spinUp: 0
	},
	// A light utility helicopter on skids
	helicopter: {
		type: "helicopter",
		mass: 2500,
		shape: {
			type: "compound",
			children: [
				box(0.9, 0.9, 1.8, 0, 1.5, 0.5), // cabin
				box(0.25, 0.25, 2.8, 0, 1.9, -3.8), // tail boom
				box(0.05, 0.6, 0.4, 0, 2.4, -6.4), // tail fin
				box(0.06, 0.06, 1.6, 1, 0.06, 0.3), // skids
				box(0.06, 0.06, 1.6, -1, 0.06, 0.3),
				box(1, 0.04, 0.05, 0, 0.35, 1.2), // cross tubes
				box(1, 0.04, 0.05, 0, 0.35, -0.6)
			]
		},
		centreOfMass: { x: 0, y: 1.3, z: 0.3 },
		wingArea: 0,
		stallSpeed: 0,
		maxSpeed: 70,
		thrust: 2500 * 9.81 * 2,
		engine: "jet",
		spoolTime: 1,
		stallAngle: 0,
		stallRecovery: 0,
		pitchRate: 90,
		rollRate: 120,
		yawRate: 90,
		response: 0.3,
		flaps: { lift: 0, drag: 0 },
		gear: [],
		retractable: false,
		gearTime: 0,
		climbRate: 10,
		descentRate: 8,
		maxTilt: 32,
		levelTime: 0.5,
		spinUp: 4
	}
};
