import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgePhysics3dOptions, IgePhysicsQuat, IgePhysicsShape, IgePhysicsVec3 } from "@/engine/physics/IgePhysics3dTypes";
import type { IgeVehicleBackend, IgeVehicleBackendSpec } from "@/engine/physics/IgePhysicsVehicle3dBackend";

/*
 * What a physics engine must provide to run behind IgePhysics3d.
 *
 * IgePhysics3d keeps everything that is the same whatever the engine:
 * IGE units, entities, fixed steps and interpolation, layer names, sensor
 * enter and exit, impact events, character and vehicle input, ragdolls
 * posing skeletons, state as JSON. A backend only simulates, and works in
 * SI units: metres, kilograms, seconds, radians and newtons, Y up,
 * rotations as unit quaternions. No IGE entities reach it, and no physics
 * engine types leave it: bodies, characters and ragdolls are opaque
 * handles that only the backend looks inside.
 *
 * Jolt's backend (IgeJoltBackend.ts) is the reference implementation.
 * src/tests/IgePhysics3dContract.test.ts checks a backend against the
 * behaviour games rely on.
 */

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

/** A body in a backend: whatever the backend needs to find it again. IgePhysics3d never looks inside. */
export type IgePhysicsBodyHandle = object;
/** A player character in a backend. */
export type IgePhysicsCharacterHandle = object;
/** A ragdoll's joints (and bodies) in a backend. */
export type IgePhysicsRagdollHandle = object;

/** A collision shape in metres, scaled and ready to build. */
export type IgePhysicsBackendShape =
	| { type: "box"; halfExtents: Vec3 }
	| { type: "sphere"; radius: number }
	/** Upright (along Y); halfHeight is half the straight part. */
	| { type: "capsule"; radius: number; halfHeight: number }
	/** Triangles: x, y, z per vertex; indices three per triangle (null: every three vertices are a triangle). Static and kinematic only. */
	| { type: "mesh"; vertices: Float32Array; indices: Uint32Array | null }
	/** The convex hull of these points (x, y, z each). */
	| { type: "convex"; points: Float32Array }
	| { type: "compound"; children: { shape: IgePhysicsBackendShape; position: Vec3; rotation: Quat }[] }
	/** size x size heights, rows along x then along z, spacing apart, from the body's origin along +x and +z. Static only. */
	| { type: "heightfield"; heights: Float32Array; size: number; spacing: number };

export interface IgePhysicsBackendBodyDesc {
	type: "dynamic" | "static" | "kinematic";
	shape: IgePhysicsBackendShape;
	/** The shape's centre. */
	position: Vec3;
	rotation: Quat;
	/** Index into IgePhysicsBackendConfig.layers. */
	layer: number;
	friction: number;
	restitution: number;
	/** kg per cubic metre. */
	density: number;
	linearDamping: number;
	angularDamping: number;
	gravityFactor: number;
	/** Never rotates (the simulation moves it but doesn't turn it). */
	lockRotation: boolean;
	/** Continuous collision detection, so it doesn't tunnel through thin walls. */
	ccd: boolean;
	/** The centre of mass relative to the body's position (the shape's centre), in the body's frame; left out, the shape's own. */
	centreOfMass?: Vec3;
	/** Collides with nothing; found by touching() (trigger volumes). Always kinematic. */
	sensor: boolean;
	/** kg: this mass instead of one from the density (inertia from the shape, scaled to it). */
	mass?: number;
	/** A dynamic body that setBodyKinematic() can switch to kinematic and back (craft driven from the network). */
	allowKinematic?: boolean;
}

/** A body's inertia (filled in place by readBodyInertia()). */
export interface IgePhysicsBackendInertia {
	/** Principal moments of inertia, kg·m² (Infinity about an axis it can't turn around). */
	moments: Vec3;
	/** The rotation of those principal axes relative to the body's own axes. */
	rotation: Quat;
}

