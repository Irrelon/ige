import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysicsImpact, IgePhysicsQuat, IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";

export type { IgePhysicsQuat, IgePhysicsVec3 };

/*
 * The public API for boats, aircraft and floating bodies, in engine terms
 * only: IGE units, plain objects and numbers, IGE entities. Flight and
 * buoyancy are worked out in engine-neutral code that pushes the body with
 * forces and torques through the physics backend, so nothing here depends
 * on the physics library underneath (Jolt today).
 *
 * Units, as for vehicles: distances in IGE units, speeds in IGE units per
 * second, angles in degrees and turn rates in degrees per second. Masses,
 * forces and areas are real-world values (kg, N, m²), so real figures work.
 *
 * Axes: a craft faces +Z of its entity with +Y up, so its left is +X and
 * its right is -X (glTF's convention, as for vehicles).
 */

/** A buoyancy sample point: a column of hull that floats. */
export interface IgePhysicsFloatPoint {
	/** Its centre relative to the entity's origin (IGE units). */
	position: IgePhysicsVec3;
	/** Cubic metres of water it displaces fully under (default: the volume shared equally between the points). */
	volume?: number;
	/** How tall the column is (IGE units): it's fully under when the water is this far over its bottom. */
	height?: number;
}

/** Water drag on a floating body, as rates per second (0: none). */
export interface IgePhysicsWaterDrag {
	/** Sideways (along the body's X), vertical (Y) and forwards (Z), per second at full depth. */
	x?: number;
	y?: number;
	z?: number;
	/** Turning, per second at full depth. */
	angular?: number;
}

/** Make any dynamic body float (or sink) by its density: IgePhysics3d.addBuoyancy(). */
export interface IgePhysicsBuoyancyOptions {
	/**
	 * Cubic metres the body displaces fully under water. Default: its mass
	 * over the density it was made with, so a body lighter than water
	 * floats and a heavier one sinks.
	 */
	volume?: number;
	/** Where it floats from. Default: eight points, one in each corner of its shape's box. */
	points?: IgePhysicsFloatPoint[];
	/** Water drag, per second (default 1 each way, 1 turning). */
	drag?: IgePhysicsWaterDrag;
}

/** A floating body (IgePhysics3d.addBuoyancy()). */
export interface IgePhysicsBuoyancy3dApi {
	/** Share of its volume under water after the last step, 0..1. */
	submerged (): number;
	/** Whether any of it is in the water. */
	inWater (): boolean;
	/** Stop floating it (the body stays). */
	destroy (): void;
}

/** A boat's driver's controls. */
export interface IgePhysicsBoatInput {
	/** -1..1: ahead, astern (reverse) below 0. */
	throttle: number;
	/** -1..1: rudder, 1 turns right. */
	steer: number;
}

export type IgePhysicsBoatPreset = "speedboat" | "fishingBoat" | "yacht" | "cargoShip";

