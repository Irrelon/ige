import type { IgePhysicsBackend, IgePhysicsBodyHandle } from "@/engine/physics/IgePhysicsBackend";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgePhysicsBuoyancy3dApi,
	IgePhysicsBuoyancyOptions,
	IgePhysicsFloatPoint,
	IgePhysicsWaterDrag
} from "@/engine/physics/IgePhysicsCraft3dApi";
import { IgeCraftFrame, vec } from "@/engine/physics/IgePhysicsCraft3dFrame";
import type { IgeWater3d } from "@/engine/physics/IgeWater3d";

/*
 * Buoyancy and water drag, worked out in engine-neutral code and applied
 * as forces through the physics backend.
 *
 * A floating body is a set of sample points, each a column of its volume.
 * A column is fully under when the water reaches its top, and pushes up
 * with the weight of the water it displaces (Archimedes): density × g ×
 * its volume × the share of it under. Each column also drags against the
 * water by its depth (low forwards, high sideways for a hull), and the
 * body's turning is damped while it's in the water. Pushing at the points,
 * not the centre, is what tips a boat back level and lets it pitch over
 * waves.
 */

type Vec3 = IgePhysicsVec3;

/** One sample point, metres, from the entity's origin in body axes. */
export interface IgeFloatSample {
	x: number;
	y: number;
	z: number;
	/** m³. */
	volume: number;
	/** Metres; for points made from a shape's box, the box's half sizes instead (the height is worked out from how it's turned). */
	height: number;
	half?: Vec3;
}

/** What the solver needs from the world each step. */
export interface IgeFloatWorld {
	backend: IgePhysicsBackend;
	handle: IgePhysicsBodyHandle;
	water: IgeWater3d;
	unitsPerMetre: number;
	gravity: number;
	/** Adds a world force (N) at a world point (m), counted as expected (not an impact). */
	addForce (force: Vec3, at: Vec3): void;
	addTorque (torque: Vec3): void;
}

/** Share of critical damping for bobbing on the surface. */
const BOB_DAMPING = 0.3;

const _point = vec();
const _velocity = vec();
const _local = vec();
const _force = vec();
const _current = { x: 0, z: 0 };

/**
 * The buoyancy of one body: its sample points and drag. apply() pushes the
 * body for one step; submerged and the per-point shares are read after.
 */
export class IgeBuoyancySolver {
	points: IgeFloatSample[];
	totalVolume: number;
	drag: Required<IgePhysicsWaterDrag>;
	/** Share of the volume under water at the last apply(), 0..1. */
	submerged: number = 0;
	/** Each point's share under, 0..1. */
	pointSubmerged: Float64Array;
	/**
	 * Height (metres, from the entity's origin in its own axes) to drag the
	 * points at, instead of where they're wet: a boat's keel drag at its
	 * centre of mass doesn't heel it out of a turn (arcade).
	 */
	dragHeight?: number;

	constructor (points: IgeFloatSample[], drag: IgePhysicsWaterDrag = {}) {
		this.points = points;
		this.totalVolume = points.reduce((sum, p) => sum + p.volume, 0) || 1;
		this.drag = { x: drag.x ?? 1, y: drag.y ?? 1, z: drag.z ?? 1, angular: drag.angular ?? 1 };
		this.pointSubmerged = new Float64Array(points.length);
	}

