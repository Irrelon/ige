import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { invertMat4 } from "@/engine/webgl/IgeRaycast";
import { matrixToQuaternion } from "@/engine/webgl/IgeModelParts";
import type {
	IgePhysicsQuat,
	IgePhysicsVec3,
	IgePhysicsVehicle3dApi,
	IgePhysicsVehicleInput,
	IgePhysicsVehicleOptions,
	IgePhysicsVehicleState,
	IgePhysicsWheelReadout
} from "@/engine/physics/IgePhysicsVehicle3dApi";
import {
	copyVehicleState,
	mergeVehicleOptions,
	resolveVehicleSpec,
	type IgeVehicleBackend,
	type IgeVehicleHost,
	type IgeVehicleSpec,
	type IgeVehicleWheelSample
} from "@/engine/physics/IgePhysicsVehicle3dBackend";

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** Below this forward speed (metres per second) the vehicle counts as stopped, for reversing. */
const STOPPED_SPEED = 1;
/** A kinematic state further than this (metres) from the vehicle teleports it rather than sweeping it through the world. */
const SNAP_DISTANCE = 5;
/** Traction control lets the driven wheels slip this fast (metres per second) before easing off... */
const TRACTION_SLIP = 1.5;
/** ...and has closed the throttle right down by this much more. */
const TRACTION_RANGE = 3;
/** Fastest air control spins a vehicle (radians per second). */
const MAX_AIR_SPIN = (150 * Math.PI) / 180;
/** A car rights itself only when tilted more than this (degrees)... */
const SELF_RIGHT_TILT = 60;
/** ...and slower than this (metres per second). */
const SELF_RIGHT_SPEED = 3;
/**
 * A motorcycle rider leaning right back on full throttle holds a wheelie at
 * this nose-up angle, and leaning right forward on the brakes a stoppie at
 * this nose-down one (radians); without throttle or brake leaning shifts
 * the bike only a little.
 */
const WHEELIE_ANGLE = (35 * Math.PI) / 180;
const STOPPIE_ANGLE = (25 * Math.PI) / 180;
const LEAN_ANGLE = (2 * Math.PI) / 180;
/** How firmly the rider holds that angle: per radian off it, and per radian per second of pitching. */
const RIDER_STIFFNESS = 200;
const RIDER_DAMPING = 25;
/** How fast a motorcycle let go of (upright(false)) starts to topple (radians per second), so it doesn't stay balanced. */
const TOPPLE_SPIN = 0.4;

/*
 * The arcade assists (yawAssist, stabilityAssist, downforce), as
 * accelerations the backend applies as a force and a torque.
 */
const G = 9.81;
/** The assists fade in between these forward speeds (metres per second): none parking or reversing. */
const ASSIST_FROM = 1;
const ASSIST_FULL = 4;
/**
 * Yaw assist: turning towards the steering's rate of turn, per second of error, and at most (radians per second
 * squared), at low speed and at yawAssist.highSpeed (blended between).
 */
const YAW_HELP = 6;
const YAW_HELP_MOST = 3;
const YAW_HELP_FAST = 25;
const YAW_HELP_FAST_MOST = 30;
/** Stability: turning back to the rate asked for beyond a small margin (radians per second), per second, at most. */
const YAW_HOLD = 50;
const YAW_HOLD_MARGIN = 0.02;
const YAW_HOLD_MOST = 20;
const YAW_HOLD_FAST_MOST = 40;
/**
 * Stability: sideslip let be (radians), how fast the velocity turns towards the heading beyond it (per second), at
 * most (g; at speed, the turn asked for).
 */
const SLIP_ALLOWED = (3 * Math.PI) / 180;
const SLIP_GAIN = 6;
const SLIP_GAIN_FAST = 15;
const SLIP_MOST = 0.6;
/** The yaw assist stops helping as the rear axle slides from the first share of SLIP_ALLOWED to the second (low speed, at speed). */
const HELP_SLIDE = [1, 2];
const HELP_SLIDE_FAST = [3, 6];
/** The cornering force (g) anti-rollover works from is smoothed over this long (seconds) and taken as at most this. */
const CORNERING_SMOOTHING = 0.05;
const CORNERING_MOST = 4;
/** The yaw assist fades out as the body tilts from the first (degrees) to the second, so it never rolls a vehicle over. */
const ROLL_GUARD_FROM = 8;
const ROLL_GUARD_TO = 14;
/** Sliding further than this (radians) it has spun: the assists let it go. */
const SPUN = (70 * Math.PI) / 180;
/** Seconds after the handbrake is let go for the stability to come back, and after wheelspin stops. */
const HANDBRAKE_RECOVERY = 0.8;
const POWER_RECOVERY = 0.5;
/** Wheelspin (metres per second) that starts, and that fully makes, a power slide. */
const POWER_SPIN_FROM = 1;
const POWER_SPIN_FULL = 4;
/** Downforce's reference speed (metres per second). */
const DOWNFORCE_SPEED = 50;

interface WheelTrack {
	readout: IgePhysicsWheelReadout;
	sample: IgeVehicleWheelSample;
	/** Suspension length, steer and unwrapped spin at the last two steps. */
	previous: Float64Array;
	current: Float64Array;
	/** The backend's spin angle at the last step (wrapped), to unwrap the next. */
	rawSpin: number;
}

function emptySample (): IgeVehicleWheelSample {
	return {
		suspensionLength: 0, steerAngle: 0, spinAngle: 0, spin: 0, contact: false,
		point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, longitudinalSlip: 0, lateralSlip: 0, ground: null
	};
}

