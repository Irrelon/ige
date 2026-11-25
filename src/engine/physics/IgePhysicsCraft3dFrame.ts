import type { IgePhysicsBackend, IgePhysicsBackendInertia, IgePhysicsBodyHandle } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsQuat, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";

/*
 * A body's pose and motion for one step, in metres and SI units, read
 * through the physics backend: the working space of buoyancy, boats and
 * aircraft. Engine-neutral: nothing here knows which backend it reads.
 *
 * Body axes are the entity's: left +X, up +Y, forward +Z. Angular rates
 * and accelerations in body axes are about those axes (right-hand rule):
 * about +X is nose down, about +Y is a turn to the left, about +Z is the
 * right side going down.
 */

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

export function vec (x: number = 0, y: number = 0, z: number = 0): Vec3 {
	return { x, y, z };
}

/** v rotated by the unit quaternion q, into out (which may be v). */
export function rotateInto (v: Vec3, q: Quat, out: Vec3): Vec3 {
	const tx = 2 * (q.y * v.z - q.z * v.y);
	const ty = 2 * (q.z * v.x - q.x * v.z);
	const tz = 2 * (q.x * v.y - q.y * v.x);
	const x = v.x + q.w * tx + (q.y * tz - q.z * ty);
	const y = v.y + q.w * ty + (q.z * tx - q.x * tz);
	const z = v.z + q.w * tz + (q.x * ty - q.y * tx);
	out.x = x; out.y = y; out.z = z;
	return out;
}

/** v rotated by the inverse of the unit quaternion q, into out. */
export function unrotateInto (v: Vec3, q: Quat, out: Vec3): Vec3 {
	return rotateInto(v, { x: -q.x, y: -q.y, z: -q.z, w: q.w }, out);
}

export function multiplyQuats (a: Quat, b: Quat): Quat {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
	};
}

export function axisAngleQuat (x: number, y: number, z: number, angle: number): Quat {
	const s = Math.sin(angle / 2);
	return { x: x * s, y: y * s, z: z * s, w: Math.cos(angle / 2) };
}

export function clamp (v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v;
}

/** Smooth 0..1 between edges a and b. */
export function smoothstep (a: number, b: number, v: number): number {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
}

export const DEG = Math.PI / 180;

export class IgeCraftFrame {
	/** The entity's origin (metres) and the body's rotation. */
	position: Vec3 = vec();
	rotation: Quat = { x: 0, y: 0, z: 0, w: 1 };
	/** Metres per second and radians per second, world axes. */
	velocity: Vec3 = vec();
	angular: Vec3 = vec();
	/** World centre of mass, metres. */
	com: Vec3 = vec();
	left: Vec3 = vec(1, 0, 0);
	up: Vec3 = vec(0, 1, 0);
	forward: Vec3 = vec(0, 0, 1);
	/** kg, and the principal moments of inertia with their axes in the body's. */
	mass: number = 1;
	inertia: IgePhysicsBackendInertia = { moments: vec(1, 1, 1), rotation: { x: 0, y: 0, z: 0, w: 1 } };

	_pose = new Float64Array(7);
	_a: Vec3 = vec();
	_b: Vec3 = vec();

	/** Read mass and inertia once (they don't change). */
	readMass (backend: IgePhysicsBackend, handle: IgePhysicsBodyHandle): void {
		const mass = backend.bodyMass(handle);
		if (Number.isFinite(mass) && mass > 0) this.mass = mass;
		backend.readBodyInertia(handle, this.inertia);
	}

	/**
	 * Read the body after (or before) a step. offset: where the body's
	 * shape origin sits from the entity's origin, in body axes (metres).
	 */
	read (backend: IgePhysicsBackend, handle: IgePhysicsBodyHandle, offset?: Vec3): void {
		const pose = this._pose;
		backend.readBodyPose(handle, pose);
		const q = this.rotation;
		q.x = pose[3]; q.y = pose[4]; q.z = pose[5]; q.w = pose[6];
		rotateInto(vec(1, 0, 0), q, this.left);
		rotateInto(vec(0, 1, 0), q, this.up);
		rotateInto(vec(0, 0, 1), q, this.forward);
		const p = this.position;
		p.x = pose[0]; p.y = pose[1]; p.z = pose[2];
		if (offset && (offset.x || offset.y || offset.z)) {
			const o = this.toWorld(offset, this._a);
			p.x -= o.x; p.y -= o.y; p.z -= o.z;
		}
		backend.readBodyVelocity(handle, this.velocity, this.angular);
		backend.readBodyCentreOfMass(handle, this.com);
	}

	/** A world vector in body axes (x along left, y up, z forward). */
	toBody (v: Vec3, out: Vec3): Vec3 {
		const l = this.left, u = this.up, f = this.forward;
		const x = v.x * l.x + v.y * l.y + v.z * l.z;
		const y = v.x * u.x + v.y * u.y + v.z * u.z;
		const z = v.x * f.x + v.y * f.y + v.z * f.z;
		out.x = x; out.y = y; out.z = z;
		return out;
	}

	/** A body-axes vector in world axes. */
	toWorld (b: Vec3, out: Vec3): Vec3 {
		const l = this.left, u = this.up, f = this.forward;
		const x = l.x * b.x + u.x * b.y + f.x * b.z;
		const y = l.y * b.x + u.y * b.y + f.y * b.z;
		const z = l.z * b.x + u.z * b.y + f.z * b.z;
		out.x = x; out.y = y; out.z = z;
		return out;
	}

	/** A point given from the entity's origin in body axes (metres), in the world. */
	pointToWorld (local: Vec3, out: Vec3): Vec3 {
		this.toWorld(local, out);
		out.x += this.position.x; out.y += this.position.y; out.z += this.position.z;
		return out;
	}

	/** The velocity of a world point fixed to the body. */
	pointVelocity (point: Vec3, out: Vec3): Vec3 {
		const w = this.angular, c = this.com, v = this.velocity;
		const rx = point.x - c.x, ry = point.y - c.y, rz = point.z - c.z;
		out.x = v.x + (w.y * rz - w.z * ry);
		out.y = v.y + (w.z * rx - w.x * rz);
		out.z = v.z + (w.x * ry - w.y * rx);
		return out;
	}

	/**
	 * The world torque (N·m) that gives this angular acceleration (rad/s²,
	 * body axes), through the body's inertia. Axes it can't turn around get
	 * none.
	 */
	torqueFor (alpha: Vec3, out: Vec3): Vec3 {
		const r = this.inertia.rotation, m = this.inertia.moments;
		const p = unrotateInto(alpha, r, this._b);
		p.x *= Number.isFinite(m.x) ? m.x : 0;
		p.y *= Number.isFinite(m.y) ? m.y : 0;
		p.z *= Number.isFinite(m.z) ? m.z : 0;
		rotateInto(p, r, p);
		return this.toWorld(p, out);
	}

	/** Degrees from upright. */
	tilt (): number {
		return Math.acos(clamp(this.up.y, -1, 1)) / DEG;
	}

	/** Nose-up pitch (radians, -PI/2..PI/2). */
	pitch (): number {
		return Math.asin(clamp(this.forward.y, -1, 1));
	}

	/** Right-side-down roll (radians, -PI..PI: past PI/2 it's upside down). */
	roll (): number {
		return Math.atan2(this.left.y, this.up.y);
	}

	/** Heading (radians): 0 along +Z, PI/2 towards +X. */
	heading (): number {
		const f = this.forward;
		if (Math.abs(f.x) + Math.abs(f.z) < 1e-6) return Math.atan2(-this.up.x, -this.up.z);
		return Math.atan2(f.x, f.z);
	}
}
