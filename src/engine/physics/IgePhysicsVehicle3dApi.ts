import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePhysicsImpact, IgePhysicsQuat, IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";

export type { IgePhysicsQuat, IgePhysicsVec3 };

/*
 * The public vehicle API, in engine terms only: IGE units, plain objects and
 * numbers, IGE entities. Nothing here depends on the physics library that
 * runs it (Jolt today), so another backend can implement the same calls.
 *
 * Units: distances in IGE units, speeds in IGE units per second, angles in
 * degrees (spin rates in radians per second). Masses, torques and spring
 * rates are real-world values (kg, N·m, N/m), so real vehicle specs work;
 * a spring rate is the same number whatever the IGE units per metre.
 *
 * Axes: a vehicle faces +Z of its entity with +Y up, so its left is +X and
 * its right is -X (glTF's convention, which most vehicle models use).
 */

/** One wheel. Positions are relative to the vehicle entity's origin. */
export interface IgePhysicsWheelOptions {
	/**
	 * Where the suspension is fixed to the chassis (IGE units). The wheel's
	 * centre hangs below this point, between suspensionMin (fully compressed)
	 * and suspensionMax (fully extended) away.
	 */
	position: IgePhysicsVec3;
	/** Default 0.34 m (a car), 0.31 m (a motorcycle). */
	radius?: number;
	/** Default 0.22 m (a car), 0.08 m (a motorcycle). */
	width?: number;
	/** Distance from position to the wheel's centre when fully compressed (default 0.1 m). */
	suspensionMin?: number;
	/** Distance from position to the wheel's centre when fully extended (default 0.3 m). */
	suspensionMax?: number;
	/**
	 * Spring rate in N/m (kg/s²). Default: a 1.5 Hz bounce for this wheel's
	 * share of the vehicle's mass (about 29,000 for a 1,300 kg car).
	 */
	suspensionStiffness?: number;
	/** Damper rate in N·s/m (kg/s). Default: half of critical damping for the stiffness. */
	suspensionDamping?: number;
	/** Most the wheel steers either way, in degrees (default 0: it doesn't steer). */
	steer?: number;
	/** How far the steering axis leans back, in degrees (motorcycle forks; default 0). */
	caster?: number;
	/** Whether the engine turns this wheel (default: from the vehicle's drive). */
	driven?: boolean;
	/** Most braking torque, N·m (default 1500 for a car). */
	brakeTorque?: number;
	/** Whether the handbrake holds this wheel, or its torque in N·m (default: the rear wheels, 4000). */
	handbrake?: boolean | number;
	/** Tyre grip multiplier (default the vehicle's grip). */
	grip?: number;
	/**
	 * An entity to pose every frame (steer, spin and suspension), e.g. the
	 * wheel's model. Mount it on the vehicle's entity. At rest its axle runs
	 * along X and it rolls towards +Z.
	 */
	entity?: IgeEntity;
}

