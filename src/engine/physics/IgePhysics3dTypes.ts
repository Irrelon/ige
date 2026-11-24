import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgePhysicsBody3d } from "@/engine/physics/IgePhysicsBody3d";
import type { IgePhysicsBackendFactory } from "@/engine/physics/IgePhysicsBackend";

/*
 * The plain types of the 3D physics API: IGE units, numbers and entities.
 * Nothing here depends on the physics engine behind IgePhysics3d, so games
 * and the vehicle API can use them without pulling a backend in.
 */

export interface IgePhysicsVec3 {
	x: number;
	y: number;
	z: number;
}

export interface IgePhysicsQuat {
	x: number;
	y: number;
	z: number;
	w: number;
}

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

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
	/** kg: this mass instead of one from the density (dynamic bodies; inertia from the shape). */
	mass?: number;
	/** Where the centre of mass is relative to the entity's origin, in its own axes (IGE units; dynamic bodies). Default: the shape's. */
	centreOfMass?: Vec3;
	/** Default 0.05. */
	linearDamping?: number;
	/** Default 0.05. */
	angularDamping?: number;
	/** Scales gravity for this body, default 1. */
	gravityFactor?: number;
	/** Continuous collision for small fast bodies (debris, projectiles) so they don't tunnel through walls. */
	ccd?: boolean;
}

/** Tuning for the Jolt backend (IgePhysics3dOptions.jolt). Other backends ignore it. */
export interface IgeJoltTuning {
	/** Most pairs of bodies whose bounds overlap in a step (default 65536). Jolt allocates for it up front. */
	maxBodyPairs?: number;
	/** Most contacts solved in a step (default 20000). Keep at about 20000 or less: Jolt sizes a per-step buffer from it. */
	maxContactConstraints?: number;
}

export interface IgePhysics3dOptions {
	/**
	 * The physics engine behind the world: "jolt" (default, Jolt Physics in
	 * WebAssembly) or a backend factory (see IgePhysicsBackend and
	 * guides/physics-3d.md, "Backends").
	 */
	backend: "jolt" | IgePhysicsBackendFactory;
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
	 * Run on worker threads where the backend can: "auto" (default) when
	 * the page is cross-origin isolated (served with COOP/COEP headers,
	 * needed for SharedArrayBuffer), true to require it, false never. Jolt
	 * has a multithreaded build; a backend without one runs on the main
	 * thread whatever this says.
	 */
	threads: boolean | "auto";
	/** Most bodies the world holds (default 10240). Backends that allocate up front size for it. */
	maxBodies: number;
	/**
	 * Collision layers. Static layers hold bodies that never move (they
	 * don't collide with each other, and backends can index them apart);
	 * every other pair of layers collides unless listed in `ignore`.
	 * Default: "static" and "moving".
	 * @example #Corpses that the living walk through
	 *     layers: [{ name: "static", static: true }, { name: "moving" }, { name: "corpses" }],
	 *     ignore: [["moving", "corpses"]]
	 */
	layers: { name: string; static?: boolean }[];
	/** Pairs of layers that don't collide. */
	ignore: [string, string][];
	/** Tuning for the Jolt backend (ignored by others). */
	jolt: IgeJoltTuning;
	/** @deprecated Use `jolt: { maxBodyPairs }`. Still read when `jolt.maxBodyPairs` isn't set. */
	maxBodyPairs?: number;
	/** @deprecated Use `jolt: { maxContactConstraints }`. Still read when `jolt.maxContactConstraints` isn't set. */
	maxContactConstraints?: number;
}

/** What an "impact" event reports. */
export interface IgePhysicsImpact {
	/** How much the body's velocity changed in the step (IGE units per second): how hard it hit, whatever its mass. */
	speed: number;
	/** speed times its mass (kg * IGE units per second): how hard it was hit, for damage. */
	impulse: number;
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
 * A body's state as plain numbers, safe to send over the network or keep
 * as JSON: where it is and how it's moving. Its options (shape, mass,
 * layer) aren't part of it; a body made with the same options in another
 * world and given this state carries on from it.
 */
export interface IgePhysicsBodyState {
	/** The entity's origin, world IGE units. */
	position: Vec3;
	/** World rotation (always upright for lockRotation bodies). */
	rotation: Quat;
	/** IGE units per second. */
	velocity: Vec3;
	/** Radians per second around each world axis. */
	angularVelocity: Vec3;
	/** Whether the simulation had put it to sleep (it stays asleep until something wakes it). */
	asleep?: boolean;
}

/** A player character's state as plain numbers (see IgePhysicsCharacter3d.getState()). */
export interface IgePhysicsCharacterState {
	/** The feet, world IGE units. */
	position: Vec3;
	/** IGE units per second. */
	velocity: Vec3;
}

/** A ragdoll's state as plain numbers: each part's body, in the order of its parts. */
export interface IgeRagdollState {
	parts: IgePhysicsBodyState[];
}