export interface IgePhysicsBoatOptions {
	/** A starting point: every option below falls back to it (default "speedboat"). */
	preset?: IgePhysicsBoatPreset;
	/** Collision layer (default "moving"). */
	layer?: string;
	/** kg. */
	mass?: number;
	/**
	 * The hull's box (IGE units): length (along Z), width and height (keel
	 * to deck). The entity's origin is on the keel under the hull's middle.
	 * Buoyancy points are spread over it unless `points` are given.
	 */
	hull?: { length: number; width: number; height: number };
	/** Collision shape (IGE units, relative to the entity's origin). Default: the hull box and a cabin. */
	shape?: IgePhysicsShape;
	/** Centre of mass from the entity's origin (default: low in the hull, a little aft). */
	centreOfMass?: IgePhysicsVec3;
	/** Cubic metres the hull displaces fully under (default: the hull box, a little less for the bow's shape). */
	volume?: number;
	/** Buoyancy sample points (default: a grid over the hull). */
	points?: IgePhysicsFloatPoint[];
	/** Top speed, IGE units per second. */
	maxSpeed?: number;
	/** The propeller's push at full throttle, newtons. */
	thrust?: number;
	/** Share of the thrust going astern (default 0.4). */
	reverse?: number;
	/** Where the propeller is (IGE units): it only pushes while under water. Default: at the stern, under the keel line. */
	propeller?: IgePhysicsVec3;
	/** Fastest turn with full rudder, degrees per second. */
	turnRate?: number;
	/** Speed (IGE units per second) by which the rudder has full effect; slower, it turns less. */
	turnSpeed?: number;
	/** Degrees it leans into a full turn at speed (default by preset). */
	bank?: number;
	/** Planing: how much of the weight the hull lifts out of the water at speed (0..1) and how far the bow rises (degrees), most at planingSpeed. */
	planing?: { lift?: number; bowRise?: number; speed?: number };
	/** How hard it rights itself (degrees per second squared per degree of tilt; 0 for none). Hard to capsize, and back up if it does. */
	stability?: number;
	/** Water drag, per second (sideways, vertical, turning). */
	drag?: IgePhysicsWaterDrag;
	/** Friction against what it scrapes along (default 0.3). */
	friction?: number;
	/** Kinematic mode: how long (seconds) it carries on along the last state's velocity (default 0.25). */
	extrapolate?: number;
	/** "impact" events past this velocity change in a step (IGE units per second; true: 1 m/s). */
	impacts?: boolean | number;
	/** A propeller entity to spin about its Z axis (mount it on the boat's entity). */
	propellerEntity?: IgeEntity;
}

/** What a "landed" event reports for a boat or aircraft. */
export interface IgePhysicsCraftLanding {
	/** Seconds in the air. */
	airTime: number;
	/** How fast it was coming down (IGE units per second, positive downwards). */
	speed: number;
	/** Its velocity just before (IGE units per second). */
	velocity: IgePhysicsVec3;
	/** Degrees from upright when it came down. */
	tilt: number;
	/** On its landing gear: wheels, skids or floats (false: on its body). */
	onGear: boolean;
	/** Into water. */
	onWater: boolean;
}

/**
 * A craft's state as plain numbers, safe to send or keep as JSON.
 * getState() fills every field; setState() needs position and rotation.
 */
export interface IgePhysicsCraftState {
	/** The entity's origin, world IGE units. */
	position: IgePhysicsVec3;
	rotation: IgePhysicsQuat;
	/** IGE units per second. */
	velocity: IgePhysicsVec3;
	/** Radians per second around each world axis. */
	angularVelocity: IgePhysicsVec3;
	/** The held controls. */
	input?: Record<string, number | boolean>;
	/** The engine: 0..1 (it spools up and down towards the throttle). */
	engine?: number;
	/** Helicopters: rotor speed 0..1. */
	rotor?: number;
	/** Landing gear: 0 up, 1 down. */
	gear?: number;
	/** Flaps: 0..1. */
	flaps?: number;
}

/** What's common to boats and aircraft. */
export interface IgePhysicsCraft3dApi {
	readonly entity: IgeEntity;
	readonly kind: "boat" | "plane" | "helicopter";

	/** Speed along its facing, IGE units per second (negative going backwards). */
	speed (): number;
	/** speed() in km/h. */
	speedKmh (): number;
	velocity (): IgePhysicsVec3;
	angularVelocity (): IgePhysicsVec3;
	/** Degrees from upright. */
	tilt (): number;
	/** Pitch (nose up), roll (right side down) and heading (0 along +Z, 90 towards +X), degrees. */
	attitude (): { pitch: number; roll: number; heading: number };
	/** In the air: nothing touched, no gear on the ground, not in water. */
	airborne (): boolean;
	/** Share of its floats or hull under water, 0..1 (0 for craft that don't float). */
	submerged (): number;

	getState (out?: IgePhysicsCraftState): IgePhysicsCraftState;
	setState (state: IgePhysicsCraftState): this;
	/** Gets / sets kinematic mode: it follows the states given to setState() (a craft flown on another machine). */
	kinematic (): boolean;
	kinematic (val: boolean): this;
	enabled (): boolean;
	enabled (val: boolean): this;
	destroy (): void;

