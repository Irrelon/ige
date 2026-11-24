import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysicsQuat, IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import { type IgePhysicsBackendShape, type IgePhysicsBodyHandle, toBackendShape } from "@/engine/physics/IgePhysicsBackend";
import type {
	IgePhysicsVehicleOptions,
	IgePhysicsVehicleState,
	IgePhysicsWheelOptions
} from "@/engine/physics/IgePhysicsVehicle3dApi";

/*
 * Vehicles' part of the backend interface (IgePhysicsBackend.createVehicle()),
 * and the neutral description a vehicle is built from.
 *
 * IgePhysicsVehicle3d (the public object) fills in the options
 * (resolveVehicleSpec(), IGE units), shapes the input, interpolates, poses
 * wheels, reports impacts and handles network state on top of an
 * IgeVehicleBackend; a backend only simulates. Like the rest of the
 * backend interface, a backend works in SI units (metres, radians, kg,
 * N·m): vehicleBackendSpec() converts the spec, and IgePhysicsVehicle3d
 * converts what the backend reports. No physics library types appear here.
 */

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** One wheel, every option resolved (IGE units, radians). */
export interface IgeVehicleWheelSpec {
	/** Suspension's fixing point, relative to the entity's origin. */
	position: Vec3;
	radius: number;
	width: number;
	suspensionMin: number;
	suspensionMax: number;
	/** N/m. */
	stiffness: number;
	/** N·s/m. */
	damping: number;
	/** Radians either way. */
	maxSteer: number;
	/** Unit vector the wheel moves along as the suspension extends (down, and forward with caster). */
	suspensionDirection: Vec3;
	/** Unit vector the wheel steers around (up, and back with caster). */
	steeringAxis: Vec3;
	driven: boolean;
	/** N·m. */
	brakeTorque: number;
	/** N·m (0: no handbrake). */
	handbrakeTorque: number;
	/** Tyre grip multiplier. */
	grip: number;
	entity?: IgeEntity;
}

/** The drivetrain, the same in IGE units and metres. */
interface IgeVehicleDrivetrain {
	type: "car" | "motorcycle";
	mass: number;
	/** Driven wheels in pairs (-1: none on that side), each sharing the engine's torque equally. */
	differentials: { left: number; right: number }[];
	antiRollBars: { left: number; right: number; stiffness: number }[];
	engine: { maxTorque: number; minRpm: number; maxRpm: number };
	gearbox: {
		mode: "auto" | "manual";
		ratios: number[];
		reverseRatios: number[];
		finalDrive: number;
		shiftUpRpm: number;
		shiftDownRpm: number;
		shiftTime: number;
	};
	friction: number;
	/** Share of sideways grip the handbrake's wheels keep while it's fully on. */
	handbrakeGrip: number;
	/** Radians. */
	maxLean: number;
	/** Radians (Math.PI: no limit). */
	maxTilt: number;
	wheelCast: "cylinder" | "ray";
}

/** A vehicle, every option resolved (IGE units, radians). */
export interface IgeVehicleSpec extends IgeVehicleDrivetrain {
	layer?: string;
	unitsPerMetre: number;
	/** Collision shape, already offset from the entity's origin. */
	chassis: IgePhysicsShape;
	centreOfMass: Vec3;
	wheels: IgeVehicleWheelSpec[];
	steering: { rate: number; highSpeed: number; highSpeedLock: number };
	reverseOnBrake: boolean;
	tractionControl: boolean;
	extrapolate: number;
	/** Velocity change (IGE units per second) in a step that emits "impact" (0: none). */
	impacts: number;
	/** Radians per second squared (0: none). */
	airControl: number;
	selfRighting: number;
	weightShift: number;
}

/** One wheel as a backend builds it (metres, radians). */
export interface IgeVehicleBackendWheel {
	/** Suspension's fixing point, relative to the chassis' origin (the entity's). */
	position: Vec3;
	radius: number;
	width: number;
	suspensionMin: number;
	suspensionMax: number;
	/** N/m. */
	stiffness: number;
	/** N·s/m. */
	damping: number;
	/** Radians either way. */
	maxSteer: number;
	suspensionDirection: Vec3;
	steeringAxis: Vec3;
	driven: boolean;
	brakeTorque: number;
	handbrakeTorque: number;
	grip: number;
}