/** v rotated by the unit quaternion q. */
function rotate (v: Vec3, x: number, y: number, z: number, w: number): Vec3 {
	const tx = 2 * (y * v.z - z * v.y);
	const ty = 2 * (z * v.x - x * v.z);
	const tz = 2 * (x * v.y - y * v.x);
	return { x: v.x + w * tx + (y * tz - z * ty), y: v.y + w * ty + (z * tx - x * tz), z: v.z + w * tz + (x * ty - y * tx) };
}

/** a * b. */
function multiply (a: Quat, b: Quat): Quat {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
	};
}

function axisAngle (axis: Vec3, angle: number): Quat {
	const s = Math.sin(angle / 2);
	return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) };
}

/** The angle a - b brought into -PI..PI. */
function wrapDelta (a: number, b: number): number {
	let d = (a - b) % (2 * Math.PI);
	if (d > Math.PI) d -= 2 * Math.PI;
	else if (d < -Math.PI) d += 2 * Math.PI;
	return d;
}

const X_AXIS = { x: 1, y: 0, z: 0 };
const Y_AXIS = { x: 0, y: 1, z: 0 };
const Z_AXIS = { x: 0, y: 0, z: 1 };

/**
 * A wheeled vehicle or motorcycle (see IgePhysicsVehicle3dApi), made with
 * IgePhysics3d.addVehicle(). This part is the same for every physics
 * backend: it shapes the driver's input (steering rate, less lock at
 * speed, braking before reversing), places the entity and wheels between
 * fixed steps, reports what the vehicle is doing and handles network
 * state and kinematic mode. The simulation itself is the backend's, in
 * metres: this converts what goes in and comes out.
 */
export class IgePhysicsVehicle3d extends IgeEventingClass implements IgePhysicsVehicle3dApi {
	classId = "IgePhysicsVehicle3d";
	readonly entity: IgeEntity;
	readonly type: "car" | "motorcycle";
	_host: IgeVehicleHost;
	_spec: IgeVehicleSpec;
	_backend: IgeVehicleBackend;
	_input: Required<IgePhysicsVehicleInput> = { forward: 0, right: 0, brake: 0, handbrake: 0, pitch: 0, roll: 0 };
	/** Where the steering is now, -1..1 of full lock before it narrows with speed (follows the input at the steering rate). */
	_steer: number = 0;
	/** Assists: the handbrake's and wheelspin's hold on the stability (0..1, easing back after). */
	_handbrakeHold: number = 0;
	_powerSlide: number = 0;
	/** Put somewhere (setState()) and not stepped since: the wheels haven't found the ground yet. */
	_placed: boolean = true;
	/**
	 * Assists: wheelbase, how far the rear axle is behind the centre of mass, half the track and the centre of mass's
	 * height above the ground (metres), and the most any wheel steers (radians).
	 */
	_geometry = { wheelbase: 0, rear: 0, halfTrack: 0, height: 0, maxSteer: 0 };
	/** Assists: the sideways acceleration they gave the last step, and the tyres' (and anything else touching it), smoothed (m/s²). */
	_assistAcross: number = 0;
	_cornering: number = 0;
	/** Pose at the last two steps: x, y, z, qx, qy, qz, qw (IGE units). */
	_previous = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
	_current = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
	_velocity: Vec3 = { x: 0, y: 0, z: 0 };
	_angularVelocity: Vec3 = { x: 0, y: 0, z: 0 };
	/** Velocity before the latest step (IGE units per second), for impacts. */
	_velocityBefore: Vec3 = { x: 0, y: 0, z: 0 };
	_wheels: WheelTrack[];
	_kinematic: boolean = false;
	/** Kinematic: the state being followed and how long ago (seconds of steps) it was given. */
	_target?: IgePhysicsVehicleState;
	_targetAge: number = 0;
	/** Traction control's share of the throttle, 0..1. */
	_traction: number = 1;
	/** The options it was made with, and setOptions()' changes. */
	_options: IgePhysicsVehicleOptions;
	_enabled: boolean = true;
	_destroyed: boolean = false;
	/** Whether the pose needs placing on the entity (false once at rest and placed). */
	_moving: boolean = true;
	/** No wheel on the ground and the body touching nothing, after the last step (the world works it out). */
	_airborne: boolean = false;
	/** Seconds in the air so far. */
	_airTime: number = 0;
	_upright: boolean = true;

	constructor (host: IgeVehicleHost, entity: IgeEntity, spec: IgeVehicleSpec, backend: IgeVehicleBackend, options: IgePhysicsVehicleOptions = {}) {
		super();
		this._host = host;
		this.entity = entity;
		this.type = spec.type;
		this._spec = spec;
		this._backend = backend;
		this._options = { ...options };
		this._wheels = this._wheelTracks(spec);
		this._geometry = steeringGeometry(spec);
		this._capture(true);
		this._sync(1);
	}

	/** Each wheel's readout and the poses it's drawn between. */
	_wheelTracks (spec: IgeVehicleSpec): WheelTrack[] {
		return spec.wheels.map((wheel) => ({
			readout: {
				contact: false, compression: 0, longitudinalSlip: 0, lateralSlip: 0, steer: 0, spin: 0,
				point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, entity: null
			},
			sample: emptySample(),
			previous: new Float64Array([wheel.suspensionMax, 0, 0]),
			current: new Float64Array([wheel.suspensionMax, 0, 0]),
			rawSpin: 0
		}));
	}