export interface IgePhysicsVehicleOptions {
	/** "car" (4+ wheels: cars, vans, buses; default) or "motorcycle" (2 wheels that lean into turns). */
	type?: "car" | "motorcycle";
	/** Collision layer (default "moving"). The wheels touch what this layer collides with. */
	layer?: string;
	/** kg (default 1300 for a car, 240 for a motorcycle with its rider). */
	mass?: number;
	/**
	 * The body's collision shape (IGE units): a box, convex or compound
	 * shape. Default: a saloon's body and cabin (about 4.4 m x 1.7 m x
	 * 1.5 m) with the entity's origin on the ground under its middle.
	 */
	chassis?: IgePhysicsShape;
	/** Where the chassis shape's centre sits relative to the entity's origin (default 0, 0, 0). */
	chassisOffset?: IgePhysicsVec3;
	/**
	 * Centre of mass relative to the entity's origin. Default with your own
	 * chassis: midway between the wheels at the height of their centres,
	 * well below the body, so it's hard to roll over. The default chassis
	 * has its own (a saloon's, low; a motorcycle and rider's, 0.68 m up).
	 */
	centreOfMass?: IgePhysicsVec3;
	/** The wheels. Default: four for a car, two for a motorcycle, laid out for the default chassis. */
	wheels?: IgePhysicsWheelOptions[];
	/** Which wheels the engine drives, unless a wheel says otherwise (default "rear"). */
	drive?: "front" | "rear" | "all";
	engine?: {
		/** Peak torque, N·m (default 500 for a car, 150 for a motorcycle). */
		maxTorque?: number;
		/** Idle revs (default 1000). */
		minRpm?: number;
		/** Red line (default 6500 for a car, 10000 for a motorcycle). */
		maxRpm?: number;
	};
	gearbox?: {
		/** "auto" (default) shifts by itself; "manual" stays in the gear set with shift(). */
		mode?: "auto" | "manual";
		/** Forward gear ratios, first gear first (default 2.66, 1.78, 1.3, 1.0, 0.74). */
		ratios?: number[];
		/** Reverse gear ratios as positive numbers (default 2.9). */
		reverseRatios?: number[];
		/** Final drive (differential) ratio (default 3.42 for a car). */
		finalDrive?: number;
		/** Revs to shift up at (auto; default 5000 for a car). */
		shiftUpRpm?: number;
		/** Revs to shift down at (auto; default 2000). */
		shiftDownRpm?: number;
		/** Seconds a shift takes, with the engine disconnected (default 0.2). */
		shiftTime?: number;
		/**
		 * How hard the clutch grips, in N·m for each radian per second the
		 * engine turns faster than the wheels behind it. Too weak for the
		 * engine and it slips, so the revs run up and an automatic box
		 * changes up before the wheels catch up. Default: the engine's peak
		 * torque over 50 rad/s (about 480 rpm) of slip (10 for the default
		 * car); a motorcycle's over 75 rad/s.
		 */
		clutchStrength?: number;
	};
	/**
	 * Anti-roll bar rate for each axle in N/m (default 10000; 0 for none).
	 * The default car rolls under 2 degrees at 1.2 g with it. A bar too stiff
	 * for the simulation to keep steady at its step rate is limited to the
	 * stiffest it can (about 170,000 N/m for the default car at 60 steps a
	 * second).
	 */
	antiRoll?: number;
	/**
	 * Tyre grip multiplier (default 1.2: a little more than a road tyre).
	 * Grip 1 is a road tyre on ground of the default friction (0.5);
	 * slippery ground (lower friction) gives less.
	 */
	grip?: number;
	/**
	 * Combined tyre grip (a friction circle), 0..1: how much wheelspin and
	 * locked brakes use up a tyre's sideways grip. 1 is a real tyre: a
	 * wheel spinning or locked keeps little sideways grip, so a powerful car
	 * without traction control slides its tail out on the throttle (power
	 * slides, doughnuts) and locked front wheels don't steer; driving and
	 * braking within the tyre's grip cost nothing. 0 keeps the two apart, as
	 * games often do: a spinning wheel still corners. Default 1 for cars, 0
	 * for motorcycles. A tall, heavy rear-drive vehicle can lift and spin an
	 * inside wheel in a fast swerve under throttle: give it less (0.35).
	 */
	combinedGrip?: number;
	/**
	 * Share of their sideways grip the wheels held by the handbrake keep
	 * while it's on, as locked tyres do, so the tail swings round in a
	 * handbrake turn (default 0.4; 1 keeps it all).
	 */
	handbrakeGrip?: number;
	/** Friction of the body itself when it scrapes along the ground or a wall (default 0.4). */
	friction?: number;
	steering?: {
		/** How fast the steering follows the input, in full locks per second (default 4; Infinity: at once). */
		rate?: number;
		/** Speed (IGE units per second) by which the lock has narrowed to highSpeedLock (default 30 m/s). */
		highSpeed?: number;
		/** Share of the full lock left at highSpeed and above, so fast cars don't spin (default 0.35). */
		highSpeedLock?: number;
		/**
		 * Degrees the front tyres may slip past the turn yawAssist.lateralG
		 * allows: at speed the lock narrows to the angle that turns the
		 * vehicle that hard, plus this, so the stick's whole travel turns it
		 * (half the stick, about half the turn) and a flick can't steer it
		 * past its grip. Default 2.5 for cars; Infinity (motorcycles' default)
		 * leaves only highSpeedLock.
		 */
		slip?: number;
	};
	/**
	 * Arcade turning (see stabilityAssist too): steering asks for a rate of
	 * turn, from the steering's geometry at low speed and a sideways
	 * acceleration of `lateralG` at speed (a turning circle that widens
	 * with speed, as the tyres' grip allows), and a torque turns the
	 * vehicle towards it when the tyres alone turn it less (understeer).
	 * A driving game's cars turn firmly at any speed this way. Off
	 * (strength 0) for a simulation.
	 */
	yawAssist?: {
		/** 0..1 (default 1 for cars, 0 for motorcycles). */
		strength?: number;
		/** Sideways acceleration a full stick asks for at low speed, in g (default: the tyres' grip, about 1.2). */
		lateralG?: number;
		/**
		 * Sideways acceleration a full stick asks for at highSpeed and above, in g: arcade turning at speed, beyond
		 * the tyres' grip (default 2.5 x the tyres' grip, 3 g on the default car). From 60% of highSpeed the turn,
		 * the steering's speed and the assists' strength blend from their low-speed values to these.
		 */
		highSpeedG?: number;
		/** IGE units per second (default 28 m/s, 100 km/h): the turn is highSpeedG from here, lateralG below 60% of it. */
		highSpeed?: number;
		/** How fast the steering follows the input at highSpeed, full locks a second (default twice steering.rate). */
		highSpeedRate?: number;
	};
	/**
	 * Arcade stability: a torque that holds the vehicle's rate of turn to
	 * what the steering asks for (no yaw overshoot or sudden spin, lane
	 * changes that settle at once), and a sideways push that turns its
	 * velocity towards where it points once it slides more than a few
	 * degrees (slides are easy to catch; the car goes where it's pointed).
	 * It eases off while the handbrake is on and for a moment after, and
	 * while the driven wheels spin under throttle below `slideSpeed` (power
	 * slides and doughnuts). Off (strength 0) for a simulation.
	 */
	stabilityAssist?: {
		/** 0..1 (default 1 for cars, 0 for motorcycles). */
		strength?: number;
		/** Wheelspin below this speed (IGE units per second) eases it off, for power slides (default 15 m/s, 54 km/h). */
		slideSpeed?: number;
	};
	/**
	 * Anti-rollover, in g: a vehicle whose centre of mass is too high to
	 * corner this hard without tipping has it act lower while cornering (a
	 * torque against the tyres' roll), so it leans but doesn't roll over
	 * (default 2.5, or twice the tyres' grip if more, for cars; 0 for
	 * motorcycles: none). Cars with a low centre of mass are hardly
	 * touched; a van or bus gets most of it.
	 */
	antiRollover?: number;
	/**
	 * Downforce: a push down growing with the square of the speed, as a
	 * share of the vehicle's weight at 50 m/s (180 km/h), so the tyres grip
	 * harder at speed (default 0).
	 */
	downforce?: number;
	/** Motorcycles: most the bike leans into a turn, in degrees (default 45). */
	maxLean?: number;
	/**
	 * Most the body may pitch or roll, in degrees, as an arcade stabiliser.
	 * Default: no limit for cars (they can roll over), 60 for motorcycles.
	 */
	maxTilt?: number;
	/** Braking while stopped reverses (default true), as most driving games do. */
	reverseOnBrake?: boolean;
	/**
	 * Ease off the throttle while the driven wheels spin, so the vehicle
	 * pulls away cleanly and keeps shifting up (default true for cars,
	 * false for motorcycles).
	 */
	tractionControl?: boolean;
	/** How the wheels find the ground: "cylinder" (default, smooth over kerbs and edges) or "ray" (cheaper). */
	wheelCast?: "cylinder" | "ray";
	/**
	 * Tallest step the wheels ride up onto, IGE units: a kerb this high,
	 * met head-on or at an angle, bumps the front wheels up and then the
	 * rear, costing a little speed. Default: 65% of each wheel's radius (22
	 * cm on the default car). A taller step stops the wheel like a wall.
	 */
	stepHeight?: number;
	/**
	 * Wheel guards (default true): a box over each wheel's upper half, as
	 * wide as the tyre, that collides with the world but weighs nothing, so
	 * a wheel side-on to a low wall or a bollard, or a motorcycle's front
	 * wheel meeting a wall, doesn't poke into it (wheels find the ground
	 * with casts; only the chassis collides). Their bottoms are above
	 * stepHeight, so kerbs pass under them. They use the chassis' friction.
	 */
	wheelGuards?: boolean;
	/**
	 * Kinematic mode: how long (seconds) the vehicle carries on along the
	 * last state's velocity when no new state arrives (default 0.25).
	 */
	extrapolate?: number;
	/**
	 * Emit "impact" when the vehicle's velocity changes by more than this
	 * (IGE units per second) in one step, i.e. it hit something or landed
	 * hard: damage, crash sounds, knocking people down. true uses 1 m/s
	 * (100 at 100 units per metre). Default: no impact events.
	 */
	impacts?: boolean | number;
	/**
	 * Air control: how hard `pitch` and `roll` turn the vehicle while it's
	 * in the air, in degrees per second squared, up to a spin of 150
	 * degrees a second, so jumps can be landed (default 300; 0: none).
	 */
	airControl?: number;
	/**
	 * Cars: how hard steering (or `roll`) rocks a car that's on its roof or
	 * side and nearly stopped back onto its wheels, in degrees per second
	 * squared (default 600, which takes a second or two of holding; 0:
	 * never). Motorcycles: none.
	 */
	selfRighting?: number;
	/**
	 * Motorcycles: how hard `pitch` shifts the rider's weight while the
	 * wheels are on the ground, in degrees per second squared: back with
	 * the throttle for a wheelie, forward with the brake for a stoppie
	 * (default 400; 0: none). Cars: none.
	 */
	weightShift?: number;
}