/**
 * A vehicle as a backend builds it (metres, radians, kg, N·m). Its
 * chassis is a dynamic body that can switch to kinematic, with the mass
 * given (inertia from the shape) and its centre of mass where it says.
 */
export interface IgeVehicleBackendSpec extends IgeVehicleDrivetrain {
	/** Collision layer index; the wheels touch what it collides with. */
	layer: number;
	/** Relative to the entity's origin. */
	chassis: IgePhysicsBackendShape;
	centreOfMass: Vec3;
	wheels: IgeVehicleBackendWheel[];
}

/** One wheel after a step, as a backend reports it (metres, radians). */
export interface IgeVehicleWheelSample {
	/** Distance from the fixing point to the wheel's centre. */
	suspensionLength: number;
	/** Radians around the wheel's steering axis (right-hand rule: negative is turned right). */
	steerAngle: number;
	/** Radians around the axle, increasing as it rolls forward (may wrap). */
	spinAngle: number;
	/** Radians per second, positive rolling forward. */
	spin: number;
	contact: boolean;
	point: Vec3;
	normal: Vec3;
	/** Metres per second (see IgePhysicsWheelReadout). */
	longitudinalSlip: number;
	lateralSlip: number;
	/** The body it stands on, when in contact. */
	ground: IgePhysicsBodyHandle | null;
}

/** The chassis and drivetrain state a backend restores (metres, radians). */
export interface IgeVehicleBackendState {
	/** The entity's origin. */
	position: Vec3;
	rotation: Quat;
	velocity: Vec3;
	angularVelocity: Vec3;
	rpm?: number;
	gear?: number;
	wheelSpin?: number[];
}

/**
 * One vehicle in a physics backend (IgePhysicsBackend.createVehicle()).
 * The world calls preStep() before each fixed step and the vehicle reads
 * it back after. Everything is in metres and radians.
 */
export interface IgeVehicleBackend {
	/** The chassis: raycasts, sensors, impacts and other vehicles' wheels meet it. */
	readonly body: IgePhysicsBodyHandle;
	/** Controls for the coming steps, already shaped (forward -1..1, right -1..1, brake 0..1, handbrake 0..1). */
	setInput (forward: number, right: number, brake: number, handbrake: number): void;
	/** Just before each fixed step of dt seconds. */
	preStep (dt: number): void;
	/** Chassis pose after the last step: the entity origin's x, y, z and rotation qx, qy, qz, qw. */
	readPose (out: Float64Array): void;
	/** Chassis velocity (metres per second) and angular velocity (radians per second). */
	readVelocity (linear: Vec3, angular: Vec3): void;
	readWheel (index: number, out: IgeVehicleWheelSample): void;
	rpm (): number;
	gear (): number;
	/** Manual gearboxes. */
	shift (gear: number): void;
	/** Put the chassis at this pose with these velocities, and the drivetrain in this state. */
	setState (state: IgeVehicleBackendState): void;
	/**
	 * Kinematic: the simulation stops driving the chassis, which goes where
	 * moveKinematic() sends it, still pushing dynamic bodies; the wheels
	 * keep finding the ground, steering with setInput() and rolling with
	 * the chassis' speed.
	 */
	setKinematic (on: boolean): void;
	/** Kinematic only: arrive at this pose (the entity origin's) at the end of the next step of dt seconds. */
	moveKinematic (position: Vec3, rotation: Quat, dt: number): void;
	setEnabled (on: boolean): void;
	/** Add to the chassis' angular velocity (radians per second, world axes), waking it: air control, self-righting, weight shift. */
	addAngularVelocity (change: Vec3): void;
	/**
	 * Balance on (as made) or off. Off, a motorcycle's lean controller
	 * stops holding it up and the pitch and roll limit (maxTilt) goes, so it
	 * falls over like any body; on, both come back.
	 */
	setUpright (on: boolean): void;
	/** Remove everything from the world and free it. */
	destroy (): void;
}

