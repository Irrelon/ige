import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgePhysicsBackend, IgePhysicsBodyHandle } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsImpact, IgePhysicsQuat, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type { IgeFloatWorld } from "@/engine/physics/IgePhysicsBuoyancy3d";
import type { IgePhysicsCraft3dApi, IgePhysicsCraftLanding, IgePhysicsCraftState } from "@/engine/physics/IgePhysicsCraft3dApi";
import { axisAngleQuat, DEG, IgeCraftFrame, multiplyQuats, vec } from "@/engine/physics/IgePhysicsCraft3dFrame";
import type { IgeWater3d } from "@/engine/physics/IgeWater3d";

/*
 * What boats and aircraft share, in engine-neutral code: a dynamic body
 * (that can switch to kinematic) pushed every step by forces and torques
 * worked out here and in the subclasses, sent through the physics
 * backend; impacts and landings; state as JSON; kinematic mode for craft
 * flown on another machine. The body itself is an ordinary IgePhysicsBody3d,
 * so the world interpolates its entity like any other.
 */

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** Seconds in the air before coming down counts as a landing. */
const MIN_AIR_TIME = 0.25;
/** A kinematic state further than this (metres) teleports the craft. */
const SNAP_DISTANCE = 5;
/** Velocity change (m/s) in a step that counts as an impact with `impacts: true`. */
const DEFAULT_IMPACT = 1;

/** What a craft needs from its world (IgePhysics3d). */
export interface IgeCraftHost {
	_backend: IgePhysicsBackend;
	_water: IgeWater3d | null;
	unitsPerMetre (): number;
	gravity (): number;
	removeCraft (craft: IgePhysicsCraft3d): void;
	_othersTouching (handle: IgePhysicsBodyHandle, own: IgePhysicsBody3d | undefined): IgePhysicsBody3d[];
}

export interface IgeCraftCommon {
	layer: number;
	/** IGE units per second (0: no impact events), from the options. */
	impacts?: boolean | number;
	extrapolate?: number;
}

/** Copy a craft state (deep, plain numbers). */
export function copyCraftState (state: IgePhysicsCraftState): IgePhysicsCraftState {
	const zero = { x: 0, y: 0, z: 0 };
	const v = state.velocity ?? zero, a = state.angularVelocity ?? zero;
	return {
		position: { x: state.position.x, y: state.position.y, z: state.position.z },
		rotation: { x: state.rotation.x, y: state.rotation.y, z: state.rotation.z, w: state.rotation.w },
		velocity: { x: v.x, y: v.y, z: v.z },
		angularVelocity: { x: a.x, y: a.y, z: a.z },
		input: state.input ? { ...state.input } : undefined,
		engine: state.engine,
		rotor: state.rotor,
		gear: state.gear,
		flaps: state.flaps
	};
}

export abstract class IgePhysicsCraft3d extends IgeEventingClass implements IgePhysicsCraft3dApi {
	readonly entity: IgeEntity;
	readonly kind: "boat" | "plane" | "helicopter";
	readonly body: IgePhysicsBody3d;
	_host: IgeCraftHost;
	_u: number;
	/** Collision layer index (rays cast for gear use it). */
	_layer: number;
	/** The body's pose and motion this step, metres. */
	_frame = new IgeCraftFrame();
	/** m/s (0: none). */
	_impactThreshold: number;
	_extrapolate: number;
	_kinematic: boolean = false;
	_target?: IgePhysicsCraftState;
	_targetAge: number = 0;
	_destroyed: boolean = false;
	/** Forces this step (N, world), and the velocity before it: what impacts are measured against. */
	_forceSum: Vec3 = vec();
	_velocityBefore: Vec3 = vec();
	_airborne: boolean = false;
	_airTime: number = 0;
	/** Touching anything (gear, water or body) after the last step. */
	_touching: boolean = false;
	/** The body touching something after the last step (not counting gear or water). */
	_bodyTouching: boolean = false;
	/** For buoyancy: forces counted towards impacts. */
	_floatWorld: IgeFloatWorld;

	_v: Vec3 = vec();
	_w: Vec3 = vec();

	constructor (host: IgeCraftHost, entity: IgeEntity, kind: "boat" | "plane" | "helicopter", body: IgePhysicsBody3d, common: IgeCraftCommon) {
		super();
		this._host = host;
		this.entity = entity;
		this.kind = kind;
		this.body = body;
		this._u = host.unitsPerMetre();
		this._layer = common.layer;
		this._impactThreshold = common.impacts === true ? DEFAULT_IMPACT : common.impacts ? common.impacts / this._u : 0;
		this._extrapolate = common.extrapolate ?? 0.25;
		this._frame.readMass(host._backend, body._handle);
		this._frame.read(host._backend, body._handle);
		this._floatWorld = {
			backend: host._backend,
			handle: body._handle,
			water: null as unknown as IgeWater3d,
			unitsPerMetre: this._u,
			gravity: host.gravity(),
			addForce: (force, at) => this._force(force, at),
			addTorque: (torque) => this._torque(torque)
		};
	}