/** The driver's controls. */
export interface IgePhysicsVehicleInput {
	/** Throttle -1..1. Negative brakes, then reverses once stopped. */
	forward: number;
	/** Steering -1 (full left) .. 1 (full right). */
	right: number;
	/** Brake 0..1. Reverses when held while stopped (see reverseOnBrake). */
	brake: number;
	/** Handbrake 0..1. */
	handbrake: number;
	/**
	 * Lean forward (1) or back (-1). In the air it pitches the vehicle,
	 * nose down for 1 (see airControl). A motorcycle on the ground shifts
	 * its rider's weight: back with the throttle for a wheelie, forward
	 * with the brake for a stoppie (see weightShift).
	 */
	pitch?: number;
	/** Roll -1..1, 1 to the right (right side down). In the air it rolls the vehicle; a car on its roof or side rolls back onto its wheels (as steering does). */
	roll?: number;
}

/** What a "landed" event reports: the vehicle came down after being in the air. */
export interface IgePhysicsVehicleLanding {
	/** Seconds it was in the air. */
	airTime: number;
	/** How fast it was coming down when it touched (IGE units per second, positive downwards). */
	speed: number;
	/** Its velocity just before it touched (IGE units per second). */
	velocity: IgePhysicsVec3;
	/** Degrees from upright when it touched: 0 level on its wheels, 90 on its side, 180 on its roof. */
	tilt: number;
	/** Whether it came down on its wheels (false: on its body). */
	onWheels: boolean;
}