	/** "impact" (with `impacts`): it hit something, or something hit it. */
	on (eventName: "impact", listener: (impact: IgePhysicsImpact) => void): this;
	/** "landed": it came down after at least a quarter of a second in the air, on the ground or into water. */
	on (eventName: "landed", listener: (landing: IgePhysicsCraftLanding) => void): this;
	off (eventName: "impact" | "landed", listener?: (...args: any[]) => void): this;
}

/** A boat (IgePhysics3d.addBoat()). */
export interface IgePhysicsBoat3dApi extends IgePhysicsCraft3dApi {
	/** Hold these controls until told otherwise (fields left out are 0). */
	drive (input: Partial<IgePhysicsBoatInput>): this;
	input (): IgePhysicsBoatInput;
	/** Whether the propeller is in the water. */
	propellerInWater (): boolean;
}

/** One landing-gear wheel (or float) of a plane: a sprung strut found by a ray down to the ground. */
export interface IgePhysicsGearOptions {
	/** Where the strut is fixed, relative to the entity's origin (IGE units). The wheel hangs below it. */
	position: IgePhysicsVec3;
	/** Wheel radius (IGE units). */
	radius?: number;
	/** How far the strut compresses (IGE units). */
	travel?: number;
	/** Spring rate N/m (default: a 1.5 Hz bounce for its share of the weight). */
	stiffness?: number;
	/** Damper N·s/m (default: half critical). */
	damping?: number;
	/** Most it steers either way (degrees): a nose wheel. */
	steer?: number;
	/** Whether the brakes hold it (main wheels; default: wheels that don't steer). */
	brake?: boolean;
	/** An entity posed every frame (compression, steering and spin; hidden when the gear is up). Mount it on the aircraft's entity; its axle along X. */
	entity?: IgeEntity;
}

export type IgePhysicsAircraftPreset = "lightPlane" | "floatplane" | "jet" | "airliner" | "helicopter";

export interface IgePhysicsAircraftOptions {
	/** "plane" or "helicopter" (default from the preset). */
	type?: "plane" | "helicopter";
	/** A starting point: every option below falls back to it (default "lightPlane", or "helicopter"). */
	preset?: IgePhysicsAircraftPreset;
	layer?: string;
	/** kg. */
	mass?: number;
	/** Collision shape (IGE units, relative to the entity's origin). */
	shape?: IgePhysicsShape;
	/** Centre of mass from the entity's origin. */
	centreOfMass?: IgePhysicsVec3;
	/** Wing area, m². */
	wingArea?: number;
	/** Stalls below this airspeed in level flight, flaps up (IGE units per second). */
	stallSpeed?: number;
	/** Level flight at full throttle (IGE units per second). */
	maxSpeed?: number;
	/** Most thrust, newtons (helicopters: the rotor's most lift, newtons). */
	thrust?: number;
	/** "propeller" (thrust falls off with speed, quick to respond) or "jet" (steady thrust, slow to spool). */
	engine?: "propeller" | "jet";
	/** Seconds the engine takes to go from idle to full. */
	spoolTime?: number;
	/** Wing angle of attack at which it stalls, degrees (default 20). */
	stallAngle?: number;
	/** Seconds a stall lasts: the nose drops by itself and the wing flies again in about this long (default 1). */
	stallRecovery?: number;
	/** Turn rates at full stick, degrees per second: pitch, roll and yaw. */
	pitchRate?: number;
	rollRate?: number;
	yawRate?: number;
	/** Seconds it takes to reach a turn rate (airliners are slow to answer). */
	response?: number;
	/** Airspeed (IGE units per second) from which the controls have full effect (default 1.3 times the stall speed). */
	controlSpeed?: number;
	/** Flaps at full: extra lift (share of the clean wing's most) and drag. */
	flaps?: { lift?: number; drag?: number };
	/** Landing gear wheels (none: it lands on its body, or on floats). Default: the preset's. */
	gear?: IgePhysicsGearOptions[];
	/** Entities to pose on the preset's wheels, in order (when `gear` isn't given): wheel models. */
	gearEntities?: IgeEntity[];
	/** Whether the gear retracts (default true for planes with wheels). */
	retractable?: boolean;
	/** Seconds to raise or lower the gear. */
	gearTime?: number;
	/** Floats (a floatplane): buoyancy points under its pontoons. */
	floats?: { points: IgePhysicsFloatPoint[]; volume: number; drag?: IgePhysicsWaterDrag };
	/**
	 * Arcade help (default true). Planes: wings and nose level themselves when the stick is let go, banked turns are
	 * coordinated, a hard pull at speed flies at the edge of the stall rather than over it, and low over the ground
	 * (or water, on floats) with the gear down and sinking it flares for you. Helicopters: hover holds height, and let
	 * go of the cyclic it levels and stops its drift.
	 */
	assists?: boolean;
	/** Helicopters: climb and descent rates at full collective (IGE units per second) and the most it tilts (degrees). */
	climbRate?: number;
	descentRate?: number;
	maxTilt?: number;
	/** Helicopters: seconds it takes to level once the cyclic is let go (default 0.5). */
	levelTime?: number;
	/** Helicopters: seconds for the rotor to spin up. */
	spinUp?: number;
	/** Friction against what it scrapes along (default 0.5). */
	friction?: number;
	/** Kinematic mode: how long (seconds) it carries on along the last state's velocity (default 0.25). */
	extrapolate?: number;
	/** "impact" events past this velocity change in a step (IGE units per second; true: 1 m/s). */
	impacts?: boolean | number;
	/** A propeller (planes) or main rotor (helicopters) entity spun about its own Z (propeller) or Y (rotor) axis. */
	rotorEntity?: IgeEntity;
	/** A helicopter's tail rotor, spun about its X axis. */
	tailRotorEntity?: IgeEntity;
}

