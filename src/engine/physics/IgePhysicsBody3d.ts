import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgePhysicsBackend, IgePhysicsBodyHandle } from "@/engine/physics/IgePhysicsBackend";
import type {
	IgePhysicsBodyOptions,
	IgePhysicsBodyState,
	IgePhysicsQuat,
	IgePhysicsVec3
} from "@/engine/physics/IgePhysics3dTypes";

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** What a body needs from its world (IgePhysics3d). */
export interface IgePhysicsBodyWorld {
	_backend: IgePhysicsBackend;
	unitsPerMetre (): number;
	removeBody (body: IgePhysicsBody3d): void;
	removeSensor (sensor: IgePhysicsSensor3d): void;
}

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };
/** Scratch vectors for calls into the backend (which doesn't keep them), so per-frame calls don't allocate. */
const SCRATCH: Vec3 = { x: 0, y: 0, z: 0 };
const SCRATCH2: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * A rigid body in an IgePhysics3d world, attached to one entity. Positions,
 * velocities and impulses are in IGE units; the entity follows the body
 * after every simulation step (dynamic bodies) or leads it (kinematic).
 */
export class IgePhysicsBody3d extends IgeEventingClass {
	classId = "IgePhysicsBody3d";
	readonly entity: IgeEntity;
	readonly type: "dynamic" | "static" | "kinematic";
	readonly options: IgePhysicsBodyOptions;
	_physics: IgePhysicsBodyWorld;
	/** The backend's body. */
	_handle: IgePhysicsBodyHandle;
	_offset: Vec3;
	_enabled: boolean = true;
	_destroyed: boolean = false;
	/** True for trigger sensors (see addSensor()). */
	_sensor: boolean = false;
	/** Body position and rotation at the last two steps (IGE units): x, y, z, qx, qy, qz, qw. */
	_previous = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
	_current = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
	/** Whether _previous and _current differ (the entity still needs placing). */
	_moving: boolean = true;

	/** Impact threshold in metres per second (0: no impact events). */
	_impactThreshold: number = 0;
	/** Velocity before the current step (metres per second). */
	_impactVelocity: Vec3 = { x: 0, y: 0, z: 0 };

	constructor (physics: IgePhysicsBodyWorld, entity: IgeEntity, options: IgePhysicsBodyOptions, handle: IgePhysicsBodyHandle) {
		super();
		this._physics = physics;
		this.entity = entity;
		this.type = options.type || "dynamic";
		this.options = options;
		this._handle = handle;
		this._offset = options.offset ? { ...options.offset } : { x: 0, y: 0, z: 0 };
		if (options.impacts) {
			this._impactThreshold = (options.impacts === true ? 100 : options.impacts) / physics.unitsPerMetre();
		}
		this._capture(true);
	}

	/** Record the body's transform as the latest step's (and the previous one's too when resetting). */
	_capture (reset: boolean = false): void {
		const u = this._physics.unitsPerMetre();
		const previous = this._previous, current = this._current;
		if (!reset) previous.set(current);
		this._physics._backend.readBodyPose(this._handle, current);
		current[0] *= u; current[1] *= u; current[2] *= u;
		if (reset) previous.set(current);
		this._moving = true;
	}

	/** Linear velocity in IGE units per second. */
	velocity (): Vec3 {
		const v = { x: 0, y: 0, z: 0 };
		this._physics._backend.readBodyVelocity(this._handle, v);
		const u = this._physics.unitsPerMetre();
		v.x *= u; v.y *= u; v.z *= u;
		return v;
	}

	/** Angular velocity in radians per second around each world axis. */
	angularVelocity (): Vec3 {
		const v = { x: 0, y: 0, z: 0 }, w = { x: 0, y: 0, z: 0 };
		this._physics._backend.readBodyVelocity(this._handle, v, w);
		return w;
	}

	/** Set the linear velocity in IGE units per second (wakes the body). */
	setVelocity (x: number, y: number, z: number): this {
		const u = this._physics.unitsPerMetre();
		SCRATCH.x = x / u; SCRATCH.y = y / u; SCRATCH.z = z / u;
		this._physics._backend.setBodyVelocity(this._handle, SCRATCH, null);
		return this;
	}

