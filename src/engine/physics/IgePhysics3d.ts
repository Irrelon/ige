import type JoltApi from "jolt-physics";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { invertMat4 } from "@/engine/webgl/IgeRaycast";
import { IgeRagdoll3d, type IgeRagdollOptions } from "@/engine/physics/IgeRagdoll3d";
import { IgePhysicsCharacter3d, type IgePhysicsCharacterOptions } from "@/engine/physics/IgePhysicsCharacter3d";
import { matrixToQuaternion } from "@/engine/webgl/IgeModelParts";

export { matrixToQuaternion };

type Jolt = typeof JoltApi;
type Vec3 = { x: number; y: number; z: number };
type Quat = { x: number; y: number; z: number; w: number };

/** A collision shape, in IGE world units. */
export type IgePhysicsShape =
	| { type: "box"; halfExtents: Vec3 }
	| { type: "sphere"; radius: number }
	/** Upright (along Y); halfHeight is half the straight part between the two caps. */
	| { type: "capsule"; radius: number; halfHeight: number }
	/**
	 * The triangles of a geometry (e.g. the entity's own _geometryData),
	 * scaled by the entity's scale: level geometry and terrain. Static and
	 * kinematic bodies only.
	 */
	| { type: "mesh"; geometry: IgeGeometryData3d }
	/** The convex hull of a geometry's vertices, scaled by the entity's scale: props of any shape, dynamic too. */
	| { type: "convex"; geometry: IgeGeometryData3d }
	/**
	 * Several shapes as one body (a table from a top and legs, an L-shaped
	 * wall). Child positions and rotations are relative to the body. Mesh
	 * and heightfield children make the body static-only.
	 */
	| { type: "compound"; children: { shape: IgePhysicsShape; position?: Vec3; rotation?: Quat }[] }
	/**
	 * Grid terrain: `size` x `size` heights (IGE units, rows along x, then
	 * along z) `spacing` units apart, starting at the entity's origin and
	 * running along +x and +z. Lighter than a mesh for regular terrain.
	 * Static only.
	 */
	| { type: "heightfield"; heights: ArrayLike<number>; size: number; spacing: number };

export interface IgePhysicsBodyOptions {
	/** "dynamic" (default) is moved by the simulation, "static" never moves, "kinematic" follows its entity. */
	type?: "dynamic" | "static" | "kinematic";
	/** Collision layer (see IgePhysics3dOptions.layers); default "static" for static bodies, else "moving". */
	layer?: string;
	/**
	 * Emit "impact" events on the body when its velocity changes by more
	 * than this (IGE units per second) in one step, i.e. it hit something:
	 * sounds, damage from a falling crate. true uses 100 (1 m/s at 100
	 * units per metre).
	 */
	impacts?: boolean | number;
	shape: IgePhysicsShape;
	/** Where the shape's centre sits relative to the entity's origin (IGE units), e.g. half a character's height. */
	offset?: Vec3;
	/** Keep the body upright (characters): the simulation moves it but never turns it; the entity keeps its own rotation. */
	lockRotation?: boolean;
	/** Default 0.5. */
	friction?: number;
	/** Bounciness 0-1, default 0. */
	restitution?: number;
	/** kg per cubic metre, default 1000 (water). */
	density?: number;
	/** Default 0.05. */
	linearDamping?: number;
	/** Default 0.05. */
	angularDamping?: number;
	/** Scales gravity for this body, default 1. */
	gravityFactor?: number;
	/** Continuous collision for small fast bodies (debris, projectiles) so they don't tunnel through walls. */
	ccd?: boolean;
}

export interface IgePhysics3dOptions {
	/** IGE world units per metre (default 100). The simulation runs in metres, as physics engines expect. */
	unitsPerMetre: number;
	/** Gravity along Y in metres per second squared (default -9.81). */
	gravity: number;
	/** Seconds per simulation step (default 1/60). */
	fixedTimeStep: number;
	/** Most steps run in one update to catch up after a slow frame (default 4). */
	maxSubSteps: number;
	/**
	 * Draw dynamic bodies' entities between the last two steps, by how far
	 * the clock is into the next step (default true), so motion is smooth
	 * when the display refreshes faster or slower than the step rate (e.g.
	 * 120 Hz screens). Entities then lag the simulation by under one step.
	 */
	interpolate: boolean;
	/**
	 * Use Jolt's multithreaded build: "auto" (default) when the page is
	 * cross-origin isolated (served with COOP/COEP headers, needed for
	 * SharedArrayBuffer), true to require it, false never.
	 */
	threads: boolean | "auto";
	/** Capacity limits (Jolt allocates for them up front). */
	maxBodies: number;
	maxBodyPairs: number;
	/** Keep at about 20000 or less: Jolt sizes a per-step buffer from this. */
	maxContactConstraints: number;
	/**
	 * Collision layers. Static layers hold bodies that never move (they
	 * don't collide with each other, and Jolt indexes them apart); every
	 * other pair of layers collides unless listed in `ignore`. Default:
	 * "static" and "moving".
	 * @example #Corpses that the living walk through
	 *     layers: [{ name: "static", static: true }, { name: "moving" }, { name: "corpses" }],
	 *     ignore: [["moving", "corpses"]]
	 */
	layers: { name: string; static?: boolean }[];
	/** Pairs of layers that don't collide. */
	ignore: [string, string][];
}

/** What an "impact" event reports. */
export interface IgePhysicsImpact {
	/** How much the body's velocity changed in the step (IGE units per second). */
	speed: number;
	/** Bodies touching it after the step. */
	others: IgePhysicsBody3d[];
}

export interface IgePhysicsRaycastOptions {
	/** Hit what this layer collides with (default "moving": everything but layers it ignores). */
	layer?: string;
}

export interface IgePhysicsRaycastHit {
	body: IgePhysicsBody3d;
	entity: IgeEntity;
	/** World position of the hit (IGE units). */
	point: Vec3;
	/** World surface normal at the hit. */
	normal: Vec3;
	/** Distance from the ray origin (IGE units). */
	distance: number;
}