/** What one wheel is doing, after the latest step. */
export interface IgePhysicsWheelReadout {
	/** Whether it touches the ground. */
	contact: boolean;
	/** Suspension compression: 0 fully extended .. 1 fully compressed. */
	compression: number;
	/**
	 * How fast the tyre slides along its rolling direction (IGE units per
	 * second): positive when it spins faster than the ground passes
	 * (wheelspin), negative when it turns slower (locked brakes).
	 */
	longitudinalSlip: number;
	/** How fast the tyre slides sideways (IGE units per second), positive towards the vehicle's right. */
	lateralSlip: number;
	/** Steering angle in degrees, positive to the right. */
	steer: number;
	/** Spin in radians per second, positive rolling forward. */
	spin: number;
	/** Where the tyre touches the ground (world, IGE units), when in contact. */
	point: IgePhysicsVec3;
	/** The ground's surface normal there. */
	normal: IgePhysicsVec3;
	/** The entity the wheel stands on, if it has a body. */
	entity: IgeEntity | null;
}

/**
 * A vehicle's state, as plain numbers safe to send over the network or
 * store as JSON. getState() fills every field; setState() needs position
 * and rotation, and uses the rest when given.
 */
export interface IgePhysicsVehicleState {
	/** The entity's origin, world IGE units. */
	position: IgePhysicsVec3;
	/** World rotation. */
	rotation: IgePhysicsQuat;
	/** IGE units per second. */
	velocity: IgePhysicsVec3;
	/** Radians per second around each world axis. */
	angularVelocity: IgePhysicsVec3;
	/** Engine revs. */
	rpm?: number;
	/** Gear: 1 and up forward, 0 neutral, -1 and down reverse. */
	gear?: number;
	/** The steering's current position -1..1 (it follows the input at the steering rate). */
	steer?: number;
	/** The driver's held input. */
	input?: IgePhysicsVehicleInput;
	/** Each wheel's spin, radians per second, so a moving car doesn't restart with locked wheels. */
	wheelSpin?: number[];
	/** Whether it keeps its balance (see upright()); left out, it isn't changed. */
	upright?: boolean;
}

/**
 * A wheeled vehicle or motorcycle, made with IgePhysics3d.addVehicle().
 * It moves its entity every frame (between the last two fixed steps), and
 * poses its wheels' entities.
 */