export interface IgePhysicsBackendCharacterDesc {
	/** The feet. */
	position: Vec3;
	radius: number;
	/** Feet to the top of the head. */
	height: number;
	mass: number;
	/** Most force (newtons) it pushes other bodies with. */
	maxStrength: number;
	/** Radians. */
	maxSlopeAngle: number;
	/** Tallest step it walks up. */
	stepHeight: number;
	layer: number;
	/** Whether other bodies can push it. */
	pushable: boolean;
}

/** A character after its last move (filled in place). */
export interface IgePhysicsBackendCharacterState {
	position: Vec3;
	velocity: Vec3;
	/** Standing on walkable ground. */
	onGround: boolean;
	/** The velocity of what it stands on (a moving platform), when on the ground. */
	groundVelocity: Vec3;
}

export interface IgePhysicsBackendRagdollDesc {
	layer: number;
	/** Capsules along their local Y, by centre and rotation. Parts never collide with each other. */
	parts: { position: Vec3; rotation: Quat; radius: number; halfHeight: number }[];
	/**
	 * Swing-twist joints, in world space at creation: the child turns
	 * about `position`, at most `swingLimit` from the twist axis and
	 * `twistLimit` either way around it (radians). planeAxis is any axis
	 * perpendicular to twistAxis.
	 */
	joints: { parent: number; child: number; position: Vec3; twistAxis: Vec3; planeAxis: Vec3; swingLimit: number; twistLimit: number }[];
	density: number;
	friction: number;
	linearDamping: number;
	angularDamping: number;
}

export interface IgePhysicsBackendRaycastHit {
	body: IgePhysicsBodyHandle;
	/** From the ray's origin. */
	distance: number;
	/** World surface normal at the hit. */
	normal: Vec3;
}

/** How IgePhysics3d asks for a world. */
export interface IgePhysicsBackendConfig {
	/** Along Y, metres per second squared. */
	gravity: number;
	/** By index: bodies, characters, ragdolls, vehicles and queries name a layer by its index here. */
	layers: { name: string; static?: boolean }[];
	/** Indices of pairs of layers that don't collide. Static layers never collide with each other either. */
	ignore: [number, number][];
	threads: boolean | "auto";
	maxBodies: number;
	/** Everything IgePhysics3d.create() was given, for backend-scoped options (e.g. `jolt`). */
	options: IgePhysics3dOptions;
}

/**
 * Makes backend worlds. IgePhysics3d.create({ backend }) takes one; the
 * built-in "jolt" is igeJoltPhysics().
 */
export interface IgePhysicsBackendFactory {
	readonly name: string;
	/** Load the engine (if it isn't yet) and make a world. */
	create (config: IgePhysicsBackendConfig): Promise<IgePhysicsBackend>;
}

/** One physics world in some engine. All values are SI units. */
export interface IgePhysicsBackend {
	readonly name: string;
	/** Whether it runs on worker threads. */
	threaded (): boolean;

	/* The world */

	setGravity (y: number): void;
	/** Advance by dt seconds (one fixed step). */
	step (dt: number): void;
	/** Rebuild spatial indices after many bodies were added (may do nothing). */
	optimize (): void;
	/** Bodies being simulated (not asleep). */
	activeBodyCount (): number;
	/** Free the world. IgePhysics3d has removed every body, character, ragdoll and vehicle first. */
	destroy (): void;

	/* Bodies */