/** The pilot's controls. Sticks and brake are 0 when left out; the levers (throttle, flaps, gear, engine) stay where they were. */
export interface IgePhysicsAircraftInput {
	/** Lever 0..1 (planes). */
	throttle: number;
	/** -1..1: 1 pushes the nose down (stick forward), -1 pulls it up. */
	pitch: number;
	/** -1..1: 1 rolls right (right wing down). */
	roll: number;
	/** -1..1: 1 turns the nose right (rudder or tail rotor; the nose wheel on the ground). */
	yaw: number;
	/** -1..1, helicopters: 1 climbs, -1 descends; 0 holds height (with assists). */
	collective: number;
	/** Lever 0..1. */
	flaps: number;
	/** Lever: true down, false up. */
	gear: boolean;
	/** 0..1: wheel brakes. */
	brake: number;
	/** Lever: the engine running (default true). */
	engine: boolean;
}

/** A plane or helicopter (IgePhysics3d.addAircraft()). */
export interface IgePhysicsAircraft3dApi extends IgePhysicsCraft3dApi {
	readonly type: "plane" | "helicopter";
	/** Set the controls (see IgePhysicsAircraftInput for what's held). Call it every frame from input. */
	fly (input: Partial<IgePhysicsAircraftInput>): this;
	input (): IgePhysicsAircraftInput;
	/** Speed through the air, IGE units per second. */
	airspeed (): number;
	/** Height of its origin, IGE units (world Y). */
	altitude (): number;
	/** Height above whatever is below it (IGE units, up to a kilometre; Infinity above that). */
	heightAboveGround (): number;
	/** Climbing (positive) or sinking, IGE units per second. */
	verticalSpeed (): number;
	/** The wing's angle of attack, degrees. */
	angleOfAttack (): number;
	/** Whether the wing has stalled (planes in the air). */
	stalled (): boolean;
	/** The engine's output 0..1 (it follows the throttle over spoolTime). */
	engine (): number;
	/** Helicopters: rotor speed 0..1. */
	rotor (): number;
	/** Gear position: 0 up, 1 down. */
	gear (): number;
	gearDown (): boolean;
	/** Flap position 0..1. */
	flaps (): number;
	/** Any gear (or skid) on the ground. */
	grounded (): boolean;
	/** What one gear wheel is doing after the last step. */
	wheel (index: number): { contact: boolean; compression: number; spin: number; steer: number };
	wheelCount (): number;
}