export interface IgePhysicsVehicle3dApi {
	/** The entity the vehicle moves. */
	readonly entity: IgeEntity;
	readonly type: "car" | "motorcycle";

	/** Hold these controls until told otherwise (fields left out are 0). Call it every frame from input. */
	drive (input: Partial<IgePhysicsVehicleInput>): this;
	/** The controls being held. */
	input (): IgePhysicsVehicleInput;
	/** Manual gearboxes: put it in this gear (1 and up forward, 0 neutral, -1 and down reverse). */
	shift (gear: number): this;

	/** Speed along the vehicle's facing, IGE units per second (negative reversing). */
	speed (): number;
	/** speed() in km/h. */
	speedKmh (): number;
	/** World velocity, IGE units per second. */
	velocity (): IgePhysicsVec3;
	/** World angular velocity, radians per second. */
	angularVelocity (): IgePhysicsVec3;
	/** Engine revs. */
	rpm (): number;
	/** Current gear: 1 and up forward, 0 neutral, -1 and down reverse. */
	gear (): number;
	wheelCount (): number;
	/** What a wheel is doing; the object is updated in place after every step. */
	wheel (index: number): IgePhysicsWheelReadout;
	/** Whether any wheel touches the ground. */
	grounded (): boolean;
	/** Degrees the vehicle is tilted from upright (0 upright, 180 on its roof). */
	tilt (): number;
	/** Whether it's more than 90 degrees from upright. */
	upsideDown (): boolean;
	/**
	 * Whether it's in the air: no wheel on the ground and its body touching
	 * nothing. (A car on its roof isn't airborne, nor grounded.)
	 */
	airborne (): boolean;

	/** The vehicle's state after the latest step, to send or keep. Pass out to fill an existing object. */
	getState (out?: IgePhysicsVehicleState): IgePhysicsVehicleState;
	/**
	 * Put the vehicle in a state. Simulated: it carries on from there.
	 * Kinematic: it's driven there over the next step (see kinematic()).
	 */
	setState (state: IgePhysicsVehicleState): this;
	/**
	 * Gets / sets kinematic mode: the simulation stops driving the vehicle
	 * and it follows the states given to setState() instead, carrying on
	 * at their velocity between them (for `extrapolate` seconds). It still
	 * pushes other bodies out of its way, and its wheels still steer, spin
	 * and follow the ground. For vehicles driven by another machine.
	 */
	kinematic (): boolean;
	kinematic (val: boolean): this;
	/** Gets / sets whether it takes part in the simulation (e.g. off while parked far away). */
	enabled (): boolean;
	enabled (val: boolean): this;
	/**
	 * Gets / sets whether it keeps its balance (default true). A ridden
	 * motorcycle stays upright, even stopped; upright(false) lets go, so
	 * an empty bike falls over and tumbles like any body (and a car loses
	 * its maxTilt limit). upright(true) balances it again once it's back on
	 * its wheels (put it there with setState()).
	 */
	upright (): boolean;
	upright (val: boolean): this;
	/**
	 * Change options after it's made (a tuning panel, an upgrade): given
	 * fields replace the ones it was made with (engine, gearbox and
	 * steering field by field), and it carries on from where it is, at the
	 * same speed, revs and gear. Most changes (mass, engine, gearbox,
	 * springs, grip, brakes, anti-roll) apply in place; a new chassis or
	 * wheels of another size make its simulation again from its state.
	 * `type` can't change.
	 */
	setOptions (options: Partial<IgePhysicsVehicleOptions>): this;
	/** The options it's using: what it was made with, with setOptions()' changes. */
	options (): IgePhysicsVehicleOptions;
	/** Remove the vehicle from the world and free it. */
	destroy (): void;

	/**
	 * "impact" (with `impacts` on): it hit something, or something hit it.
	 * `speed` is how much its velocity changed in the step (IGE units per
	 * second), `others` the bodies touching its chassis after the step
	 * (walls, other vehicles' chassis, people's bodies: `other.entity`).
	 */
	on (eventName: "impact", listener: (impact: IgePhysicsImpact) => void): this;
	/**
	 * "landed": it came down after at least a tenth of a second in the
	 * air, on its wheels or not, with how fast it was falling and how far
	 * it was tilted. Whether that throws the rider off is the game's call.
	 */
	on (eventName: "landed", listener: (landing: IgePhysicsVehicleLanding) => void): this;
	off (eventName: "impact" | "landed", listener?: (...args: any[]) => void): this;
}