	/** Set the angular velocity in radians per second around each world axis (wakes the body). */
	setAngularVelocity (x: number, y: number, z: number): this {
		this._physics._backend.setBodyVelocity(this._handle, null, { x, y, z });
		return this;
	}

	/**
	 * Set the horizontal velocity and keep the vertical one (so the body
	 * still falls and lands), as character movement usually wants.
	 */
	setVelocityXZ (x: number, z: number): this {
		const backend = this._physics._backend;
		backend.readBodyVelocity(this._handle, SCRATCH);
		const u = this._physics.unitsPerMetre();
		SCRATCH.x = x / u; SCRATCH.z = z / u;
		backend.setBodyVelocity(this._handle, SCRATCH, null);
		return this;
	}

	/** Push the body: an impulse in kg * IGE units per second, at its centre or at a world point. */
	applyImpulse (x: number, y: number, z: number, at?: Vec3): this {
		const u = this._physics.unitsPerMetre();
		SCRATCH.x = x / u; SCRATCH.y = y / u; SCRATCH.z = z / u;
		if (at) {
			SCRATCH2.x = at.x / u; SCRATCH2.y = at.y / u; SCRATCH2.z = at.z / u;
		}
		this._physics._backend.addImpulse(this._handle, SCRATCH, at ? SCRATCH2 : undefined);
		return this;
	}

	/** Mass in kg (Infinity for static and kinematic bodies). */
	mass (): number {
		return this._physics._backend.bodyMass(this._handle);
	}

	/** Whether the simulation has put the body to sleep (it settled; touching it or setting its velocity wakes it). */
	asleep (): boolean {
		return this.type === "dynamic" && this._enabled && !this._physics._backend.bodyAwake(this._handle);
	}

	/** Move the body (and its entity) to a world position, e.g. a respawn, keeping its velocity at zero. */
	teleport (x: number, y: number, z: number): this {
		const backend = this._physics._backend;
		const u = this._physics.unitsPerMetre();
		let q = IDENTITY;
		if (this.type === "dynamic" && !this.options.lockRotation) {
			const pose = new Float64Array(7);
			backend.readBodyPose(this._handle, pose);
			q = { x: pose[3], y: pose[4], z: pose[5], w: pose[6] };
		}
		const o = this._worldOffset(q);
		backend.setBodyTransform(this._handle, { x: (x + o.x) / u, y: (y + o.y) / u, z: (z + o.z) / u }, q, true);
		if (this.type !== "static") backend.setBodyVelocity(this._handle, { x: 0, y: 0, z: 0 }, null);
		this.entity.translateTo(x, y, z);
		this._capture(true);
		return this;
	}

	/**
	 * The body's state after the latest step, as plain numbers safe to
	 * send or keep as JSON: the entity's position, the rotation and both
	 * velocities. Give it to setState() of a body made with the same
	 * options (in this world or another) to carry on from here, e.g. when
	 * a body changes hands between servers.
	 */
	getState (): IgePhysicsBodyState {
		const backend = this._physics._backend;
		const u = this._physics.unitsPerMetre();
		const pose = new Float64Array(7);
		backend.readBodyPose(this._handle, pose);
		const q = this.options.lockRotation ? { ...IDENTITY } : { x: pose[3], y: pose[4], z: pose[5], w: pose[6] };
		const o = this._worldOffset(q);
		const velocity = { x: 0, y: 0, z: 0 }, angularVelocity = { x: 0, y: 0, z: 0 };
		if (this.type !== "static") backend.readBodyVelocity(this._handle, velocity, angularVelocity);
		return {
			position: { x: pose[0] * u - o.x, y: pose[1] * u - o.y, z: pose[2] * u - o.z },
			rotation: q,
			velocity: { x: velocity.x * u, y: velocity.y * u, z: velocity.z * u },
			angularVelocity,
			asleep: this.type === "dynamic" ? !backend.bodyAwake(this._handle) : true
		};
	}