/** What a vehicle needs from the world it's in. */
export interface IgeVehicleHost {
	unitsPerMetre (): number;
	removeVehicle (vehicle: any): void;
	/** The entity whose body this is, if it has one. */
	_entityOfBody (body: IgePhysicsBodyHandle): IgeEntity | null;
}

const DEG = Math.PI / 180;

/** Default wheels in metres, before scaling to IGE units. */
interface DefaultWheel extends Omit<IgePhysicsWheelOptions, "entity"> {
	/** Bounce frequency for the default stiffness (Hz). */
	frequency?: number;
}

const CAR_WHEEL_Y = 0.53;
const DEFAULT_CAR = {
	mass: 1300,
	// Body and cabin (see defaultCarChassis()), the origin on the ground under the middle
	chassis: {
		type: "compound",
		children: [
			{ shape: { type: "box", halfExtents: { x: 0.85, y: 0.28, z: 2.2 } }, position: { x: 0, y: 0.68, z: 0 } },
			{ shape: { type: "box", halfExtents: { x: 0.75, y: 0.25, z: 1.05 } }, position: { x: 0, y: 1.21, z: -0.25 } }
		]
	} as IgePhysicsShape,
	wheels: [
		{ position: { x: 0.78, y: CAR_WHEEL_Y, z: 1.35 }, steer: 32 },
		{ position: { x: -0.78, y: CAR_WHEEL_Y, z: 1.35 }, steer: 32 },
		{ position: { x: 0.78, y: CAR_WHEEL_Y, z: -1.3 } },
		{ position: { x: -0.78, y: CAR_WHEEL_Y, z: -1.3 } }
	] as DefaultWheel[],
	wheel: { radius: 0.34, width: 0.22, suspensionMin: 0.1, suspensionMax: 0.3, brakeTorque: 1500, handbrakeTorque: 4000 },
	engine: { maxTorque: 500, minRpm: 1000, maxRpm: 6500 },
	finalDrive: 3.42,
	shiftUpRpm: 5000,
	steering: { rate: 4, highSpeed: 30, highSpeedLock: 0.35 },
	maxTilt: 180,
	centreOfMass: undefined as Vec3 | undefined
};

const BIKE_WHEEL_Y = 0.7;
const DEFAULT_MOTORCYCLE = {
	mass: 240,
	chassis: { type: "box", halfExtents: { x: 0.2, y: 0.3, z: 0.4 } } as IgePhysicsShape,
	chassisOffset: { x: 0, y: 0.97, z: 0 },
	wheels: [
		{ position: { x: 0, y: BIKE_WHEEL_Y, z: 0.75 }, steer: 30, caster: 30, brakeTorque: 500, handbrake: false, frequency: 1.5 },
		{ position: { x: 0, y: BIKE_WHEEL_Y, z: -0.75 }, brakeTorque: 250, handbrake: 500, frequency: 2 }
	] as DefaultWheel[],
	wheel: { radius: 0.31, width: 0.08, suspensionMin: 0.3, suspensionMax: 0.5, brakeTorque: 500, handbrakeTorque: 500 },
	engine: { maxTorque: 150, minRpm: 1000, maxRpm: 10000 },
	finalDrive: 1.93 * 40 / 16,
	shiftUpRpm: 8000,
	steering: { rate: 4, highSpeed: 30, highSpeedLock: 0.5 },
	maxTilt: 60,
	centreOfMass: { x: 0, y: 0.68, z: 0 } as Vec3 | undefined
};