	createBody (desc: IgePhysicsBackendBodyDesc): IgePhysicsBodyHandle;
	destroyBody (body: IgePhysicsBodyHandle): void;
	/**
	 * Take a body out of the simulation (it keeps its place and drops its velocity) or put it back, awake. A kinematic
	 * body put back is placed where its entity is by IgePhysics3d (setBodyTransform()), not moved there.
	 */
	setBodyEnabled (body: IgePhysicsBodyHandle, enabled: boolean): void;
	/** Position (the shape's centre) and rotation: out = x, y, z, qx, qy, qz, qw. */
	readBodyPose (body: IgePhysicsBodyHandle, out: Float64Array): void;
	readBodyVelocity (body: IgePhysicsBodyHandle, linear: Vec3, angular?: Vec3): void;
	/** Set either velocity (null leaves it), waking the body when it's moving. Dynamic and kinematic bodies. */
	setBodyVelocity (body: IgePhysicsBodyHandle, linear: Vec3 | null, angular: Vec3 | null): void;
	/** Put a body somewhere at once (a teleport). */
	setBodyTransform (body: IgePhysicsBodyHandle, position: Vec3, rotation: Quat, wake: boolean): void;
	/** Kinematic: arrive at this pose at the end of the next step of dt seconds, pushing dynamic bodies on the way. */
	moveKinematic (body: IgePhysicsBodyHandle, position: Vec3, rotation: Quat, dt: number): void;
	/** kg * m/s, at the centre of mass or at a world point. */
	addImpulse (body: IgePhysicsBodyHandle, impulse: Vec3, at?: Vec3): void;
	/**
	 * Newtons, at the centre of mass or at a world point, for the next step
	 * only (forces add up until the step, then start again from nothing).
	 * Wakes the body. Dynamic bodies only. Flight, buoyancy and water drag
	 * are worked out in engine-neutral code and arrive here.
	 */
	addForce (body: IgePhysicsBodyHandle, force: Vec3, at?: Vec3): void;
	/** Newton metres about the centre of mass (world axes), for the next step only. Wakes the body. Dynamic bodies only. */
	addTorque (body: IgePhysicsBodyHandle, torque: Vec3): void;
	/** The centre of mass's world position (it moves with the body). */
	readBodyCentreOfMass (body: IgePhysicsBodyHandle, out: Vec3): void;
	/** Principal moments of inertia and their axes (dynamic bodies; they don't change). */
	readBodyInertia (body: IgePhysicsBodyHandle, out: IgePhysicsBackendInertia): void;
	/**
	 * Switch a body made with allowKinematic between dynamic (simulated)
	 * and kinematic (moved by moveKinematic(), pushing dynamic bodies). It
	 * keeps its mass and shape.
	 */
	setBodyKinematic (body: IgePhysicsBodyHandle, kinematic: boolean): void;
	/** kg (Infinity for static and kinematic bodies). */
	bodyMass (body: IgePhysicsBodyHandle): number;
	/** Whether it's being simulated (false once asleep, and for static bodies). */
	bodyAwake (body: IgePhysicsBodyHandle): boolean;
	setBodyAwake (body: IgePhysicsBodyHandle, awake: boolean): void;

	/* Queries */

	/**
	 * The nearest body along a ray (direction unit length) that the layer
	 * collides with, other than `ignore` (e.g. the body casting it: an
	 * aircraft's landing gear). Fills `out` and returns true on a hit.
	 */
	raycast (origin: Vec3, direction: Vec3, maxDistance: number, layer: number, out: IgePhysicsBackendRaycastHit, ignore?: IgePhysicsBodyHandle): boolean;
	/**
	 * Every other body in the world whose shape overlaps this body's, or
	 * is within `margin` of it, that the body's layer collides with
	 * (sensors included, each once). Replaces out's contents.
	 */
	touching (body: IgePhysicsBodyHandle, margin: number, out: IgePhysicsBodyHandle[]): void;

	/* Player characters: a capsule moved by velocity that walks up steps and slopes, sticks to the floor going down them, and pushes bodies with a limited strength */

	createCharacter (desc: IgePhysicsBackendCharacterDesc): IgePhysicsCharacterHandle;
	/** The body other bodies, raycasts and sensors meet (kinematic, following the character). */
	characterBody (character: IgePhysicsCharacterHandle): IgePhysicsBodyHandle;
	/**
	 * Move for one step of dt seconds at this velocity (IgePhysics3d has
	 * applied gravity and jumps to it), sliding along what it meets.
	 */
	moveCharacter (character: IgePhysicsCharacterHandle, velocity: Vec3, gravity: number, dt: number): void;
	readCharacter (character: IgePhysicsCharacterHandle, out: IgePhysicsBackendCharacterState): void;
	/** Put it here, moving at this velocity (a teleport or a restored state). */
	setCharacterState (character: IgePhysicsCharacterHandle, position: Vec3, velocity: Vec3): void;
	/** Off: others pass where it was (it isn't moved meanwhile). */
	setCharacterEnabled (character: IgePhysicsCharacterHandle, enabled: boolean): void;
	destroyCharacter (character: IgePhysicsCharacterHandle): void;