	setOptions (options: Partial<IgePhysicsVehicleOptions>): this {
		if (this._destroyed) return this;
		if (options.type !== undefined && options.type !== this.type) throw new Error("IgePhysicsVehicle3d: a vehicle's type can't change");
		const merged = mergeVehicleOptions(this._options, options);
		const spec = resolveVehicleSpec(merged, this._spec.unitsPerMetre);
		const state = this.getState();
		const newWheels = spec.wheels.length !== this._spec.wheels.length || spec.wheels.some((w, i) => w.entity !== this._spec.wheels[i].entity);
		this._backend = this._host._retuneVehicle(this, spec);
		this._spec = spec;
		this._options = merged;
		this._geometry = steeringGeometry(spec);
		if (newWheels) this._wheels = this._wheelTracks(spec);
		if (newWheels && state.wheelSpin?.length !== spec.wheels.length) state.wheelSpin = undefined;
		this._teleport(state);
		return this;
	}

	options (): IgePhysicsVehicleOptions {
		return mergeVehicleOptions(this._options, {});
	}

	drive (input: Partial<IgePhysicsVehicleInput>): this {
		const clamp = (v: number | undefined, min: number) => Math.max(min, Math.min(1, Number.isFinite(v) ? v as number : 0));
		this._input.forward = clamp(input.forward, -1);
		this._input.right = clamp(input.right, -1);
		this._input.brake = clamp(input.brake, 0);
		this._input.handbrake = clamp(input.handbrake, 0);
		this._input.pitch = clamp(input.pitch, -1);
		this._input.roll = clamp(input.roll, -1);
		return this;
	}

	input (): IgePhysicsVehicleInput {
		return { ...this._input };
	}

	airborne (): boolean {
		return this._airborne;
	}

	upright (): boolean;
	upright (val: boolean): this;
	upright (val?: boolean): boolean | this {
		if (val === undefined) return this._upright;
		if (val === this._upright || this._destroyed) return this;
		this._upright = val;
		this._backend.setUpright(val);
		if (!val && this._enabled && !this._kinematic) {
			// A bike stood perfectly level would stay balanced: start it falling the way it leans
			const c = this._current;
			const left = rotate(X_AXIS, c[3], c[4], c[5], c[6]), forward = rotate(Z_AXIS, c[3], c[4], c[5], c[6]);
			const side = left.y >= 0 ? 1 : -1;
			this._backend.addAngularVelocity({ x: forward.x * side * TOPPLE_SPIN, y: forward.y * side * TOPPLE_SPIN, z: forward.z * side * TOPPLE_SPIN });
		}
		return this;
	}

	shift (gear: number): this {
		this._backend.shift(Math.round(gear));
		return this;
	}

	speed (): number {
		const c = this._current;
		const forward = rotate({ x: 0, y: 0, z: 1 }, c[3], c[4], c[5], c[6]);
		const v = this._velocity;
		return v.x * forward.x + v.y * forward.y + v.z * forward.z;
	}

	speedKmh (): number {
		return (this.speed() / this._spec.unitsPerMetre) * 3.6;
	}

	velocity (): Vec3 {
		return { ...this._velocity };
	}

	angularVelocity (): Vec3 {
		return { ...this._angularVelocity };
	}

	rpm (): number {
		if (this._kinematic) return this._target?.rpm ?? this._spec.engine.minRpm;
		return this._backend.rpm();
	}

	gear (): number {
		if (this._kinematic) return this._target?.gear ?? 0;
		return this._backend.gear();
	}

	wheelCount (): number {
		return this._wheels.length;
	}

	wheel (index: number): IgePhysicsWheelReadout {
		const track = this._wheels[index];
		if (!track) throw new Error(`IgePhysicsVehicle3d: no wheel ${index}`);
		return track.readout;
	}

	grounded (): boolean {
		return this._wheels.some((w) => w.readout.contact);
	}

	tilt (): number {
		const c = this._current;
		const up = rotate({ x: 0, y: 1, z: 0 }, c[3], c[4], c[5], c[6]);
		return (Math.acos(Math.max(-1, Math.min(1, up.y))) * 180) / Math.PI;
	}

	upsideDown (): boolean {
		return this.tilt() > 90;
	}