	/**
	 * Push the body for one step: buoyancy and drag at each point under
	 * water, and damping of its turning. The frame must be read for this
	 * step. Returns the share under water.
	 */
	apply (frame: IgeCraftFrame, world: IgeFloatWorld): number {
		const water = world.water;
		const u = world.unitsPerMetre;
		const rho = water.density;
		const g = Math.abs(world.gravity);
		const drag = this.drag;
		const mass = frame.mass;
		const total = this.totalVolume;
		const t = water.time();
		let under = 0;

		for (let i = 0; i < this.points.length; i++) {
			const p = this.points[i];
			_local.x = p.x; _local.y = p.y; _local.z = p.z;
			const w = frame.pointToWorld(_local, _point);
			let height = p.height;
			if (p.half) {
				// A box corner's column: as tall as the box's extent upwards, however it's turned
				const h = p.half, l = frame.left, up = frame.up, f = frame.forward;
				height = 2 * (Math.abs(l.y) * h.x + Math.abs(up.y) * h.y + Math.abs(f.y) * h.z);
			}
			const surface = water.heightAt(w.x * u, w.z * u, t) / u;
			const share = height > 0
				? Math.max(0, Math.min(1, (surface - (w.y - height / 2)) / height))
				: surface > w.y ? 1 : 0;
			this.pointSubmerged[i] = share;
			if (share <= 0) continue;
			under += p.volume * share;

			// Buoyancy: the weight of the water this column displaces
			const lift = rho * g * p.volume * share;

			// Drag against the water (moving with its current), by depth and this point's share of the mass
			water.currentAt(w.x * u, w.z * u, _current);
			frame.pointVelocity(w, _velocity);
			_velocity.x -= _current.x / u;
			_velocity.z -= _current.z / u;
			const rise = _velocity.y;
			frame.toBody(_velocity, _velocity);
			const shareOfMass = mass * (p.volume / total);
			const m = shareOfMass * share;
			_force.x = -m * drag.x * _velocity.x;
			_force.y = -m * drag.y * _velocity.y;
			_force.z = -m * drag.z * _velocity.z;
			frame.toWorld(_force, _force);
			// Bobbing on the surface is damped as waves carry its energy off: a
			// share of critical damping for this column's spring (the
			// water-plane) and mass
			if (share < 1 && height > 0) {
				const spring = (rho * g * p.volume) / height;
				_force.y -= 2 * BOB_DAMPING * Math.sqrt(spring * shareOfMass) * rise;
			}
			if (this.dragHeight !== undefined) {
				// Drag at a set height, buoyancy where the point is (vertical, so its height doesn't matter)
				_local.y = this.dragHeight;
				frame.pointToWorld(_local, w);
			} else {
				// Where the column is wet: its submerged part's middle
				w.y += (share - 1) * height / 2;
			}
			_force.y += lift;
			world.addForce(_force, w);
		}

		const share = under / total;
		this.submerged = share;
		if (share > 0 && drag.angular > 0) {
			// Turning is damped in the water
			const w = frame.toBody(frame.angular, _velocity);
			const k = -drag.angular * share;
			_local.x = w.x * k; _local.y = w.y * k; _local.z = w.z * k;
			world.addTorque(frame.torqueFor(_local, _force));
		}
		return share;
	}
}

/** Floating points (metres) from options in IGE units, sharing a volume. */
export function floatSamples (points: IgePhysicsFloatPoint[], volume: number, defaultHeight: number, u: number): IgeFloatSample[] {
	const given = points.reduce((sum, p) => sum + (p.volume ?? 0), 0);
	const without = points.filter((p) => p.volume === undefined).length;
	const each = without ? Math.max(0, volume - given) / without : 0;
	return points.map((p) => ({
		x: p.position.x / u,
		y: p.position.y / u,
		z: p.position.z / u,
		volume: p.volume ?? each,
		height: (p.height ?? defaultHeight * u) / u
	}));
}