	/* What each kind adds */

	/** Push the body for one step (the frame is read for it). */
	abstract _applyForces (dt: number): void;
	/** After a step (the frame is read for after it). */
	_afterStep (_dt: number): void {}
	/** On landing gear touching the ground (wheels, floats in the water) after the last step. */
	_gearContact (): boolean {
		return false;
	}
	/** In the water after the last step. */
	_waterContact (): boolean {
		return false;
	}
	/** Whether a body touching the ground counts as being on its gear (helicopter skids). */
	_bodyIsGear (): boolean {
		return false;
	}
	/** Fill a state's extra fields (input, engine, gear...). */
	_writeState (_state: IgePhysicsCraftState): void {}
	/** Take a state's extra fields. */
	_readState (_state: IgePhysicsCraftState): void {}
	/** Kinematic: animate from the followed state (rotors, gear). */
	_followTarget (_target: IgePhysicsCraftState, _dt: number): void {}
	/** Pose extra entities (rotors, wheels) between steps. */
	_sync (_alpha: number): void {}

	/* Forces, counted for impacts */

	_force (force: Vec3, at?: Vec3): void {
		this._host._backend.addForce(this.body._handle, force, at);
		this._forceSum.x += force.x; this._forceSum.y += force.y; this._forceSum.z += force.z;
	}

	_torque (torque: Vec3): void {
		this._host._backend.addTorque(this.body._handle, torque);
	}

	/** The world's water ready for buoyancy this step (null: no water). */
	_waterWorld (): IgeFloatWorld | null {
		const water = this._host._water;
		if (!water) return null;
		this._floatWorld.water = water;
		this._floatWorld.gravity = this._host.gravity();
		return this._floatWorld;
	}

	/* The step */

	_preStep (dt: number): void {
		if (this._destroyed || !this.body._enabled) return;
		const backend = this._host._backend;
		const handle = this.body._handle;
		if (this._kinematic) {
			if (this._target) this._follow(this._target, dt);
			return;
		}
		const frame = this._frame;
		frame.read(backend, handle);
		const v = frame.velocity, before = this._velocityBefore;
		before.x = v.x; before.y = v.y; before.z = v.z;
		this._forceSum.x = this._forceSum.y = this._forceSum.z = 0;
		this._applyForces(dt);
	}

	_postStep (dt: number): void {
		if (this._destroyed || !this.body._enabled) return;
		const backend = this._host._backend;
		const handle = this.body._handle;
		const frame = this._frame;
		frame.read(backend, handle);
		if (this._kinematic) {
			this._airborne = false;
			this._airTime = 0;
			this._afterStep(dt);
			return;
		}

		// Impacts: the velocity changed by more than gravity and our own forces explain
		if (this._impactThreshold > 0 && backend.bodyAwake(handle)) {
			const g = this._host.gravity(), m = frame.mass, a = this._velocityBefore, f = this._forceSum, v = frame.velocity;
			const change = Math.hypot(v.x - (a.x + (f.x / m) * dt), v.y - (a.y + (g + f.y / m) * dt), v.z - (a.z + (f.z / m) * dt));
			if (change >= this._impactThreshold) {
				const u = this._u;
				const impact: IgePhysicsImpact = { speed: change * u, impulse: change * u * m, others: this._host._othersTouching(handle, this.body) };
				this.emit("impact", impact);
			}
		}

		// In the air, and landings
		let onGear = this._gearContact();
		const onWater = this._waterContact();
		let bodyTouching = false;
		if (!onGear && !onWater) {
			bodyTouching = this._host._othersTouching(handle, this.body).length > 0;
			if (bodyTouching && this._bodyIsGear() && frame.tilt() < 30) onGear = true;
		}
		const touching = onGear || onWater || bodyTouching;
		this._bodyTouching = bodyTouching;
		this._touching = touching;
		const was = this._airborne;
		this._airborne = !touching;
		if (!touching) {
			this._airTime += dt;
		} else {
			if (was && this._airTime >= MIN_AIR_TIME) {
				const u = this._u, a = this._velocityBefore;
				const landing: IgePhysicsCraftLanding = {
					airTime: this._airTime,
					speed: Math.max(0, -a.y) * u,
					velocity: { x: a.x * u, y: a.y * u, z: a.z * u },
					tilt: frame.tilt(),
					onGear,
					onWater
				};
				this.emit("landed", landing);
			}
			this._airTime = 0;
		}
		this._afterStep(dt);
	}