	getState (out?: IgePhysicsVehicleState): IgePhysicsVehicleState {
		const c = this._current;
		const v = this._velocity, a = this._angularVelocity;
		const state: IgePhysicsVehicleState = out ?? {
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0, w: 1 },
			velocity: { x: 0, y: 0, z: 0 },
			angularVelocity: { x: 0, y: 0, z: 0 }
		};
		state.position = { x: c[0], y: c[1], z: c[2] };
		state.rotation = { x: c[3], y: c[4], z: c[5], w: c[6] };
		state.velocity = { x: v.x, y: v.y, z: v.z };
		state.angularVelocity = { x: a.x, y: a.y, z: a.z };
		state.rpm = this.rpm();
		state.gear = this.gear();
		state.steer = this._kinematic ? this._target?.steer ?? 0 : this._steer;
		state.input = this._kinematic && this._target?.input ? { ...this._target.input } : { ...this._input };
		state.wheelSpin = this._wheels.map((w) => w.sample.spin);
		state.upright = this._upright;
		return state;
	}

	setState (state: IgePhysicsVehicleState): this {
		if (this._destroyed) return this;
		if (state.upright !== undefined) this.upright(state.upright);
		if (this._kinematic) {
			const previous = this._target;
			this._target = copyVehicleState(state);
			this._targetAge = 0;
			// Far from where it is (a respawn, or a long gap): jump there
			const c = this._current;
			const u = this._spec.unitsPerMetre;
			const gap = Math.hypot(state.position.x - c[0], state.position.y - c[1], state.position.z - c[2]);
			if (!previous || gap > SNAP_DISTANCE * u) this._teleport(this._target);
			return this;
		}
		if (state.input) this.drive(state.input);
		this._steer = Number.isFinite(state.steer) ? Math.max(-1, Math.min(1, state.steer!)) : this._input.right;
		this._teleport(state);
		return this;
	}

	kinematic (): boolean;
	kinematic (val: boolean): this;
	kinematic (val?: boolean): boolean | this {
		if (val === undefined) return this._kinematic;
		if (val === this._kinematic || this._destroyed) return this;
		if (val) {
			this._target = this.getState();
			this._targetAge = 0;
			this._backend.setKinematic(true);
			this._kinematic = true;
		} else {
			// Carry on from where it is, at the speed the last state gave
			// (the speed it was being moved at, or what it was told to do next)
			const target = this._target;
			const state = this.getState();
			this._kinematic = false;
			this._backend.setKinematic(false);
			if (target) {
				state.velocity = { ...target.velocity };
				state.angularVelocity = { ...target.angularVelocity };
				if (target.input) state.input = { ...target.input };
			}
			this._steer = state.steer ?? 0;
			if (state.input) this.drive(state.input);
			this._teleport(state);
			this._target = undefined;
		}
		return this;
	}

	enabled (): boolean;
	enabled (val: boolean): this;
	enabled (val?: boolean): boolean | this {
		if (val === undefined) return this._enabled;
		if (val === this._enabled || this._destroyed) return this;
		this._enabled = val;
		this._backend.setEnabled(val);
		if (val) this._capture(true);
		return this;
	}

	destroy (): void {
		this._host.removeVehicle(this);
	}

	/** Free the backend's objects (the world calls this from removeVehicle()). */
	_free (): void {
		if (this._destroyed) return;
		this._destroyed = true;
		this._backend.destroy();
	}

	/** Put the chassis and drivetrain in a state now, with nothing between the old pose and the new. */
	_teleport (state: IgePhysicsVehicleState): void {
		const u = this._spec.unitsPerMetre;
		const p = state.position, v = state.velocity ?? { x: 0, y: 0, z: 0 };
		this._backend.setState({
			position: { x: p.x / u, y: p.y / u, z: p.z / u },
			rotation: state.rotation,
			velocity: { x: v.x / u, y: v.y / u, z: v.z / u },
			angularVelocity: state.angularVelocity ?? { x: 0, y: 0, z: 0 },
			rpm: state.rpm,
			gear: state.gear,
			wheelSpin: state.wheelSpin
		});
		this._capture(true);
		this._sync(1);
		this._placed = true;
	}

	/** Before each fixed step: hand the backend this step's controls, or the kinematic target. */
	_preStep (dt: number): void {
		if (!this._enabled || this._destroyed) return;
		const backend = this._backend;

		if (this._kinematic && this._target) {
			const target = this._target;
			this._targetAge += dt;
			const t = Math.min(this._targetAge, this._spec.extrapolate);
			const p = target.position, v = target.velocity, w = target.angularVelocity;
			const u = this._spec.unitsPerMetre;
			const position = { x: (p.x + v.x * t) / u, y: (p.y + v.y * t) / u, z: (p.z + v.z * t) / u };
			// Turn on at the angular velocity (world axes)
			const angle = Math.hypot(w.x, w.y, w.z) * t;
			let rotation = target.rotation;
			if (angle > 1e-9) {
				const len = Math.hypot(w.x, w.y, w.z);
				rotation = multiply(axisAngle({ x: w.x / len, y: w.y / len, z: w.z / len }, angle), rotation);
			}
			const f = rotate(Z_AXIS, rotation.x, rotation.y, rotation.z, rotation.w);
			backend.setInput(0, (target.steer ?? 0) * this._lock(v.x * f.x + v.y * f.y + v.z * f.z), 0, 0);
			backend.moveKinematic(position, rotation, dt);
			backend.preStep(dt);
			return;
		}

		const spec = this._spec;
		const input = this._input;
		const speed = this.speed();
		const stopped = STOPPED_SPEED * spec.unitsPerMetre;

		// Steering: eased towards the input at the steering rate (quicker at speed), then less lock at speed
		const slow = spec.steering.rate, fast = this._fast(speed);
		const rate = slow === Infinity ? Infinity : slow + (Math.max(slow, spec.yawAssist.highSpeedRate) - slow) * fast;
		const most = rate === Infinity ? Infinity : rate * dt;
		this._steer += Math.max(-most, Math.min(most, input.right - this._steer));

		// Brake before changing direction; brake held while stopped reverses
		let forward = input.forward, brake = input.brake;
		if (spec.reverseOnBrake && brake > 0 && forward <= 0 && speed < stopped) {
			forward = -brake;
			brake = 0;
		}
		if (forward > 0 && speed < -stopped) {
			brake = Math.max(brake, forward);
			forward = 0;
		} else if (forward < 0 && speed > stopped) {
			brake = Math.max(brake, -forward);
			forward = 0;
		}

		// Traction control: ease off while the driven wheels spin
		if (spec.tractionControl) {
			let spin = 0;
			if (forward !== 0) {
				const direction = Math.sign(forward);
				this._wheels.forEach((track, index) => {
					if (spec.wheels[index].driven && track.readout.contact) spin = Math.max(spin, track.readout.longitudinalSlip * direction);
				});
			}
			const u = spec.unitsPerMetre;
			const allowed = Math.max(0.1, 1 - Math.max(0, spin - TRACTION_SLIP * u) / (TRACTION_RANGE * u));
			this._traction += (allowed - this._traction) * Math.min(1, dt * 12);
			forward *= this._traction;
		}

		backend.setInput(forward, this._steer * this._lock(speed), brake, input.handbrake);
		this._assist(dt, forward);
		this._rotationControl(dt);
		backend.preStep(dt);
	}

	/** How far into the arcade's high-speed turning a forward speed (IGE units per second) is: 0 below 60% of yawAssist.highSpeed, 1 from it. */
	_fast (speed: number): number {
		const high = this._spec.yawAssist.highSpeed;
		return Math.max(0, Math.min(1, (Math.abs(speed) - 0.6 * high) / (0.4 * high)));
	}

	/** The sideways acceleration (g) a full stick asks for at a forward speed (IGE units per second). */
	_turnG (speed: number): number {
		const yaw = this._spec.yawAssist;
		return yaw.lateralG + (yaw.highSpeedG - yaw.lateralG) * this._fast(speed);
	}

	/**
	 * Share of the full lock the steering has at this forward speed (IGE
	 * units per second): narrowed towards highSpeedLock by highSpeed, and
	 * to the angle that turns the vehicle as hard as the arcade turn asks
	 * (_turnG(); the steering's geometry: atan(wheelbase x acceleration /
	 * speed²)) plus steering.slip.
	 */
	_lock (speed: number): number {
		const spec = this._spec;
		const { highSpeed, highSpeedLock, slip } = spec.steering;
		const fade = highSpeed > 0 ? Math.min(1, Math.abs(speed) / highSpeed) : 0;
		const lock = 1 + (highSpeedLock - 1) * fade;
		const { wheelbase, maxSteer } = this._geometry;
		const v = Math.abs(speed) / spec.unitsPerMetre;
		if (slip === Infinity || !wheelbase || !maxSteer || v < 1) return lock;
		const angle = Math.atan((wheelbase * this._turnG(speed) * G) / (v * v)) + slip;
		return Math.min(lock, angle / maxSteer);
	}

	/**
	 * The arcade assists, on the ground (yawAssist, stabilityAssist,
	 * downforce): accelerations the backend applies as a force and a
	 * torque through the chassis' centre of mass.
	 *
	 * The steering asks for a rate of turn: what its geometry gives at low
	 * speed (speed x tan(lock) / wheelbase), capped at speed by the
	 * sideways acceleration lateralG allows (lateralG / speed). Turning
	 * less than that, in its direction, the yaw assist turns it towards it;
	 * turning more (or the other way, or on with the steering straight),
	 * the stability turns it back, beyond a small margin. Its rear axle
	 * sliding sideways more than a few degrees (a car turning without
	 * sliding goes straight along its rear axle), the stability turns the
	 * velocity towards the heading, keeping the speed. The handbrake, and
	 * wheelspin under throttle below slideSpeed, ease the stability off
	 * (slides the driver asks for), and it comes back over a moment after.
	 * The yaw assist helps understeer only (not once the rear slides), and
	 * neither pushes a vehicle tilting over in a corner.
	 */
	_assist (dt: number, forward: number): void {
		const spec = this._spec;
		const yaw = spec.yawAssist, stability = spec.stabilityAssist;
		const input = this._input;
		const u = spec.unitsPerMetre;
		this._handbrakeHold = Math.max(input.handbrake, this._handbrakeHold - dt / HANDBRAKE_RECOVERY);
		if (!yaw.strength && !stability.strength && !spec.downforce) return;
		if (this._airborne) return;
		// On its wheels (half of them on the ground), or just put there: the same car put in a state carries on the same
		let down = 0;
		for (const track of this._wheels) if (track.readout.contact) down++;
		if (down * 2 < this._wheels.length && !this._placed) return;
		const c = this._current;
		const up = rotate(Y_AXIS, c[3], c[4], c[5], c[6]);
		if (up.y < 0.7) return;
		const f = rotate(Z_AXIS, c[3], c[4], c[5], c[6]), left = rotate(X_AXIS, c[3], c[4], c[5], c[6]);
		const v = this._velocity, w = this._angularVelocity;
		const along = (v.x * f.x + v.y * f.y + v.z * f.z) / u;
		const across = (v.x * left.x + v.y * left.y + v.z * left.z) / u;
		const turning = w.x * up.x + w.y * up.y + w.z * up.z;
		const linear = { x: 0, y: 0, z: 0 };
		let angular = 0;

		// Downforce: down through the body, with the square of the speed
		if (spec.downforce) {
			const push = spec.downforce * G * (along / DOWNFORCE_SPEED) ** 2;
			linear.x -= up.x * push; linear.y -= up.y * push; linear.z -= up.z * push;
		}

		// Slides the driver asks for: the handbrake (and a moment after), wheelspin under throttle at low speed
		let spin = 0;
		if (forward > 0) {
			this._wheels.forEach((track, index) => {
				if (spec.wheels[index].driven && track.readout.contact) spin = Math.max(spin, track.readout.longitudinalSlip / u);
			});
		}
		const slideSpeed = stability.slideSpeed / u;
		const slow = slideSpeed > 0 ? Math.max(0, Math.min(1, (1.5 * slideSpeed - Math.abs(along)) / (0.5 * slideSpeed))) : 0;
		const power = Math.max(0, Math.min(1, (spin - POWER_SPIN_FROM) / (POWER_SPIN_FULL - POWER_SPIN_FROM))) * slow;
		this._powerSlide = Math.max(power, this._powerSlide - dt / POWER_RECOVERY);

		const on = Math.max(0, Math.min(1, (along - ASSIST_FROM) / (ASSIST_FULL - ASSIST_FROM)));
		// Sliding is the rear axle's: a vehicle turning without sliding goes straight along its rear axle, while its
		// centre of mass (ahead of it) moves towards the inside of the turn
		const { wheelbase, rear, maxSteer } = this._geometry;
		const acrossRear = across - turning * rear;
		const slip = Math.atan2(Math.abs(acrossRear), Math.max(along, 1e-6));
		// From 60% of yawAssist.highSpeed to it: the arcade's high-speed turning (a harder turn, more authority)
		const fast = this._fast(along * u);
		const blend = (low: number, high: number) => low + (high - low) * fast;
		const turnG = this._turnG(along * u);
		let acrossAssist = 0;
		if (on > 0 && slip < SPUN) {
			// Eased back in (squared), so a slide let go of carries on a little before it's caught
			const hold = stability.strength * (1 - Math.max(this._handbrakeHold, this._powerSlide)) ** 2 * on;
			// Neither assist rolls a vehicle over, and the yaw assist helps understeer only: not once the rear slides
			const tilt = (Math.acos(Math.max(-1, Math.min(1, up.y))) * 180) / Math.PI;
			const guard = Math.max(0, Math.min(1, (ROLL_GUARD_TO - tilt) / (ROLL_GUARD_TO - ROLL_GUARD_FROM)));
			const from = blend(HELP_SLIDE[0], HELP_SLIDE_FAST[0]) * SLIP_ALLOWED, to = blend(HELP_SLIDE[1], HELP_SLIDE_FAST[1]) * SLIP_ALLOWED;
			const gripping = Math.max(0, Math.min(1, (to - slip) / (to - from)));
			const help = yaw.strength * on * guard * gripping;

			// The rate of turn asked for (positive turns left, towards +X; steering right is positive)
			const geometric = wheelbase > 0 ? (along * Math.tan(maxSteer)) / wheelbase : 0;
			const target = -this._steer * Math.min(geometric, (turnG * G) / Math.max(along, 0.5));
			const side = target < 0 ? -1 : 1;
			const asked = target * side, now = turning * side;
			let push = 0;
			if (help > 0 && now < asked) push += help * Math.min(blend(YAW_HELP_MOST, YAW_HELP_FAST_MOST), blend(YAW_HELP, YAW_HELP_FAST) * (asked - Math.max(now, 0)));
			if (hold > 0) {
				const over = now - asked - YAW_HOLD_MARGIN, wrong = -now - YAW_HOLD_MARGIN;
				const most = blend(YAW_HOLD_MOST, YAW_HOLD_FAST_MOST);
				if (over > 0) push -= hold * Math.min(most, YAW_HOLD * over);
				else if (wrong > 0) push += hold * Math.min(most, YAW_HOLD * wrong);
			}
			angular = push * side;

			// Sliding: turn the velocity towards the heading (taking the rear axle's slide away), keeping the speed. At
			// speed this is most of the arcade's grip, up to the whole turn asked for
			const excess = Math.abs(acrossRear) - Math.abs(along) * Math.tan(SLIP_ALLOWED);
			if (hold > 0 && excess > 0) {
				const speed = Math.hypot(along, across);
				const most = Math.max(SLIP_MOST, turnG * fast) * G;
				const change = Math.min(excess, guard * hold * Math.min(most, blend(SLIP_GAIN, SLIP_GAIN_FAST) * excess) * dt);
				const nextAcross = Math.max(-speed, Math.min(speed, across - Math.sign(acrossRear) * change));
				const nextAlong = Math.sign(along) * Math.sqrt(Math.max(0, speed * speed - nextAcross * nextAcross));
				const da = (nextAlong - along) / dt, dc = (nextAcross - across) / dt;
				linear.x += f.x * da + left.x * dc; linear.y += f.y * da + left.y * dc; linear.z += f.z * da + left.z * dc;
				acrossAssist = dc;
			}
		}

		// Anti-rollover: the tyres' sideways force acts at the ground, below the centre of mass, and rolls the body out
		// of the turn. Measured from the last step's change in velocity (less gravity and the assists' own push), it's
		// met with a torque that makes the centre of mass act as low as tipping at antiRollover g needs
		let rollTorque = 0;
		const { halfTrack, height } = this._geometry;
		const vb = this._velocityBefore;
		const accelAcross = ((v.x - vb.x) * left.x + (v.y - vb.y) * left.y + (v.z - vb.z) * left.z) / u / dt + G * left.y - this._assistAcross;
		this._cornering += (Math.max(-CORNERING_MOST * G, Math.min(CORNERING_MOST * G, accelAcross)) - this._cornering) * Math.min(1, dt / CORNERING_SMOOTHING);
		this._assistAcross = acrossAssist;
		if (spec.antiRollover > 0 && halfTrack > 0) {
			const lower = height - halfTrack / spec.antiRollover;
			if (lower > 0) rollTorque = spec.mass * this._cornering * lower;
		}
		const roll = rollTorque ? { x: -f.x * rollTorque, y: -f.y * rollTorque, z: -f.z * rollTorque } : undefined;
		if (!angular && !linear.x && !linear.y && !linear.z && !roll) return;
		this._backend.accelerate(linear, { x: up.x * angular, y: up.y * angular, z: up.z * angular }, roll);
	}

	/**
	 * Turning the vehicle with pitch and roll (and steering, for a car
	 * that's over): air control, a motorcycle rider's weight, a car rocking
	 * itself back onto its wheels.
	 */
	_rotationControl (dt: number): void {
		const spec = this._spec;
		const input = this._input;
		const c = this._current;
		let pitch = 0, roll = 0;

		if (this._airborne) {
			// Towards a spin rate set by the stick, at the air control rate
			if (!spec.airControl || (!input.pitch && !input.roll)) return;
			const w = this._angularVelocity;
			const most = spec.airControl * dt;
			const toward = (axis: Vec3, amount: number) => {
				const a = rotate(axis, c[3], c[4], c[5], c[6]);
				const now = w.x * a.x + w.y * a.y + w.z * a.z;
				return Math.max(-most, Math.min(most, amount * MAX_AIR_SPIN - now));
			};
			if (input.pitch) pitch = toward(X_AXIS, input.pitch);
			if (input.roll) roll = toward(Z_AXIS, input.roll);
		} else if (spec.type === "motorcycle") {
			// The rider's weight, while a wheel is on the ground: leaning back on
			// the throttle lifts the front to a wheelie and holds it there,
			// leaning forward on the brakes lifts the back. weightShift caps how
			// hard the rider can pitch the bike against its springs.
			if (!spec.weightShift || !input.pitch || !this.grounded()) return;
			const x = rotate(X_AXIS, c[3], c[4], c[5], c[6]);
			const nose = Math.asin(Math.max(-1, Math.min(1, rotate(Z_AXIS, c[3], c[4], c[5], c[6]).y)));
			const w = this._angularVelocity;
			const noseUpRate = -(w.x * x.x + w.y * x.y + w.z * x.z);
			const target = input.pitch < 0
				? -input.pitch * Math.max(LEAN_ANGLE, WHEELIE_ANGLE * Math.max(0, input.forward))
				: -input.pitch * Math.max(LEAN_ANGLE, STOPPIE_ANGLE * Math.max(input.brake, -input.forward, 0));
			const push = RIDER_STIFFNESS * (target - nose) - RIDER_DAMPING * noseUpRate;
			pitch = -Math.max(-spec.weightShift, Math.min(spec.weightShift, push)) * dt;
		} else {
			// Over on its roof or side and nearly stopped: rock it back
			const turn = input.roll || input.right;
			if (!spec.selfRighting || !turn || this.tilt() < SELF_RIGHT_TILT) return;
			const v = this._velocity;
			if (Math.hypot(v.x, v.y, v.z) > SELF_RIGHT_SPEED * spec.unitsPerMetre) return;
			roll = turn * spec.selfRighting * dt;
		}
		if (!pitch && !roll) return;

		// Nose down is a turn about the vehicle's +X, right side down one about its +Z
		const x = rotate(X_AXIS, c[3], c[4], c[5], c[6]), z = rotate(Z_AXIS, c[3], c[4], c[5], c[6]);
		this._backend.addAngularVelocity({ x: x.x * pitch + z.x * roll, y: x.y * pitch + z.y * roll, z: x.z * pitch + z.z * roll });
	}

	/** After each fixed step: read the pose and wheels back. */
	_postStep (): void {
		if (!this._enabled || this._destroyed) return;
		this._placed = false;
		this._capture(false);
	}

	/** Read the latest step (and make it the previous one too when resetting). */
	_capture (reset: boolean): void {
		const backend = this._backend;
		const u = this._spec.unitsPerMetre;
		const previous = this._previous, current = this._current;
		if (!reset) previous.set(current);
		backend.readPose(current);
		current[0] *= u; current[1] *= u; current[2] *= u;
		if (reset) previous.set(current);
		const v = this._velocity, before = this._velocityBefore;
		before.x = v.x; before.y = v.y; before.z = v.z;
		backend.readVelocity(v, this._angularVelocity);
		v.x *= u; v.y *= u; v.z *= u;
		if (reset) {
			before.x = v.x; before.y = v.y; before.z = v.z;
		}
		this._moving = true;

		const spec = this._spec;
		const toDegrees = 180 / Math.PI;
		this._wheels.forEach((track, index) => {
			const wheel = spec.wheels[index];
			const sample = track.sample;
			backend.readWheel(index, sample);
			const spin = reset ? sample.spinAngle : track.current[2] + wrapDelta(sample.spinAngle, track.rawSpin);
			if (!reset) track.previous.set(track.current);
			track.current[0] = sample.suspensionLength * u;
			track.current[1] = sample.steerAngle;
			track.current[2] = spin;
			track.rawSpin = sample.spinAngle;
			if (reset) track.previous.set(track.current);

			const r = track.readout;
			const travel = wheel.suspensionMax - wheel.suspensionMin;
			r.contact = sample.contact;
			r.compression = travel > 0 ? Math.max(0, Math.min(1, (wheel.suspensionMax - sample.suspensionLength * u) / travel)) : 0;
			r.longitudinalSlip = sample.longitudinalSlip * u;
			r.lateralSlip = sample.lateralSlip * u;
			r.steer = -sample.steerAngle * toDegrees;
			r.spin = sample.spin;
			r.point.x = sample.point.x * u; r.point.y = sample.point.y * u; r.point.z = sample.point.z * u;
			r.normal.x = sample.normal.x; r.normal.y = sample.normal.y; r.normal.z = sample.normal.z;
			r.entity = sample.contact && sample.ground ? this._host._entityOfBody(sample.ground) : null;
		});
	}

	/** Place the entity and pose the wheels alpha of the way from the previous step to the latest. */
	_sync (alpha: number): void {
		if (!this._enabled || this._destroyed) return;
		const a = this._previous, b = this._current;
		const entity = this.entity;

		if (this._moving) {
			let x = a[0] + (b[0] - a[0]) * alpha;
			let y = a[1] + (b[1] - a[1]) * alpha;
			let z = a[2] + (b[2] - a[2]) * alpha;
			// Normalised lerp along the shorter arc
			const sign = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0 ? -1 : 1;
			const qx = a[3] + (b[3] * sign - a[3]) * alpha, qy = a[4] + (b[4] * sign - a[4]) * alpha;
			const qz = a[5] + (b[5] * sign - a[5]) * alpha, qw = a[6] + (b[6] * sign - a[6]) * alpha;
			const len = Math.hypot(qx, qy, qz, qw) || 1;
			let q: Quat = { x: qx / len, y: qy / len, z: qz / len, w: qw / len };

			// Into the parent's space when the parent isn't at the origin
			const parentMatrix = (entity._parent as IgeEntity | null)?._worldMatrix4?.matrix;
			if (parentMatrix && !isIdentity(parentMatrix)) {
				const inverse = invertMat4(parentMatrix);
				if (inverse) {
					const lx = inverse[0] * x + inverse[4] * y + inverse[8] * z + inverse[12];
					const ly = inverse[1] * x + inverse[5] * y + inverse[9] * z + inverse[13];
					const lz = inverse[2] * x + inverse[6] * y + inverse[10] * z + inverse[14];
					x = lx; y = ly; z = lz;
					const pq = matrixToQuaternion(parentMatrix);
					q = multiply({ x: -pq.x, y: -pq.y, z: -pq.z, w: pq.w }, q);
				}
			}
			entity.translateTo(x, y, z);
			entity.quaternion(q);
			let still = true;
			for (let i = 0; i < 7; i++) if (a[i] !== b[i]) still = false;
			if (still) this._moving = false;
		}

		// Wheels, in the vehicle entity's space
		const spec = this._spec;
		this._wheels.forEach((track, index) => {
			const wheel = spec.wheels[index];
			if (!wheel.entity) return;
			const p = track.previous, c = track.current;
			const length = p[0] + (c[0] - p[0]) * alpha;
			const steer = p[1] + (c[1] - p[1]) * alpha;
			const spin = p[2] + (c[2] - p[2]) * alpha;
			const d = wheel.suspensionDirection;
			wheel.entity.translateTo(wheel.position.x + d.x * length, wheel.position.y + d.y * length, wheel.position.z + d.z * length);
			wheel.entity.quaternion(multiply(axisAngle(wheel.steeringAxis, steer), axisAngle(X_AXIS, spin % (2 * Math.PI))));
		});
	}
}