/** A shape's bounding box (IGE units, relative to the shape's own origin), scaled. */
export function shapeBounds (shape: IgePhysicsShape, scale: Vec3 = { x: 1, y: 1, z: 1 }): { min: Vec3; max: Vec3 } {
	switch (shape.type) {
		case "box":
			return {
				min: vec(-shape.halfExtents.x, -shape.halfExtents.y, -shape.halfExtents.z),
				max: vec(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z)
			};
		case "sphere":
			return { min: vec(-shape.radius, -shape.radius, -shape.radius), max: vec(shape.radius, shape.radius, shape.radius) };
		case "capsule":
			return {
				min: vec(-shape.radius, -shape.halfHeight - shape.radius, -shape.radius),
				max: vec(shape.radius, shape.halfHeight + shape.radius, shape.radius)
			};
		case "compound": {
			const min = vec(Infinity, Infinity, Infinity), max = vec(-Infinity, -Infinity, -Infinity);
			for (const child of shape.children) {
				const b = shapeBounds(child.shape, scale);
				const p = child.position || { x: 0, y: 0, z: 0 };
				// A turned child's box: its corners' extent (rotation ignored for spheres is exact enough)
				const r = child.rotation;
				const corners = [b.min.x, b.max.x].flatMap((x) => [b.min.y, b.max.y].flatMap((y) => [b.min.z, b.max.z].map((z) => vec(x, y, z))));
				for (const c of corners) {
					const v = r ? rotateVec(c, r) : c;
					min.x = Math.min(min.x, v.x + p.x); min.y = Math.min(min.y, v.y + p.y); min.z = Math.min(min.z, v.z + p.z);
					max.x = Math.max(max.x, v.x + p.x); max.y = Math.max(max.y, v.y + p.y); max.z = Math.max(max.z, v.z + p.z);
				}
			}
			return { min, max };
		}
		default: {
			const source = shape.type === "heightfield" ? null : shape.geometry.vertices;
			const min = vec(Infinity, Infinity, Infinity), max = vec(-Infinity, -Infinity, -Infinity);
			if (!source || source.length < 3) return { min: vec(), max: vec() };
			for (let i = 0; i + 2 < source.length; i += 3) {
				const x = source[i] * scale.x, y = source[i + 1] * scale.y, z = source[i + 2] * scale.z;
				min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z);
				max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z);
			}
			return { min, max };
		}
	}
}