const DEFAULTS: IgePhysics3dOptions = {
	unitsPerMetre: 100,
	gravity: -9.81,
	fixedTimeStep: 1 / 60,
	maxSubSteps: 4,
	interpolate: true,
	threads: "auto",
	maxBodies: 10240,
	maxBodyPairs: 65536,
	maxContactConstraints: 20000,
	layers: [{ name: "static", static: true }, { name: "moving" }],
	ignore: []
};

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
	_physics: IgePhysics3d;
	_body: JoltApi.Body;
	_id: JoltApi.BodyID;
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
	_impactVelocity = new Float64Array(3);

	constructor (physics: IgePhysics3d, entity: IgeEntity, options: IgePhysicsBodyOptions, body: JoltApi.Body) {
		super();
		this._physics = physics;
		this.entity = entity;
		this.type = options.type || "dynamic";
		this.options = options;
		this._body = body;
		this._id = body.GetID();
		this._offset = options.offset ? { ...options.offset } : { x: 0, y: 0, z: 0 };
		if (options.impacts) {
			this._impactThreshold = (options.impacts === true ? 100 : options.impacts) / physics._options.unitsPerMetre;
		}
		this._capture(true);
	}

	/** Record the body's transform as the latest step's (and the previous one's too when resetting). */
	_capture (reset: boolean = false): void {
		const u = this._physics._options.unitsPerMetre;
		const p = this._body.GetPosition(), r = this._body.GetRotation();
		const previous = this._previous, current = this._current;
		if (!reset) previous.set(current);
		current[0] = p.GetX() * u; current[1] = p.GetY() * u; current[2] = p.GetZ() * u;
		current[3] = r.GetX(); current[4] = r.GetY(); current[5] = r.GetZ(); current[6] = r.GetW();
		if (reset) previous.set(current);
		this._moving = true;
	}

	/** Linear velocity in IGE units per second. */
	velocity (): Vec3 {
		const v = this._physics._bodies.GetLinearVelocity(this._id);
		const u = this._physics._options.unitsPerMetre;
		return { x: v.GetX() * u, y: v.GetY() * u, z: v.GetZ() * u };
	}

	/** Set the linear velocity in IGE units per second (wakes the body). */
	setVelocity (x: number, y: number, z: number): this {
		const u = this._physics._options.unitsPerMetre;
		const vec = this._physics._vec;
		vec.Set(x / u, y / u, z / u);
		this._physics._bodies.SetLinearVelocity(this._id, vec);
		return this;
	}

	/**
	 * Set the horizontal velocity and keep the vertical one (so the body
	 * still falls and lands), as character movement usually wants.
	 */
	setVelocityXZ (x: number, z: number): this {
		const bodies = this._physics._bodies;
		const v = bodies.GetLinearVelocity(this._id);
		const u = this._physics._options.unitsPerMetre;
		const vec = this._physics._vec;
		vec.Set(x / u, v.GetY(), z / u);
		bodies.SetLinearVelocity(this._id, vec);
		return this;
	}

	/** Push the body: an impulse in kg * IGE units per second, at its centre or at a world point. */
	applyImpulse (x: number, y: number, z: number, at?: Vec3): this {
		const u = this._physics._options.unitsPerMetre;
		const vec = this._physics._vec;
		vec.Set(x / u, y / u, z / u);
		if (at) {
			const point = this._physics._rvec;
			point.Set(at.x / u, at.y / u, at.z / u);
			this._physics._bodies.AddImpulse(this._id, vec, point);
		} else {
			this._physics._bodies.AddImpulse(this._id, vec);
		}
		return this;
	}

	/** Mass in kg. */
	mass (): number {
		const inverse = this._body.GetMotionProperties().GetInverseMass();
		return inverse > 0 ? 1 / inverse : Infinity;
	}

	/** Move the body (and its entity) to a world position, e.g. a respawn, keeping its velocity at zero. */
	teleport (x: number, y: number, z: number): this {
		const physics = this._physics;
		const u = physics._options.unitsPerMetre;
		const q = this.type === "dynamic" && !this.options.lockRotation ? physics._bodies.GetRotation(this._id) : physics._identity;
		const o = this._worldOffset(q);
		physics._rvec.Set((x + o.x) / u, (y + o.y) / u, (z + o.z) / u);
		physics._bodies.SetPositionAndRotation(this._id, physics._rvec, q, physics._jolt.EActivation_Activate);
		physics._vec.Set(0, 0, 0);
		if (this.type !== "static") physics._bodies.SetLinearVelocity(this._id, physics._vec);
		this.entity.translateTo(x, y, z);
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
		if (val) {
			this._physics._bodies.AddBody(this._id, this._physics._jolt.EActivation_Activate);
			this._capture(true);
		} else {
			this._physics._bodies.RemoveBody(this._id);
		}
		return this;
	}

	/** Remove the body from the world and free it. */
	destroy (): void {
		this._physics.removeBody(this);
	}

	/** The shape offset rotated by a body rotation (IGE units). */
	_worldOffset (q: JoltApi.Quat | Quat): Vec3 {
		const o = this._offset;
		if (!o.x && !o.y && !o.z) return o;
		const qx = typeof (q as JoltApi.Quat).GetX === "function" ? (q as JoltApi.Quat).GetX() : (q as Quat).x;
		const qy = typeof (q as JoltApi.Quat).GetY === "function" ? (q as JoltApi.Quat).GetY() : (q as Quat).y;
		const qz = typeof (q as JoltApi.Quat).GetZ === "function" ? (q as JoltApi.Quat).GetZ() : (q as Quat).z;
		const qw = typeof (q as JoltApi.Quat).GetW === "function" ? (q as JoltApi.Quat).GetW() : (q as Quat).w;
		return rotateVector(o, qx, qy, qz, qw);
	}
}

export interface IgePhysicsSensorOptions {
	shape: IgePhysicsShape;
	/** Report what this layer collides with (default "moving"). */
	layer?: string;
	/** Where the shape's centre sits relative to the entity's origin (IGE units). */
	offset?: Vec3;
	/** Also report static bodies (walls, floors) that overlap (default false). */
	includeStatic?: boolean;
}