function scaled (v: Vec3, s: number): Vec3 {
	return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function normalised (x: number, y: number, z: number): Vec3 {
	const len = Math.hypot(x, y, z) || 1;
	return { x: x / len, y: y / len, z: z / len };
}

/**
 * Fill in every option of a vehicle, in IGE units (the defaults are in
 * metres, scaled by unitsPerMetre), and work out its differentials and
 * anti-roll bars from where the wheels are.
 */
export function resolveVehicleSpec (options: IgePhysicsVehicleOptions, unitsPerMetre: number): IgeVehicleSpec {
	const u = unitsPerMetre;
	const type = options.type ?? "car";
	const base = type === "motorcycle" ? DEFAULT_MOTORCYCLE : DEFAULT_CAR;
	const mass = options.mass ?? base.mass;

	// Wheels: the user's in IGE units, or the defaults scaled from metres
	const given = options.wheels;
	const wheelOptions: DefaultWheel[] = given?.length
		? given
		: base.wheels.map((w) => ({ ...w, position: scaled(w.position, u) }));
	if (!wheelOptions.length) throw new Error("IgePhysics3d: a vehicle needs at least one wheel");
	if (type === "motorcycle" && wheelOptions.length !== 2) throw new Error("IgePhysics3d: a motorcycle needs two wheels");
	const wheelMass = mass / wheelOptions.length;

	// Front and rear: either side of the middle of the wheelbase
	const zs = wheelOptions.map((w) => w.position.z);
	const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
	const drive = options.drive ?? "rear";
	const grip = options.grip ?? 1.2;
	const d = base.wheel;

	const wheels: IgeVehicleWheelSpec[] = wheelOptions.map((w, index) => {
		const isFront = wheelOptions.length > 1 && w.position.z > midZ + 1e-6;
		const isRear = wheelOptions.length > 1 && w.position.z < midZ - 1e-6;
		const stiffness = w.suspensionStiffness ?? wheelMass * (2 * Math.PI * (w.frequency ?? 1.5)) ** 2;
		const damping = w.suspensionDamping ?? 2 * 0.5 * Math.sqrt(stiffness * wheelMass);
		const caster = (w.caster ?? 0) * DEG;
		const driven = w.driven ?? (drive === "all" || (drive === "front" ? isFront : isRear) || (!isFront && !isRear));
		const handbrake = w.handbrake ?? isRear;
		const handbrakeTorque = handbrake === true ? d.handbrakeTorque : handbrake === false ? 0 : handbrake;
		if (!(w.radius ?? 1) || (w.suspensionMax ?? 1) < (w.suspensionMin ?? 0)) {
			throw new Error(`IgePhysics3d: wheel ${index} needs a radius and suspensionMax >= suspensionMin`);
		}
		return {
			position: { ...w.position },
			radius: w.radius ?? d.radius * u,
			width: w.width ?? d.width * u,
			suspensionMin: w.suspensionMin ?? d.suspensionMin * u,
			suspensionMax: w.suspensionMax ?? d.suspensionMax * u,
			stiffness,
			damping,
			maxSteer: Math.min(Math.abs(w.steer ?? 0), 89) * DEG,
			suspensionDirection: normalised(0, -1, Math.tan(caster)),
			steeringAxis: normalised(0, 1, -Math.tan(caster)),
			driven,
			brakeTorque: w.brakeTorque ?? d.brakeTorque,
			handbrakeTorque,
			grip: w.grip ?? grip,
			entity: (w as IgePhysicsWheelOptions).entity
		};
	});

	// Axles: wheels level with each other (within a wheel's radius), left (+X) to right
	const axles: number[][] = [];
	wheels.forEach((wheel, index) => {
		const axle = axles.find((a) => Math.abs(wheels[a[0]].position.z - wheel.position.z) < wheel.radius);
		if (axle) axle.push(index);
		else axles.push([index]);
	});
	for (const axle of axles) axle.sort((a, b) => wheels[b].position.x - wheels[a].position.x);

	// A differential per pair of driven wheels on an axle (outermost first)
	const differentials: { left: number; right: number }[] = [];
	for (const axle of axles) {
		const driven = axle.filter((i) => wheels[i].driven);
		while (driven.length) {
			const left = driven.shift()!;
			const right = driven.pop();
			if (right === undefined) {
				// A lone wheel (a motorcycle's): on the right if it's right of centre
				differentials.push(wheels[left].position.x < 0 ? { left: -1, right: left } : { left, right: -1 });
			} else {
				differentials.push({ left, right });
			}
		}
	}

	// An anti-roll bar across each axle with wheels on both sides
	const antiRoll = options.antiRoll ?? 10000;
	const antiRollBars = antiRoll > 0
		? axles.filter((a) => a.length >= 2).map((a) => ({ left: a[0], right: a[a.length - 1], stiffness: antiRoll }))
		: [];

	// The chassis, moved off the origin by its offset
	const defaultShape = !options.chassis;
	let chassis = options.chassis ?? (type === "car" ? defaultCarChassis(u, wheels) : scaleShape(base.chassis, u));
	const baseOffset = (base as typeof DEFAULT_MOTORCYCLE).chassisOffset;
	const offset = options.chassisOffset ?? (defaultShape && baseOffset ? scaled(baseOffset, u) : undefined);
	if (offset && (offset.x || offset.y || offset.z)) {
		chassis = { type: "compound", children: [{ shape: chassis, position: { ...offset } }] };
	}

	// The default chassis has its own centre of mass (a motorcycle's is
	// high, with its rider); otherwise low: midway between the wheels, at
	// the height of their centres
	let centreOfMass = options.centreOfMass;
	if (!centreOfMass && base.centreOfMass && defaultShape) centreOfMass = scaled(base.centreOfMass, u);
	if (!centreOfMass) {
		let x = 0, y = 0, z = 0;
		for (const wheel of wheels) {
			x += wheel.position.x;
			y += wheel.position.y - (wheel.suspensionMin + wheel.suspensionMax) / 2;
			z += wheel.position.z;
		}
		centreOfMass = { x: x / wheels.length, y: y / wheels.length, z: z / wheels.length };
	}

	const gearbox = options.gearbox ?? {};
	const engine = {
		maxTorque: options.engine?.maxTorque ?? base.engine.maxTorque,
		minRpm: options.engine?.minRpm ?? base.engine.minRpm,
		maxRpm: options.engine?.maxRpm ?? base.engine.maxRpm
	};
	const steering = options.steering ?? {};
	return {
		type,
		layer: options.layer,
		unitsPerMetre: u,
		mass,
		chassis,
		centreOfMass: { ...centreOfMass },
		wheels,
		differentials,
		antiRollBars,
		engine,
		gearbox: {
			mode: gearbox.mode ?? "auto",
			ratios: gearbox.ratios?.length ? [...gearbox.ratios] : [2.66, 1.78, 1.3, 1.0, 0.74],
			reverseRatios: gearbox.reverseRatios?.length ? gearbox.reverseRatios.map((r) => Math.abs(r)) : [2.9],
			finalDrive: gearbox.finalDrive ?? base.finalDrive,
			shiftUpRpm: Math.min(gearbox.shiftUpRpm ?? base.shiftUpRpm, engine.maxRpm - 1),
			shiftDownRpm: gearbox.shiftDownRpm ?? 2000,
			shiftTime: gearbox.shiftTime ?? 0.2
		},
		friction: options.friction ?? 0.4,
		handbrakeGrip: Math.max(0, Math.min(1, options.handbrakeGrip ?? 0.4)),
		maxLean: (options.maxLean ?? 45) * DEG,
		maxTilt: Math.min(options.maxTilt ?? base.maxTilt, 180) * DEG,
		wheelCast: options.wheelCast ?? "cylinder",
		steering: {
			rate: steering.rate ?? base.steering.rate,
			highSpeed: steering.highSpeed ?? base.steering.highSpeed * u,
			highSpeedLock: steering.highSpeedLock ?? base.steering.highSpeedLock
		},
		reverseOnBrake: options.reverseOnBrake ?? true,
		tractionControl: options.tractionControl ?? type === "car",
		extrapolate: options.extrapolate ?? 0.25,
		impacts: options.impacts === true ? DEFAULT_IMPACT * u : options.impacts ? options.impacts : 0,
		airControl: Math.max(0, options.airControl ?? 300) * DEG,
		selfRighting: type === "car" ? Math.max(0, options.selfRighting ?? 1200) * DEG : 0,
		weightShift: type === "motorcycle" ? Math.max(0, options.weightShift ?? 6000) * DEG : 0
	};
}

/** Velocity change (metres per second) in a step that counts as an impact with `impacts: true`. */
const DEFAULT_IMPACT = 1;

/**
 * The default car's body and cabin, the body at least as wide as the
 * wheels' outer faces so a wheel side-on to a wall can't poke into it
 * (the wheels are casts, not bodies; the chassis is what hits things).
 */
function defaultCarChassis (u: number, wheels: IgeVehicleWheelSpec[]): IgePhysicsShape {
	const base = DEFAULT_CAR.chassis as Extract<IgePhysicsShape, { type: "compound" }>;
	const outer = Math.max(0, ...wheels.map((w) => Math.abs(w.position.x) + w.width / 2));
	const shape = scaleShape(base, u) as Extract<IgePhysicsShape, { type: "compound" }>;
	const body = shape.children[0].shape as Extract<IgePhysicsShape, { type: "box" }>;
	body.halfExtents.x = Math.max(body.halfExtents.x, outer + 0.01 * u);
	return shape;
}

/** A spec in the backend's units: metres, with the layer as an index. */
export function vehicleBackendSpec (spec: IgeVehicleSpec, layer: number): IgeVehicleBackendSpec {
	const u = spec.unitsPerMetre;
	const metres = (v: Vec3): Vec3 => ({ x: v.x / u, y: v.y / u, z: v.z / u });
	return {
		type: spec.type,
		layer,
		mass: spec.mass,
		chassis: toBackendShape(spec.chassis, { x: 1, y: 1, z: 1 }, u),
		centreOfMass: metres(spec.centreOfMass),
		wheels: spec.wheels.map((w) => ({
			position: metres(w.position),
			radius: w.radius / u,
			width: w.width / u,
			suspensionMin: w.suspensionMin / u,
			suspensionMax: w.suspensionMax / u,
			stiffness: w.stiffness,
			damping: w.damping,
			maxSteer: w.maxSteer,
			suspensionDirection: { ...w.suspensionDirection },
			steeringAxis: { ...w.steeringAxis },
			driven: w.driven,
			brakeTorque: w.brakeTorque,
			handbrakeTorque: w.handbrakeTorque,
			grip: w.grip
		})),
		differentials: spec.differentials.map((d) => ({ ...d })),
		antiRollBars: spec.antiRollBars.map((a) => ({ ...a })),
		engine: { ...spec.engine },
		gearbox: { ...spec.gearbox, ratios: [...spec.gearbox.ratios], reverseRatios: [...spec.gearbox.reverseRatios] },
		friction: spec.friction,
		handbrakeGrip: spec.handbrakeGrip,
		maxLean: spec.maxLean,
		maxTilt: spec.maxTilt,
		wheelCast: spec.wheelCast
	};
}

/** A shape in metres scaled to IGE units. */
function scaleShape (shape: IgePhysicsShape, u: number): IgePhysicsShape {
	switch (shape.type) {
		case "box":
			return { type: "box", halfExtents: scaled(shape.halfExtents, u) };
		case "sphere":
			return { type: "sphere", radius: shape.radius * u };
		case "capsule":
			return { type: "capsule", radius: shape.radius * u, halfHeight: shape.halfHeight * u };
		case "compound":
			return {
				type: "compound",
				children: shape.children.map((c) => ({ ...c, shape: scaleShape(c.shape, u), position: c.position && scaled(c.position, u) }))
			};
		default:
			return shape;
	}
}

/** Copy a state (deep, plain numbers), filling what's missing from fallback. */
export function copyVehicleState (state: IgePhysicsVehicleState, out?: IgePhysicsVehicleState): IgePhysicsVehicleState {
	const zero = { x: 0, y: 0, z: 0 };
	const v = state.velocity ?? zero, a = state.angularVelocity ?? zero;
	const target = out ?? {
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0, w: 1 },
		velocity: { x: 0, y: 0, z: 0 },
		angularVelocity: { x: 0, y: 0, z: 0 }
	};
	target.position = { x: state.position.x, y: state.position.y, z: state.position.z };
	target.rotation = { x: state.rotation.x, y: state.rotation.y, z: state.rotation.z, w: state.rotation.w };
	target.velocity = { x: v.x, y: v.y, z: v.z };
	target.angularVelocity = { x: a.x, y: a.y, z: a.z };
	target.rpm = state.rpm;
	target.gear = state.gear;
	target.steer = state.steer;
	target.input = state.input ? { ...state.input } : undefined;
	target.wheelSpin = state.wheelSpin ? [...state.wheelSpin] : undefined;
	target.upright = state.upright;
	return target;
}