/** A shape's volume (IGE units cubed), roughly for compound and convex shapes. */
export function shapeVolume (shape: IgePhysicsShape, scale: Vec3 = { x: 1, y: 1, z: 1 }): number {
	switch (shape.type) {
		case "box":
			return 8 * shape.halfExtents.x * shape.halfExtents.y * shape.halfExtents.z;
		case "sphere":
			return (4 / 3) * Math.PI * shape.radius ** 3;
		case "capsule":
			return Math.PI * shape.radius ** 2 * 2 * shape.halfHeight + (4 / 3) * Math.PI * shape.radius ** 3;
		case "compound":
			return shape.children.reduce((sum, child) => sum + shapeVolume(child.shape, scale), 0);
		default: {
			// A hull fills about 60% of its box
			const b = shapeBounds(shape, scale);
			return 0.6 * (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
		}
	}
}

function rotateVec (v: Vec3, q: { x: number; y: number; z: number; w: number }): Vec3 {
	const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
	return vec(v.x + q.w * tx + (q.y * tz - q.z * ty), v.y + q.w * ty + (q.z * tx - q.x * tz), v.z + q.w * tz + (q.x * ty - q.y * tx));
}

/**
 * Eight points, one in each corner of a box (metres, from the entity's
 * origin), sharing a volume: the default for floating any body. Each is
 * the column of its eighth of the box, so it floats right however it's
 * turned.
 */
export function boxCornerSamples (min: Vec3, max: Vec3, volume: number): IgeFloatSample[] {
	const half = vec((max.x - min.x) / 4, (max.y - min.y) / 4, (max.z - min.z) / 4);
	const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
	const samples: IgeFloatSample[] = [];
	for (const sx of [-1, 1]) {
		for (const sy of [-1, 1]) {
			for (const sz of [-1, 1]) {
				samples.push({ x: cx + sx * half.x, y: cy + sy * half.y, z: cz + sz * half.z, volume: volume / 8, height: 2 * half.y, half: { ...half } });
			}
		}
	}
	return samples;
}

/** What a floating body needs from its world (IgePhysics3d). */
export interface IgeFloatHost {
	_backend: IgePhysicsBackend;
	_water: IgeWater3d | null;
	unitsPerMetre (): number;
	gravity (): number;
	removeBuoyancy (buoyancy: IgePhysicsBuoyancy3d): void;
}

/**
 * Any dynamic body floating (or sinking) by its density: crates, wrecks,
 * barrels, ragdolls' parts. Made with IgePhysics3d.addBuoyancy().
 * @example #Crates that float and one that sinks
 *     physics.water({ level: 0 });
 *     physics.addBuoyancy(physics.addBody(crate, { shape: box, density: 300 }));   // floats, 30% under
 *     physics.addBuoyancy(physics.addBody(safe, { shape: box, density: 3000 }));   // sinks
 */
export class IgePhysicsBuoyancy3d implements IgePhysicsBuoyancy3dApi {
	classId = "IgePhysicsBuoyancy3d";
	readonly body: IgePhysicsBody3d;
	_host: IgeFloatHost;
	_solver: IgeBuoyancySolver;
	_frame = new IgeCraftFrame();
	/** The body's shape origin from the entity's origin (metres). */
	_offset: Vec3;
	_destroyed: boolean = false;
	_world: IgeFloatWorld;
	/** How far (metres) its points reach from the entity's origin. */
	_reach: number = 0;

	constructor (host: IgeFloatHost, body: IgePhysicsBody3d, options: IgePhysicsBuoyancyOptions = {}) {
		this._host = host;
		this.body = body;
		const u = host.unitsPerMetre();
		const backend = host._backend;
		this._frame.readMass(backend, body._handle);
		const o = body._offset;
		this._offset = vec(o.x / u, o.y / u, o.z / u);

		// The volume: by default what its mass and density say, so it floats or sinks by density
		const shape = body.options.shape;
		const density = body.options.density ?? 1000;
		const volume = options.volume ?? (body.options.mass === undefined
			? this._frame.mass / density
			: shapeVolume(shape) / (u * u * u));

		let samples: IgeFloatSample[];
		if (options.points?.length) {
			samples = floatSamples(options.points, volume, 0.5, u);
		} else {
			const b = shapeBounds(shape);
			samples = boxCornerSamples(
				vec((b.min.x + o.x) / u, (b.min.y + o.y) / u, (b.min.z + o.z) / u),
				vec((b.max.x + o.x) / u, (b.max.y + o.y) / u, (b.max.z + o.z) / u),
				volume
			);
		}
		this._solver = new IgeBuoyancySolver(samples, options.drag);
		this._reach = samples.reduce((most, s) => Math.max(most, Math.hypot(s.x, s.y, s.z) + s.height), 0);
		this._world = {
			backend,
			handle: body._handle,
			water: null as unknown as IgeWater3d,
			unitsPerMetre: u,
			gravity: host.gravity(),
			addForce: (force, at) => backend.addForce(body._handle, force, at),
			addTorque: (torque) => backend.addTorque(body._handle, torque)
		};
	}

	submerged (): number {
		return this._solver.submerged;
	}

	inWater (): boolean {
		return this._solver.submerged > 0;
	}

	destroy (): void {
		this._host.removeBuoyancy(this);
	}

	/** Before each step: float the body. */
	_preStep (): void {
		const water = this._host._water;
		const body = this.body;
		if (this._destroyed || !water || !body._enabled || body._destroyed || body.type !== "dynamic") return;
		const backend = this._host._backend;
		// Asleep on still water (or the bottom): leave it be
		if (!backend.bodyAwake(body._handle) && !water._waves.length) return;
		const frame = this._frame;
		frame.read(backend, body._handle, this._offset);
		// Nowhere near the water: nothing to do
		const top = water.maxHeight() / this._world.unitsPerMetre;
		if (frame.position.y - this._reach > top) {
			this._solver.submerged = 0;
			return;
		}
		this._world.water = water;
		this._world.gravity = this._host.gravity();
		this._solver.apply(frame, this._world);
	}
}

/** Several bodies floated together (a ragdoll's parts): one floating thing. */
export class IgePhysicsBuoyancyGroup implements IgePhysicsBuoyancy3dApi {
	classId = "IgePhysicsBuoyancyGroup";
	readonly members: IgePhysicsBuoyancy3d[];

	constructor (members: IgePhysicsBuoyancy3d[]) {
		this.members = members;
	}

	submerged (): number {
		let under = 0, total = 0;
		for (const member of this.members) {
			under += member._solver.submerged * member._solver.totalVolume;
			total += member._solver.totalVolume;
		}
		return total > 0 ? under / total : 0;
	}

	inWater (): boolean {
		return this.members.some((member) => member.inWater());
	}

	destroy (): void {
		for (const member of this.members) member.destroy();
	}
}