/**
 * A trigger volume: a shape that follows its entity, doesn't collide, and
 * reports bodies entering and leaving it ("enter" and "exit" events with
 * the IgePhysicsBody3d) after every simulation step, e.g. pickups, damage
 * zones, doors and checkpoints. Overlaps are found by querying the world
 * on the main thread, so events work with Jolt's threaded build too.
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

/** Whether a shape can only be used by static or kinematic bodies. */
function staticOnlyShape (shape: IgePhysicsShape): boolean {
	if (shape.type === "mesh" || shape.type === "heightfield") return true;
	if (shape.type === "compound") return shape.children.some((child) => staticOnlyShape(child.shape));
	return false;
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


/**
 * 3D rigid-body physics for IGE entities, running Jolt Physics
 * (https://github.com/jrouwe/JoltPhysics) in WebAssembly. Jolt is loaded
 * only when a world is created, and its multithreaded build is used when
 * the page is cross-origin isolated.
 *
 * Shapes, positions and velocities are in IGE world units; the simulation
 * runs in metres (unitsPerMetre, default 100) because physics engines'
 * tolerances assume real-world sizes. Bodies belong to entities: dynamic
 * bodies move their entity after every step (position, and rotation as a
 * quaternion unless lockRotation), kinematic bodies follow their entity,
 * static bodies stay where their entity was. Entities with dynamic bodies
 * should be mounted to the scene (or a parent that doesn't move).
 *
 * start() steps the world once per engine frame, after entity updates, at
 * a fixed time step.
 * @example #Crates, a floor and a character
 *     const physics = await IgePhysics3d.create();
 *     physics.addBody(floor, { type: "static", shape: { type: "box", halfExtents: { x: 1000, y: 2, z: 1000 } } });
 *     physics.addBody(crate, { shape: { type: "box", halfExtents: { x: 25, y: 25, z: 25 } } });
 *     const body = physics.addBody(hero, {
 *         shape: { type: "capsule", radius: 28, halfHeight: 60 },
 *         offset: { x: 0, y: 88, z: 0 },   // capsule centre above the feet
 *         lockRotation: true
 *     });
 *     physics.start();
 *     // each frame, from input:
 *     body.setVelocityXZ(moveX * 260, moveZ * 260);
 */
export class IgePhysics3d extends IgeEventingClass {
	classId = "IgePhysics3d";

	_jolt: Jolt;
	_options: IgePhysics3dOptions;
	_interface: JoltApi.JoltInterface;
	_system: JoltApi.PhysicsSystem;
	_bodies: JoltApi.BodyInterface;
	_threaded: boolean;
	_list: IgePhysicsBody3d[] = [];
	_ragdolls: IgeRagdoll3d[] = [];
	_ragdollBodies: Map<IgeRagdoll3d, IgePhysicsBody3d[]> = new Map();
	_layers: Map<string, number> = new Map();
	_layerFilters: Map<number, { bp: JoltApi.DefaultBroadPhaseLayerFilter; object: JoltApi.DefaultObjectLayerFilter }> = new Map();
	_impactBodies: IgePhysicsBody3d[] = [];
	_impactCollector?: JoltApi.CollideShapeAllHitCollisionCollector;
	_sensors: IgePhysicsSensor3d[] = [];
	_characters: IgePhysicsCharacter3d[] = [];
	_characterCollision?: JoltApi.CharacterVsCharacterCollisionSimple;
	_sensorCollector?: JoltApi.CollideShapeAllHitCollisionCollector;
	_sensorSettings?: JoltApi.CollideShapeSettings;
	_unitScale?: JoltApi.Vec3;
	_byBodyId: Map<number, IgePhysicsBody3d> = new Map();
	_accumulator: number = 0;
	_behaviourId: string;
	_stepMs: number = 0;
	_stepsLastUpdate: number = 0;
	_bodiesAddedSinceOptimize: number = 0;

	// Reused Jolt values (never allocate per call)
	_vec: JoltApi.Vec3;
	_rvec: JoltApi.RVec3;
	_quat: JoltApi.Quat;
	_identity: JoltApi.Quat;
	_ray: JoltApi.RRayCast;
	_raySettings: JoltApi.RayCastSettings;
	_rayCollector: JoltApi.CastRayClosestHitCollisionCollector;
	_bpFilter: JoltApi.DefaultBroadPhaseLayerFilter;
	_objectFilter: JoltApi.DefaultObjectLayerFilter;
	_bodyFilter: JoltApi.BodyFilter;
	_shapeFilter: JoltApi.ShapeFilter;
	_pendingDestroy: object[] = [];

	/**
	 * Load Jolt and create a world. Rejects if Jolt can't load (e.g. the
	 * jolt-physics package isn't installed).
	 */
	static async create (options: Partial<IgePhysics3dOptions> = {}): Promise<IgePhysics3d> {
		const opts = { ...DEFAULTS, ...options };
		const isolated = typeof globalThis !== "undefined" && (globalThis as any).crossOriginIsolated === true;
		const threaded = opts.threads === true || (opts.threads === "auto" && isolated);
		if (opts.threads === true && !isolated) {
			throw new Error("IgePhysics3d: threads need a cross-origin isolated page (COOP/COEP headers)");
		}

		let init: (target?: object) => Promise<Jolt>;
		if (threaded) {
			// @ts-ignore - subpath export (the package's typings cover the main entry)
			init = (await import(/* webpackChunkName: "jolt-physics-mt" */ "jolt-physics/wasm-compat-multithread")).default;
		} else {
			init = (await import(/* webpackChunkName: "jolt-physics" */ "jolt-physics")).default as unknown as typeof init;
		}
		const jolt = await init();
		return new IgePhysics3d(jolt, opts, threaded);
	}

	constructor (jolt: Jolt, options: IgePhysics3dOptions, threaded: boolean) {
		super();
		this._jolt = jolt;
		this._options = options;
		this._threaded = threaded;
		this._behaviourId = `physics3d_${Math.random().toString(36).slice(2)}`;

		const settings = new jolt.JoltSettings();
		settings.mMaxBodies = options.maxBodies;
		settings.mMaxBodyPairs = options.maxBodyPairs;
		settings.mMaxContactConstraints = options.maxContactConstraints;
		if (threaded) {
			const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
			settings.mMaxWorkerThreads = Math.max(1, Math.min(8, cores - 1));
		}

		// Collision layers: static layers don't collide with each other, every
		// other pair does unless ignored. Jolt indexes static and moving
		// bodies in separate broad phase layers.
		const layers = options.layers;
		if (!layers.length) throw new Error("IgePhysics3d: at least one collision layer is needed");
		layers.forEach((layer, index) => this._layers.set(layer.name, index));
		const pairs = new jolt.ObjectLayerPairFilterTable(layers.length);
		for (let a = 0; a < layers.length; a++) {
			for (let b = a; b < layers.length; b++) {
				if (layers[a].static && layers[b].static) continue;
				const ignored = options.ignore.some(([x, y]) =>
					(x === layers[a].name && y === layers[b].name) || (x === layers[b].name && y === layers[a].name));
				if (!ignored) pairs.EnableCollision(a, b);
			}
		}
		const bpStatic = new jolt.BroadPhaseLayer(0);
		const bpMoving = new jolt.BroadPhaseLayer(1);
		const bpInterface = new jolt.BroadPhaseLayerInterfaceTable(layers.length, 2);
		layers.forEach((layer, index) => bpInterface.MapObjectToBroadPhaseLayer(index, layer.static ? bpStatic : bpMoving));
		settings.mObjectLayerPairFilter = pairs;
		settings.mBroadPhaseLayerInterface = bpInterface;
		settings.mObjectVsBroadPhaseLayerFilter = new jolt.ObjectVsBroadPhaseLayerFilterTable(bpInterface, 2, pairs, layers.length);

		this._interface = new jolt.JoltInterface(settings);
		jolt.destroy(settings);
		jolt.destroy(bpStatic);
		jolt.destroy(bpMoving);

		this._system = this._interface.GetPhysicsSystem();
		this._bodies = this._system.GetBodyInterface();
		this._vec = new jolt.Vec3(0, options.gravity, 0);
		this._system.SetGravity(this._vec);

		this._rvec = new jolt.RVec3(0, 0, 0);
		this._quat = new jolt.Quat(0, 0, 0, 1);
		this._identity = new jolt.Quat(0, 0, 0, 1);
		this._ray = new jolt.RRayCast();
		this._raySettings = new jolt.RayCastSettings();
		this._rayCollector = new jolt.CastRayClosestHitCollisionCollector();
		const moving = this._defaultLayer(false);
		const filters = this._filtersFor(moving);
		this._bpFilter = filters.bp;
		this._objectFilter = filters.object;
		this._bodyFilter = new jolt.BodyFilter();
		this._shapeFilter = new jolt.ShapeFilter();
	}

	/** Index of a collision layer by name. */
	_layerIndex (name: string): number {
		const index = this._layers.get(name);
		if (index === undefined) throw new Error(`IgePhysics3d: no collision layer "${name}" (see the layers option)`);
		return index;
	}

	/** The layer bodies go on by default: "static" / "moving" if they exist, else the first static / non-static layer. */
	_defaultLayer (isStatic: boolean): number {
		const named = this._layers.get(isStatic ? "static" : "moving");
		if (named !== undefined) return named;
		const index = this._options.layers.findIndex((layer) => !!layer.static === isStatic);
		return index >= 0 ? index : 0;
	}

	/** Query filters that test what a layer collides with (cached per layer). */
	_filtersFor (layer: number): { bp: JoltApi.DefaultBroadPhaseLayerFilter; object: JoltApi.DefaultObjectLayerFilter } {
		let filters = this._layerFilters.get(layer);
		if (!filters) {
			filters = {
				bp: new this._jolt.DefaultBroadPhaseLayerFilter(this._interface.GetObjectVsBroadPhaseLayerFilter(), layer),
				object: new this._jolt.DefaultObjectLayerFilter(this._interface.GetObjectLayerPairFilter(), layer)
			};
			this._layerFilters.set(layer, filters);
		}
		return filters;
	}

	/** Whether Jolt's multithreaded build is running. */
	threaded (): boolean {
		return this._threaded;
	}

	/** IGE units per metre. */
	unitsPerMetre (): number {
		return this._options.unitsPerMetre;
	}

	/**
	 * Rebuild Jolt's broad phase (its spatial index of bodies) for fast
	 * queries. start() does this; call it again after adding many bodies
	 * at once, e.g. after loading a level.
	 */
	optimize (): this {
		this._system.OptimizeBroadPhase();
		this._bodiesAddedSinceOptimize = 0;
		return this;
	}

	/** Step the world every engine frame (after entity updates) until stop(). */
	start (): this {
		this.optimize();
		ige.engine.addBehaviour(IgeBehaviourType.postUpdate, this._behaviourId, (_engine: unknown, tickDelta: number) => {
			this.update((tickDelta || 0) / 1000);
		});
		return this;
	}

	/** Stop stepping the world. */
	stop (): this {
		ige.engine.removeBehaviour(IgeBehaviourType.postUpdate, this._behaviourId);
		return this;
	}

	/**
	 * Create a body for an entity at the entity's current world position
	 * and rotation.
	 */
	addBody (entity: IgeEntity, options: IgePhysicsBodyOptions): IgePhysicsBody3d {
		const jolt = this._jolt;
		const type = options.type || "dynamic";
		const u = this._options.unitsPerMetre;
		if (type === "dynamic" && staticOnlyShape(options.shape)) {
			throw new Error("IgePhysics3d: mesh and heightfield shapes can't be dynamic; use convex or compound shapes, or a static or kinematic body");
		}
		const layer = options.layer ? this._layerIndex(options.layer) : this._defaultLayer(type === "static");

		// Start at the entity's world transform
		entity.updateTransform();
		const world = entity._worldMatrix4?.matrix;
		const scale = world
			? { x: Math.hypot(world[0], world[1], world[2]), y: Math.hypot(world[4], world[5], world[6]), z: Math.hypot(world[8], world[9], world[10]) }
			: { x: 1, y: 1, z: 1 };
		const { shape, cleanup } = this._createShape(options.shape, scale);
		const position = world ? { x: world[12], y: world[13], z: world[14] } : { ...entity._translate };
		const rotation = options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : world ? matrixToQuaternion(world) : { x: 0, y: 0, z: 0, w: 1 };
		const offset = options.offset ? rotateVector(options.offset, rotation.x, rotation.y, rotation.z, rotation.w) : { x: 0, y: 0, z: 0 };

		this._rvec.Set((position.x + offset.x) / u, (position.y + offset.y) / u, (position.z + offset.z) / u);
		this._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
		const motion = type === "static" ? jolt.EMotionType_Static : type === "kinematic" ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic;
		const settings = new jolt.BodyCreationSettings(shape, this._rvec, this._quat, motion, layer);
		settings.mFriction = options.friction ?? 0.5;
		settings.mRestitution = options.restitution ?? 0;
		settings.mLinearDamping = options.linearDamping ?? 0.05;
		settings.mAngularDamping = options.angularDamping ?? 0.05;
		settings.mGravityFactor = options.gravityFactor ?? 1;
		if (options.lockRotation) {
			settings.mAllowedDOFs = jolt.EAllowedDOFs_TranslationX | jolt.EAllowedDOFs_TranslationY | jolt.EAllowedDOFs_TranslationZ;
		}
		if (options.ccd) settings.mMotionQuality = jolt.EMotionQuality_LinearCast;

		const body = this._bodies.CreateBody(settings);
		jolt.destroy(settings);
		cleanup?.();
		this._bodies.AddBody(body.GetID(), type === "static" ? jolt.EActivation_DontActivate : jolt.EActivation_Activate);

		// Many new bodies at once (a level loading): rebuild the broad phase
		if (++this._bodiesAddedSinceOptimize > 256) this.optimize();

		const wrapper = new IgePhysicsBody3d(this, entity, options, body);
		this._list.push(wrapper);
		if (wrapper._impactThreshold > 0) this._impactBodies.push(wrapper);
		this._byBodyId.set(wrapper._id.GetIndexAndSequenceNumber(), wrapper);
		(entity as any)._physicsBody3d = wrapper;
		return wrapper;
	}

	/** Remove a body from the world and free it. */
	removeBody (body: IgePhysicsBody3d): void {
		if (body._destroyed) return;
		if (body._enabled) this._bodies.RemoveBody(body._id);
		this._bodies.DestroyBody(body._id);
		body._destroyed = true;
		const index = this._list.indexOf(body);
		if (index >= 0) this._list.splice(index, 1);
		const impactIndex = this._impactBodies.indexOf(body);
		if (impactIndex >= 0) this._impactBodies.splice(impactIndex, 1);
		this._byBodyId.delete(body._id.GetIndexAndSequenceNumber());
		if ((body.entity as any)._physicsBody3d === body) (body.entity as any)._physicsBody3d = undefined;
	}

	/**
	 * Turn a skinned entity into a ragdoll: capsule bodies along its bones,
	 * starting from its current pose, that drive its skeleton from now on
	 * (its animation stops). destroy() the ragdoll before animating the
	 * entity again.
	 * @example #Ragdoll a zombie when it dies, thrown along the killing blow
	 *     const ragdoll = physics.createRagdoll(zombie, { velocity: { x: dx * 400, y: 150, z: dz * 400 } });
	 */
	createRagdoll (entity: IgeEntity, options: IgeRagdollOptions = {}): IgeRagdoll3d {
		const ragdoll = new IgeRagdoll3d(this, entity, options);
		this._ragdolls.push(ragdoll);

		// Register the parts so raycasts, sensors and impacts report the entity
		const wrappers = ragdoll._parts.map((part) => {
			const wrapper = new IgePhysicsBody3d(this, entity, { type: "dynamic", shape: { type: "sphere", radius: 1 } }, part.body);
			this._byBodyId.set(wrapper._id.GetIndexAndSequenceNumber(), wrapper);
			return wrapper;
		});
		this._ragdollBodies.set(ragdoll, wrappers);
		return ragdoll;
	}

	/** Remove a ragdoll's bodies and joints. */
	removeRagdoll (ragdoll: IgeRagdoll3d): void {
		const index = this._ragdolls.indexOf(ragdoll);
		if (index >= 0) this._ragdolls.splice(index, 1);
		for (const wrapper of this._ragdollBodies.get(ragdoll) || []) {
			this._byBodyId.delete(wrapper._id.GetIndexAndSequenceNumber());
			wrapper._destroyed = true;
		}
		this._ragdollBodies.delete(ragdoll);
		ragdoll._free();
	}

	/**
	 * Add a trigger volume that follows an entity and reports bodies
	 * entering and leaving it (see IgePhysicsSensor3d).
	 */
	addSensor (entity: IgeEntity, options: IgePhysicsSensorOptions): IgePhysicsSensor3d {
		const body = this.addBody(entity, { type: "kinematic", shape: options.shape, offset: options.offset, layer: options.layer });
		this._bodies.SetIsSensor(body._id, true);
		body._sensor = true;
		const sensor = new IgePhysicsSensor3d(body, !!options.includeStatic);
		this._sensors.push(sensor);
		return sensor;
	}

	/** Remove a sensor (bodies inside it get no "exit" event). */
	removeSensor (sensor: IgePhysicsSensor3d): void {
		const index = this._sensors.indexOf(sensor);
		if (index >= 0) this._sensors.splice(index, 1);
		this.removeBody(sensor.body);
		sensor._overlapping.clear();
	}

	/**
	 * Add a player character (Jolt's CharacterVirtual) to an entity: a
	 * capsule with its feet at the entity's origin that walks where it's
	 * told with move(), up stairs and slopes, and pushes other bodies with
	 * a limited strength (see IgePhysicsCharacter3d).
	 * @example #A player
	 *     const hero = physics.addCharacter(entity, { radius: 28, height: 130 });
	 *     // each frame, from input:
	 *     hero.move(moveX * 260, moveZ * 260);
	 */
	addCharacter (entity: IgeEntity, options: IgePhysicsCharacterOptions): IgePhysicsCharacter3d {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		const radius = options.radius / u, height = options.height / u;
		const halfHeight = Math.max(0.01, height / 2 - radius);

		// Capsule with its bottom at the character's position (the feet)
		const capsule = new jolt.CapsuleShapeSettings(halfHeight, radius, undefined);
		this._vec.Set(0, height / 2, 0);
		const shapeSettings = new jolt.RotatedTranslatedShapeSettings(this._vec, this._identity, capsule);
		const shape = shapeSettings.Create().Get();

		const settings = new jolt.CharacterVirtualSettings();
		settings.mMass = options.mass ?? 80;
		settings.mMaxStrength = options.maxStrength ?? 500;
		settings.mMaxSlopeAngle = ((options.maxSlopeAngle ?? 50) * Math.PI) / 180;
		settings.mShape = shape;
		settings.mInnerBodyShape = shape;
		settings.mInnerBodyLayer = options.layer ? this._layerIndex(options.layer) : this._defaultLayer(false);
		settings.mCharacterPadding = 0.02;
		settings.mPenetrationRecoverySpeed = 1;
		settings.mPredictiveContactDistance = 0.1;
		this._vec.Set(0, 1, 0);
		settings.mUp = this._vec;
		// Contacts below the lower cap's centre hold the character up
		const plane = new jolt.Plane(this._vec, -radius);
		settings.mSupportingVolume = plane;
		jolt.destroy(plane);

		entity.updateTransform();
		const world = entity._worldMatrix4?.matrix;
		const position = world ? { x: world[12], y: world[13], z: world[14] } : { ...entity._translate };
		this._rvec.Set(position.x / u, position.y / u, position.z / u);
		const character = new jolt.CharacterVirtual(settings, this._rvec, this._identity, this._system);
		jolt.destroy(settings);
		jolt.destroy(shapeSettings);

		const update = new jolt.ExtendedUpdateSettings();
		this._vec.Set(0, (options.stepHeight ?? 0.3 * u) / u, 0);
		update.mWalkStairsStepUp = this._vec;

		// Characters collide with each other
		if (!this._characterCollision) this._characterCollision = new jolt.CharacterVsCharacterCollisionSimple();
		this._characterCollision.Add(character);
		character.SetCharacterVsCharacterCollision(this._characterCollision);

		// The inner body is what other bodies, raycasts and sensors meet
		const innerId = character.GetInnerBodyID();
		const inner = this._system.GetBodyLockInterfaceNoLock().TryGetBody(innerId);
		const body = new IgePhysicsBody3d(this, entity, {
			type: "kinematic",
			shape: { type: "capsule", radius: options.radius, halfHeight: halfHeight * u }
		}, inner);
		this._byBodyId.set(body._id.GetIndexAndSequenceNumber(), body);
		(entity as any)._physicsBody3d = body;

		const wrapper = new IgePhysicsCharacter3d(this, entity, character, update, body);
		if (options.layer) {
			const filters = this._filtersFor(this._layerIndex(options.layer));
			wrapper._bpFilter = filters.bp;
			wrapper._objectFilter = filters.object;
		}
		if (options.pushable === false) {
			// Contacts can't push the character (the listener runs during its
			// update, on the main thread)
			const listener = new jolt.CharacterContactListenerJS();
			const noPush = (_character: number, _body: number, _subShape: number, _position: number, _normal: number, ioSettings: number) => {
				jolt.wrapPointer(ioSettings, jolt.CharacterContactSettings).mCanPushCharacter = false;
			};
			listener.OnAdjustBodyVelocity = () => {};
			listener.OnContactValidate = () => true;
			listener.OnCharacterContactValidate = () => true;
			listener.OnContactAdded = noPush;
			listener.OnContactPersisted = noPush;
			listener.OnContactRemoved = () => {};
			listener.OnCharacterContactAdded = noPush;
			listener.OnCharacterContactPersisted = noPush;
			listener.OnCharacterContactRemoved = () => {};
			listener.OnContactSolve = () => {};
			listener.OnCharacterContactSolve = () => {};
			character.SetListener(listener);
			wrapper._listener = listener;
		}
		this._characters.push(wrapper);
		return wrapper;
	}

	/** Remove a character and free it. */
	removeCharacter (character: IgePhysicsCharacter3d): void {
		if (character._destroyed) return;
		character._destroyed = true;
		const index = this._characters.indexOf(character);
		if (index >= 0) this._characters.splice(index, 1);
		this._byBodyId.delete(character.body._id.GetIndexAndSequenceNumber());
		if ((character.entity as any)._physicsBody3d === character.body) (character.entity as any)._physicsBody3d = undefined;
		character.body._destroyed = true;
		if (!character.body._enabled) {
			// The character's destructor removes its inner body from the world
			this._bodies.AddBody(character.body._id, this._jolt.EActivation_DontActivate);
		}
		this._characterCollision?.Remove(character._character);
		this._jolt.destroy(character._character);
		this._jolt.destroy(character._settings);
		if (character._listener) this._jolt.destroy(character._listener);
	}

	/** The body attached to an entity by addBody(), if any. */
	bodyOf (entity: IgeEntity): IgePhysicsBody3d | undefined {
		return (entity as any)._physicsBody3d;
	}

	/**
	 * Advance the simulation by dt seconds in fixed steps (start() calls
	 * this every frame), then move entities to their bodies.
	 */
	update (dt: number): void {
		const step = this._options.fixedTimeStep;
		this._accumulator = Math.min(this._accumulator + dt, step * this._options.maxSubSteps);

		let steps = 0;
		const started = performance.now();
		while (this._accumulator >= step) {
			for (const character of this._characters) character._update(step);
			this._moveKinematicBodies(step);
			if (this._impactBodies.length) this._recordImpactVelocities();
			this._interface.Step(step, 1);
			this._captureBodies();
			if (this._impactBodies.length) this._checkImpacts(step);
			this._accumulator -= step;
			steps++;
		}
		this._stepsLastUpdate = steps;

		// Place entities between the last two steps (every frame, steps or not)
		const alpha = this._options.interpolate ? this._accumulator / step : 1;
		this._syncEntities(alpha);
		for (const character of this._characters) character._sync(alpha);

		if (steps > 0) {
			this._stepMs = performance.now() - started;
			for (const ragdoll of this._ragdolls) {
				if (!ragdoll.asleep()) ragdoll.sync();
			}
			if (this._sensors.length) this._updateSensors();
			this.emit("afterStep", steps);
		}
	}

	/** Counts (bodies include ragdoll parts) and the time the last update spent stepping. */
	stats (): { bodies: number; activeBodies: number; ragdolls: number; stepMs: number; steps: number; threaded: boolean } {
		let ragdollParts = 0;
		for (const ragdoll of this._ragdolls) ragdollParts += ragdoll._parts.length;
		return {
			bodies: this._list.length + ragdollParts,
			ragdolls: this._ragdolls.length,
			activeBodies: this._system.GetNumActiveBodies(this._jolt.EBodyType_RigidBody),
			stepMs: this._stepMs,
			steps: this._stepsLastUpdate,
			threaded: this._threaded
		};
	}

	/**
	 * The nearest body a ray hits (IGE units; direction needn't be unit
	 * length). Static and moving bodies are both tested.
	 */
	raycast (origin: Vec3, direction: Vec3, maxDistance: number, options: IgePhysicsRaycastOptions = {}): IgePhysicsRaycastHit | null {
		const u = this._options.unitsPerMetre;
		const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
		const dx = direction.x / len, dy = direction.y / len, dz = direction.z / len;

		this._rvec.Set(origin.x / u, origin.y / u, origin.z / u);
		this._ray.mOrigin = this._rvec;
		this._vec.Set((dx * maxDistance) / u, (dy * maxDistance) / u, (dz * maxDistance) / u);
		this._ray.mDirection = this._vec;
		this._rayCollector.Reset();
		const filters = options.layer ? this._filtersFor(this._layerIndex(options.layer)) : { bp: this._bpFilter, object: this._objectFilter };
		this._system.GetNarrowPhaseQuery().CastRay(this._ray, this._raySettings, this._rayCollector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);
		if (!this._rayCollector.HadHit()) return null;

		const hit = this._rayCollector.mHit;
		const body = this._byBodyId.get(hit.mBodyID.GetIndexAndSequenceNumber());
		if (!body) return null;
		const distance = hit.mFraction * maxDistance;
		const point = { x: origin.x + dx * distance, y: origin.y + dy * distance, z: origin.z + dz * distance };
		this._rvec.Set(point.x / u, point.y / u, point.z / u);
		const n = body._body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, this._rvec);
		return { body, entity: body.entity, point, normal: { x: n.GetX(), y: n.GetY(), z: n.GetZ() }, distance };
	}

	/** Free every body and the world. */
	destroy (): void {
		this.stop();
		const jolt = this._jolt;
		for (const ragdoll of [...this._ragdolls]) this.removeRagdoll(ragdoll);
		for (const sensor of [...this._sensors]) this.removeSensor(sensor);
		for (const character of [...this._characters]) this.removeCharacter(character);
		if (this._characterCollision) jolt.destroy(this._characterCollision);
		if (this._sensorCollector) jolt.destroy(this._sensorCollector);
		if (this._sensorSettings) jolt.destroy(this._sensorSettings);
		if (this._unitScale) jolt.destroy(this._unitScale);
		for (const body of [...this._list]) this.removeBody(body);
		for (const value of [this._vec, this._rvec, this._quat, this._identity, this._ray, this._raySettings, this._rayCollector,
			this._bodyFilter, this._shapeFilter]) {
			jolt.destroy(value);
		}
		for (const filters of this._layerFilters.values()) {
			jolt.destroy(filters.bp);
			jolt.destroy(filters.object);
		}
		this._layerFilters.clear();
		if (this._impactCollector) jolt.destroy(this._impactCollector);
		jolt.destroy(this._interface);
	}

	/**
	 * Build a Jolt shape. Shapes made from settings (mesh, convex) belong to
	 * the settings until a body takes a reference, so cleanup() frees the
	 * settings after the body is created.
	 */
	_createShape (shape: IgePhysicsShape, scale: Vec3): { shape: JoltApi.Shape; cleanup?: () => void } {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		switch (shape.type) {
			case "box": {
				const hx = shape.halfExtents.x / u, hy = shape.halfExtents.y / u, hz = shape.halfExtents.z / u;
				this._vec.Set(hx, hy, hz);
				// Jolt rounds box corners by the convex radius; keep it within the smallest half extent
				return { shape: new jolt.BoxShape(this._vec, Math.min(0.05, hx * 0.5, hy * 0.5, hz * 0.5), undefined) };
			}
			case "sphere":
				return { shape: new jolt.SphereShape(shape.radius / u, undefined) };
			case "capsule":
				return { shape: new jolt.CapsuleShape(shape.halfHeight / u, shape.radius / u, undefined) };
			case "mesh":
				return this._createMeshShape(shape.geometry, scale);
			case "convex":
				return this._createConvexShape(shape.geometry, scale);
			case "compound":
				return this._createCompoundShape(shape, scale);
			case "heightfield":
				return this._createHeightfieldShape(shape);
		}
	}

	_createCompoundShape (shape: Extract<IgePhysicsShape, { type: "compound" }>, scale: Vec3): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		if (!shape.children.length) throw new Error("IgePhysics3d: a compound shape needs at least one child");
		const settings = new jolt.StaticCompoundShapeSettings();
		const cleanups: (() => void)[] = [];
		const position = new jolt.Vec3(0, 0, 0);
		const rotation = new jolt.Quat(0, 0, 0, 1);
		for (const child of shape.children) {
			const built = this._createShape(child.shape, scale);
			if (built.cleanup) cleanups.push(built.cleanup);
			const p = child.position || { x: 0, y: 0, z: 0 };
			const r = child.rotation || { x: 0, y: 0, z: 0, w: 1 };
			position.Set(p.x / u, p.y / u, p.z / u);
			rotation.Set(r.x, r.y, r.z, r.w);
			settings.AddShapeShape(position, rotation, built.shape, 0);
		}
		jolt.destroy(position);
		jolt.destroy(rotation);
		const result = settings.Create();
		const cleanup = () => {
			jolt.destroy(settings);
			for (const fn of cleanups) fn();
		};
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: compound shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_createHeightfieldShape (shape: Extract<IgePhysicsShape, { type: "heightfield" }>): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		const size = Math.floor(shape.size);
		if (size < 2 || shape.heights.length < size * size) {
			throw new Error(`IgePhysics3d: a heightfield of size ${size} needs ${size * size} heights`);
		}

		// Jolt needs an even sample count: pad an odd grid with a column and
		// row of holes (no collision)
		const count = size % 2 === 0 ? size : size + 1;
		const NO_COLLISION = 3.4028234663852886e38;
		const settings = new jolt.HeightFieldShapeSettings();
		settings.mSampleCount = count;
		settings.mBlockSize = 2;
		this._vec.Set(0, 0, 0);
		settings.mOffset = this._vec;
		this._vec.Set(shape.spacing / u, 1, shape.spacing / u);
		settings.mScale = this._vec;
		const samples = settings.mHeightSamples;
		samples.resize(count * count);
		const heap = jolt.HEAPF32;
		const start = jolt.getPointer(samples.data()) >> 2;
		for (let z = 0; z < count; z++) {
			for (let x = 0; x < count; x++) {
				heap[start + z * count + x] = x < size && z < size ? shape.heights[z * size + x] / u : NO_COLLISION;
			}
		}

		const result = settings.Create();
		const cleanup = () => jolt.destroy(settings);
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: heightfield shape failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_createMeshShape (geometry: IgeGeometryData3d, scale: Vec3): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		const source = geometry.vertices;
		if (!source || source.length < 9) throw new Error(`IgePhysics3d: geometry "${geometry.id}" has no vertices`);
		const vertexCount = Math.floor(source.length / 3);
		const indices = geometry.indices;
		const triangleCount = indices ? Math.floor(indices.length / 3) : Math.floor(vertexCount / 3);

		// Fill both lists in place (no wrapper per vertex)
		const vertices = new jolt.VertexList();
		vertices.resize(vertexCount);
		for (let i = 0; i < vertexCount; i++) {
			const v = vertices.at(i);
			v.x = (source[i * 3] * scale.x) / u;
			v.y = (source[i * 3 + 1] * scale.y) / u;
			v.z = (source[i * 3 + 2] * scale.z) / u;
		}
		const triangles = new jolt.IndexedTriangleList();
		triangles.resize(triangleCount);
		for (let t = 0; t < triangleCount; t++) {
			const triangle = triangles.at(t);
			triangle.set_mIdx(0, indices ? indices[t * 3] : t * 3);
			triangle.set_mIdx(1, indices ? indices[t * 3 + 1] : t * 3 + 1);
			triangle.set_mIdx(2, indices ? indices[t * 3 + 2] : t * 3 + 2);
			triangle.mMaterialIndex = 0;
		}
		const materials = new jolt.PhysicsMaterialList();
		const settings = new jolt.MeshShapeSettings(vertices, triangles, materials);
		const result = settings.Create();
		const cleanup = () => {
			jolt.destroy(settings);
			jolt.destroy(vertices);
			jolt.destroy(triangles);
			jolt.destroy(materials);
		};
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: mesh shape from "${geometry.id}" failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_createConvexShape (geometry: IgeGeometryData3d, scale: Vec3): { shape: JoltApi.Shape; cleanup: () => void } {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		const source = geometry.vertices;
		if (!source || source.length < 12) throw new Error(`IgePhysics3d: geometry "${geometry.id}" needs at least 4 vertices for a convex shape`);
		const settings = new jolt.ConvexHullShapeSettings();
		for (let i = 0; i + 2 < source.length; i += 3) {
			this._vec.Set((source[i] * scale.x) / u, (source[i + 1] * scale.y) / u, (source[i + 2] * scale.z) / u);
			settings.mPoints.push_back(this._vec);
		}
		const result = settings.Create();
		const cleanup = () => jolt.destroy(settings);
		if (result.HasError()) {
			const message = result.GetError().c_str();
			cleanup();
			throw new Error(`IgePhysics3d: convex shape from "${geometry.id}" failed: ${message}`);
		}
		return { shape: result.Get(), cleanup };
	}

	_moveKinematicBodies (dt: number): void {
		const u = this._options.unitsPerMetre;
		for (const body of this._list) {
			if (body.type !== "kinematic" || !body._enabled) continue;
			const entity = body.entity;
			entity.updateTransform();
			const m = entity._worldMatrix4?.matrix;
			if (!m) continue;
			const q = body.options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : matrixToQuaternion(m);
			const o = body._worldOffset(q);
			this._rvec.Set((m[12] + o.x) / u, (m[13] + o.y) / u, (m[14] + o.z) / u);
			this._quat.Set(q.x, q.y, q.z, q.w);
			this._bodies.MoveKinematic(body._id, this._rvec, this._quat, dt);
		}
	}

	/** Remember the velocity of bodies that report impacts, before a step. */
	_recordImpactVelocities (): void {
		for (const body of this._impactBodies) {
			if (!body._enabled || body.type !== "dynamic") continue;
			const v = body._body.GetLinearVelocity();
			body._impactVelocity[0] = v.GetX();
			body._impactVelocity[1] = v.GetY();
			body._impactVelocity[2] = v.GetZ();
		}
	}

	/**
	 * After a step: a body whose velocity changed by more than gravity
	 * explains hit something. Emit "impact" with the bodies touching it.
	 */
	_checkImpacts (dt: number): void {
		const jolt = this._jolt;
		const u = this._options.unitsPerMetre;
		const gravity = this._options.gravity;
		for (const body of this._impactBodies) {
			if (!body._enabled || body.type !== "dynamic" || !body._body.IsActive()) continue;
			const before = body._impactVelocity;
			const v = body._body.GetLinearVelocity();
			const gravityFactor = body._body.GetMotionProperties().GetGravityFactor();
			const dx = v.GetX() - before[0];
			const dy = v.GetY() - (before[1] + gravity * gravityFactor * dt);
			const dz = v.GetZ() - before[2];
			const change = Math.hypot(dx, dy, dz);
			if (change < body._impactThreshold) continue;

			// What it is touching now
			const collector = this._impactCollector || (this._impactCollector = new jolt.CollideShapeAllHitCollisionCollector());
			const settings = this._sensorSettings || (this._sensorSettings = new jolt.CollideShapeSettings());
			const unitScale = this._unitScale || (this._unitScale = new jolt.Vec3(1, 1, 1));
			settings.mMaxSeparationDistance = 0.02;
			collector.Reset();
			const filters = this._filtersFor(body._body.GetObjectLayer());
			this._rvec.Set(0, 0, 0);
			this._system.GetNarrowPhaseQuery().CollideShape(body._body.GetShape(), unitScale, body._body.GetCenterOfMassTransform(),
				settings, this._rvec, collector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);
			settings.mMaxSeparationDistance = 0;
			const others: IgePhysicsBody3d[] = [];
			const hits = collector.mHits;
			for (let i = 0, n = hits.size(); i < n; i++) {
				const other = this._byBodyId.get(hits.at(i).mBodyID2.GetIndexAndSequenceNumber());
				if (other && other !== body && !other._sensor && !others.includes(other)) others.push(other);
			}
			const impact: IgePhysicsImpact = { speed: change * u, others };
			body.emit("impact", impact);
		}
	}

	/** Find what overlaps each sensor and emit "enter" / "exit" for the changes. */
	_updateSensors (): void {
		const jolt = this._jolt;
		const collector = this._sensorCollector || (this._sensorCollector = new jolt.CollideShapeAllHitCollisionCollector());
		const settings = this._sensorSettings || (this._sensorSettings = new jolt.CollideShapeSettings());
		const unitScale = this._unitScale || (this._unitScale = new jolt.Vec3(1, 1, 1));
		const query = this._system.GetNarrowPhaseQuery();
		this._rvec.Set(0, 0, 0);

		for (const sensor of this._sensors) {
			const own = sensor.body;
			if (!own._enabled) continue;
			collector.Reset();
			const filters = this._filtersFor(own._body.GetObjectLayer());
			query.CollideShape(own._body.GetShape(), unitScale, own._body.GetCenterOfMassTransform(), settings, this._rvec,
				collector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);

			const now = new Set<IgePhysicsBody3d>();
			const hits = collector.mHits;
			for (let i = 0, n = hits.size(); i < n; i++) {
				const other = this._byBodyId.get(hits.at(i).mBodyID2.GetIndexAndSequenceNumber());
				if (!other || other === own || !other._enabled) continue;
				if (other.type === "static" && !sensor.includeStatic) continue;
				now.add(other);
			}

			for (const other of now) {
				if (!sensor._overlapping.has(other)) sensor.emit("enter", other);
			}
			for (const other of sensor._overlapping) {
				if (!now.has(other)) sensor.emit("exit", other);
			}
			sensor._overlapping = now;
		}
	}

	/** Move each awake dynamic body's entity to the body. */
	/** Record every awake dynamic body's transform after a step. */
	_captureBodies (): void {
		for (const body of this._list) {
			if (body.type !== "dynamic" || !body._enabled) continue;
			if (body._body.IsActive()) {
				body._capture();
			} else if (body._moving) {
				// Fell asleep: settle on the last step's transform
				body._previous.set(body._current);
			}
		}
	}

	/**
	 * Move each dynamic body's entity to its transform, alpha of the way
	 * from the previous step's to the latest (1 = the latest).
	 */
	_syncEntities (alpha: number): void {
		for (const body of this._list) {
			if (body.type !== "dynamic" || !body._enabled || !body._moving) continue;

			const a = body._previous, b = body._current;
			let x = a[0] + (b[0] - a[0]) * alpha;
			let y = a[1] + (b[1] - a[1]) * alpha;
			let z = a[2] + (b[2] - a[2]) * alpha;
			const entity = body.entity;

			let q: Quat | null = null;
			if (!body.options.lockRotation) {
				// Normalised lerp, along the shorter arc
				const sign = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0 ? -1 : 1;
				const qx = a[3] + (b[3] * sign - a[3]) * alpha, qy = a[4] + (b[4] * sign - a[4]) * alpha;
				const qz = a[5] + (b[5] * sign - a[5]) * alpha, qw = a[6] + (b[6] * sign - a[6]) * alpha;
				const len = Math.hypot(qx, qy, qz, qw) || 1;
				q = { x: qx / len, y: qy / len, z: qz / len, w: qw / len };
			}
			const o = body._worldOffset(q || { x: 0, y: 0, z: 0, w: 1 });
			x -= o.x; y -= o.y; z -= o.z;

			// Into the parent's space when the parent isn't at the origin
			const parentMatrix = (entity._parent as IgeEntity | null)?._worldMatrix4?.matrix;
			if (parentMatrix && !isIdentity(parentMatrix)) {
				const inverse = invertMat4(parentMatrix);
				if (inverse) {
					const lx = inverse[0] * x + inverse[4] * y + inverse[8] * z + inverse[12];
					const ly = inverse[1] * x + inverse[5] * y + inverse[9] * z + inverse[13];
					const lz = inverse[2] * x + inverse[6] * y + inverse[10] * z + inverse[14];
					x = lx; y = ly; z = lz;
					if (q) {
						const pq = matrixToQuaternion(parentMatrix);
						q = multiplyQuat({ x: -pq.x, y: -pq.y, z: -pq.z, w: pq.w }, q);
					}
				}
			}

			entity.translateTo(x, y, z);
			if (q) entity.quaternion(q);

			// Asleep with both steps the same: placed for good until it moves again
			if (!body._body.IsActive() && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
				a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6]) {
				body._moving = false;
			}
		}
	}
}

function isIdentity (m: ArrayLike<number>): boolean {
	return m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
		m[1] === 0 && m[2] === 0 && m[4] === 0 && m[6] === 0 && m[8] === 0 && m[9] === 0 &&
		m[12] === 0 && m[13] === 0 && m[14] === 0;
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