	/* Ragdolls */

	/** Dynamic capsule bodies (awake) joined by swing-twist joints. */
	createRagdoll (desc: IgePhysicsBackendRagdollDesc): { ragdoll: IgePhysicsRagdollHandle; parts: IgePhysicsBodyHandle[] };
	/** Remove and free the joints and the part bodies. */
	destroyRagdoll (ragdoll: IgePhysicsRagdollHandle): void;

	/* Vehicles (see IgePhysicsVehicle3dBackend.ts) */

	/** A vehicle at this pose of the entity's origin. Its chassis is a body (IgeVehicleBackend.body). */
	createVehicle (spec: IgeVehicleBackendSpec, position: Vec3, rotation: Quat): IgeVehicleBackend;
}

/** Whether a shape can only be used by static or kinematic bodies. */
export function staticOnlyShape (shape: IgePhysicsShape): boolean {
	if (shape.type === "mesh" || shape.type === "heightfield") return true;
	if (shape.type === "compound") return shape.children.some((child) => staticOnlyShape(child.shape));
	return false;
}

/** A shape in IGE units (geometry scaled by `scale`) as a backend shape in metres. */
export function toBackendShape (shape: IgePhysicsShape, scale: Vec3, unitsPerMetre: number): IgePhysicsBackendShape {
	const u = unitsPerMetre;
	switch (shape.type) {
		case "box":
			return { type: "box", halfExtents: { x: shape.halfExtents.x / u, y: shape.halfExtents.y / u, z: shape.halfExtents.z / u } };
		case "sphere":
			return { type: "sphere", radius: shape.radius / u };
		case "capsule":
			return { type: "capsule", radius: shape.radius / u, halfHeight: shape.halfHeight / u };
		case "mesh": {
			const vertices = scaledVertices(shape.geometry, scale, u, 9, "has no vertices");
			const source = shape.geometry.indices;
			const indices = source ? Uint32Array.from(source as ArrayLike<number>) : null;
			return { type: "mesh", vertices, indices };
		}
		case "convex":
			return { type: "convex", points: scaledVertices(shape.geometry, scale, u, 12, "needs at least 4 vertices for a convex shape") };
		case "compound":
			if (!shape.children.length) throw new Error("IgePhysics3d: a compound shape needs at least one child");
			return {
				type: "compound",
				children: shape.children.map((child) => {
					const p = child.position || { x: 0, y: 0, z: 0 };
					const r = child.rotation || { x: 0, y: 0, z: 0, w: 1 };
					return { shape: toBackendShape(child.shape, scale, u), position: { x: p.x / u, y: p.y / u, z: p.z / u }, rotation: { ...r } };
				})
			};
		case "heightfield": {
			const size = Math.floor(shape.size);
			if (size < 2 || shape.heights.length < size * size) {
				throw new Error(`IgePhysics3d: a heightfield of size ${size} needs ${size * size} heights`);
			}
			const heights = new Float32Array(size * size);
			for (let i = 0; i < heights.length; i++) heights[i] = shape.heights[i] / u;
			return { type: "heightfield", heights, size, spacing: shape.spacing / u };
		}
	}
}

function scaledVertices (geometry: IgeGeometryData3d, scale: Vec3, u: number, least: number, problem: string): Float32Array {
	const source = geometry.vertices;
	if (!source || source.length < least) throw new Error(`IgePhysics3d: geometry "${geometry.id}" ${problem}`);
	const count = Math.floor(source.length / 3);
	const out = new Float32Array(count * 3);
	const sx = scale.x / u, sy = scale.y / u, sz = scale.z / u;
	for (let i = 0; i < count; i++) {
		out[i * 3] = source[i * 3] * sx;
		out[i * 3 + 1] = source[i * 3 + 1] * sy;
		out[i * 3 + 2] = source[i * 3 + 2] * sz;
	}
	return out;
}