/**
 * For the assists: the wheelbase (metres, steering wheels to the others),
 * how far the rear axle (the wheels that don't steer) is behind the centre
 * of mass, half the track and the centre of mass's height above the ground
 * where the wheels rest, and the most any wheel steers (radians).
 */
function steeringGeometry (spec: IgeVehicleSpec): { wheelbase: number; rear: number; halfTrack: number; height: number; maxSteer: number } {
	const u = spec.unitsPerMetre, com = spec.centreOfMass;
	let steerZ = 0, steered = 0, fixedZ = 0, fixed = 0, maxSteer = 0, track = 0, ground = 0;
	const share = spec.mass / spec.wheels.length;
	for (const wheel of spec.wheels) {
		if (wheel.maxSteer > 0) {
			steerZ += wheel.position.z;
			steered++;
			maxSteer = Math.max(maxSteer, wheel.maxSteer);
		} else {
			fixedZ += wheel.position.z;
			fixed++;
		}
		track += Math.abs(wheel.position.x - com.x);
		// Where the tyre meets the ground at rest on its spring
		const sag = wheel.stiffness > 0 ? ((share * G) / wheel.stiffness) * u : 0;
		const rest = Math.max(wheel.suspensionMin, Math.min(wheel.suspensionMax, wheel.suspensionMax - sag));
		ground += wheel.position.y + wheel.suspensionDirection.y * rest - wheel.radius;
	}
	const n = spec.wheels.length;
	const halfTrack = track / n / u, height = (com.y - ground / n) / u;
	if (!steered || !fixed) return { wheelbase: 0, rear: 0, halfTrack, height, maxSteer };
	return { wheelbase: Math.abs(steerZ / steered - fixedZ / fixed) / u, rear: (com.z - fixedZ / fixed) / u, halfTrack, height, maxSteer };
}

function isIdentity (m: ArrayLike<number>): boolean {
	return m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
		m[1] === 0 && m[2] === 0 && m[4] === 0 && m[6] === 0 && m[8] === 0 && m[9] === 0 &&
		m[12] === 0 && m[13] === 0 && m[14] === 0;
}