	/** Kinematic: move towards the followed state, carried on along its velocity for a while. */
	_follow (target: IgePhysicsCraftState, dt: number): void {
		this._targetAge += dt;
		const t = Math.min(this._targetAge, this._extrapolate);
		const u = this._u;
		const p = target.position, v = target.velocity, w = target.angularVelocity;
		const position = { x: (p.x + v.x * t) / u, y: (p.y + v.y * t) / u, z: (p.z + v.z * t) / u };
		let rotation: Quat = target.rotation;
		const spin = Math.hypot(w.x, w.y, w.z);
		if (spin * t > 1e-9) rotation = multiplyQuats(axisAngleQuat(w.x / spin, w.y / spin, w.z / spin, spin * t), rotation);
		const len = Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) || 1;
		this._host._backend.moveKinematic(this.body._handle, position, { x: rotation.x / len, y: rotation.y / len, z: rotation.z / len, w: rotation.w / len }, dt);
		this._followTarget(target, dt);
	}

	/* The public API */

	speed (): number {
		const f = this._frame;
		const v = f.velocity, d = f.forward;
		return (v.x * d.x + v.y * d.y + v.z * d.z) * this._u;
	}

	speedKmh (): number {
		return (this.speed() / this._u) * 3.6;
	}

	velocity (): Vec3 {
		const v = this._frame.velocity, u = this._u;
		return { x: v.x * u, y: v.y * u, z: v.z * u };
	}

	angularVelocity (): Vec3 {
		return { ...this._frame.angular };
	}

	tilt (): number {
		return this._frame.tilt();
	}

	attitude (): { pitch: number; roll: number; heading: number } {
		const f = this._frame;
		return { pitch: f.pitch() / DEG, roll: f.roll() / DEG, heading: f.heading() / DEG };
	}

	airborne (): boolean {
		return this._airborne;
	}

	submerged (): number {
		return 0;
	}

	getState (out?: IgePhysicsCraftState): IgePhysicsCraftState {
		const body = this.body.getState();
		const state: IgePhysicsCraftState = out ?? { position: body.position, rotation: body.rotation, velocity: body.velocity, angularVelocity: body.angularVelocity };
		state.position = body.position;
		state.rotation = body.rotation;
		state.velocity = body.velocity;
		state.angularVelocity = body.angularVelocity;
		this._writeState(state);
		if (this._kinematic && this._target?.input) state.input = { ...this._target.input };
		return state;
	}

	setState (state: IgePhysicsCraftState): this {
		if (this._destroyed) return this;
		if (this._kinematic) {
			const previous = this._target;
			this._target = copyCraftState(state);
			this._targetAge = 0;
			const p = this.body.getState().position;
			const gap = Math.hypot(state.position.x - p.x, state.position.y - p.y, state.position.z - p.z);
			if (!previous || gap > SNAP_DISTANCE * this._u) this._teleport(this._target);
			return this;
		}
		this._teleport(state);
		this._readState(state);
		return this;
	}

	_teleport (state: IgePhysicsCraftState): void {
		this.body.setState({
			position: state.position,
			rotation: state.rotation,
			velocity: state.velocity ?? { x: 0, y: 0, z: 0 },
			angularVelocity: state.angularVelocity ?? { x: 0, y: 0, z: 0 }
		});
		this._frame.read(this._host._backend, this.body._handle);
		this._airTime = 0;
	}

	kinematic (): boolean;
	kinematic (val: boolean): this;
	kinematic (val?: boolean): boolean | this {
		if (val === undefined) return this._kinematic;
		if (val === this._kinematic || this._destroyed) return this;
		const backend = this._host._backend;
		if (val) {
			this._target = this.getState();
			this._targetAge = 0;
			backend.setBodyKinematic(this.body._handle, true);
			this._kinematic = true;
		} else {
			// Carry on from here at the last state's speed
			const target = this._target;
			const state = this.getState();
			this._kinematic = false;
			backend.setBodyKinematic(this.body._handle, false);
			if (target) {
				state.velocity = { ...target.velocity };
				state.angularVelocity = { ...target.angularVelocity };
				this._readState(target);
			}
			this._teleport(state);
			this._target = undefined;
		}
		return this;
	}

	enabled (): boolean;
	enabled (val: boolean): this;
	enabled (val?: boolean): boolean | this {
		if (val === undefined) return this.body.enabled();
		if (this._destroyed) return this;
		this.body.enabled(val);
		return this;
	}

	destroy (): void {
		this._host.removeCraft(this);
	}
}