	/**
	 * Put the body (and its entity) in a state from getState(): there at
	 * once, moving as it was. A dynamic body that was asleep stays asleep.
	 */
	setState (state: IgePhysicsBodyState): this {
		if (this._destroyed) return this;
		const backend = this._physics._backend;
		const u = this._physics.unitsPerMetre();
		const r = state.rotation;
		const len = Math.hypot(r.x, r.y, r.z, r.w) || 1;
		const q = this.options.lockRotation ? IDENTITY : { x: r.x / len, y: r.y / len, z: r.z / len, w: r.w / len };
		const o = this._worldOffset(q);
		const p = state.position;
		const asleep = this.type === "dynamic" && !!state.asleep;
		backend.setBodyTransform(this._handle, { x: (p.x + o.x) / u, y: (p.y + o.y) / u, z: (p.z + o.z) / u }, q, this._enabled && !asleep);
		if (this.type !== "static") {
			const v = state.velocity ?? { x: 0, y: 0, z: 0 };
			const w = state.angularVelocity ?? { x: 0, y: 0, z: 0 };
			backend.setBodyVelocity(this._handle, { x: v.x / u, y: v.y / u, z: v.z / u }, this.options.lockRotation ? null : { ...w });
		}
		if (this._enabled && this.type === "dynamic") backend.setBodyAwake(this._handle, !asleep);
		this.entity.translateTo(p.x, p.y, p.z);
		if (!this.options.lockRotation && this.type !== "static") this.entity.quaternion(q);
		this._capture(true);
		return this;
	}

	/** Gets / sets whether the body takes part in the simulation (e.g. off while a character is dead). */
	enabled (): boolean;
	enabled (val: boolean): this;
	enabled (val?: boolean): boolean | this {
		if (val === undefined) return this._enabled;
		if (val === this._enabled || this._destroyed) return this;
		this._enabled = val;
		this._physics._backend.setBodyEnabled(this._handle, val);
		if (val) this._capture(true);
		return this;
	}

	/** Remove the body from the world and free it. */
	destroy (): void {
		this._physics.removeBody(this);
	}

	/** The shape offset rotated by a body rotation (IGE units). */
	_worldOffset (q: Quat): Vec3 {
		const o = this._offset;
		if (!o.x && !o.y && !o.z) return o;
		return rotateVector(o, q.x, q.y, q.z, q.w);
	}
}

/**
 * A trigger volume: a shape that follows its entity, doesn't collide, and
 * reports bodies entering and leaving it ("enter" and "exit" events with
 * the IgePhysicsBody3d) after every simulation step, e.g. pickups, damage
 * zones, doors and checkpoints. Overlaps are found by querying the world
 * on the main thread, so events work with threaded backends too.
 * @example #A healing zone
 *     const zone = physics.addSensor(pad, { shape: { type: "sphere", radius: 120 } });
 *     zone.on("enter", (body) => body.entity.data("healing", true));
 *     zone.on("exit", (body) => body.entity.data("healing", false));
 */
export class IgePhysicsSensor3d extends IgeEventingClass {
	classId = "IgePhysicsSensor3d";
	readonly body: IgePhysicsBody3d;
	readonly includeStatic: boolean;
	_overlapping: Set<IgePhysicsBody3d> = new Set();

	constructor (body: IgePhysicsBody3d, includeStatic: boolean) {
		super();
		this.body = body;
		this.includeStatic = includeStatic;
	}

	/** The entity the sensor follows. */
	get entity (): IgeEntity {
		return this.body.entity;
	}

	/** Bodies inside the sensor after the last step. */
	overlapping (): IgePhysicsBody3d[] {
		return [...this._overlapping];
	}

	/** Remove the sensor. */
	destroy (): void {
		this.body._physics.removeSensor(this);
	}
}

/** v rotated by the unit quaternion (x, y, z, w). */
export function rotateVector (v: Vec3, x: number, y: number, z: number, w: number): Vec3 {
	// t = 2 * cross(q.xyz, v); v' = v + w * t + cross(q.xyz, t)
	const tx = 2 * (y * v.z - z * v.y);
	const ty = 2 * (z * v.x - x * v.z);
	const tz = 2 * (x * v.y - y * v.x);
	return {
		x: v.x + w * tx + (y * tz - z * ty),
		y: v.y + w * ty + (z * tx - x * tz),
		z: v.z + w * tz + (x * ty - y * tx)
	};
}

/** a * b for quaternions. */
export function multiplyQuat (a: Quat, b: Quat): Quat {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
	};
}
