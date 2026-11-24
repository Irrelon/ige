import type { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { invertMat4 } from "@/engine/webgl/IgeRaycast";
import { matrixToQuaternion } from "@/engine/webgl/IgeModelParts";
import { IgeRagdoll3d, type IgeRagdollOptions } from "@/engine/physics/IgeRagdoll3d";
import { IgePhysicsCharacter3d, type IgePhysicsCharacterOptions } from "@/engine/physics/IgePhysicsCharacter3d";
import { IgePhysicsVehicle3d } from "@/engine/physics/IgePhysicsVehicle3d";
import { resolveVehicleSpec, vehicleBackendSpec } from "@/engine/physics/IgePhysicsVehicle3dBackend";
import type { IgePhysicsVehicle3dApi, IgePhysicsVehicleLanding, IgePhysicsVehicleOptions } from "@/engine/physics/IgePhysicsVehicle3dApi";
import { IgePhysicsBody3d, IgePhysicsSensor3d, multiplyQuat, rotateVector } from "@/engine/physics/IgePhysicsBody3d";
import { IgeWater3d, type IgeWaterOptions } from "@/engine/physics/IgeWater3d";
import { IgePhysicsBuoyancy3d, IgePhysicsBuoyancyGroup } from "@/engine/physics/IgePhysicsBuoyancy3d";
import { IgePhysicsCraft3d } from "@/engine/physics/IgePhysicsCraft3d";
import { IgePhysicsBoat3d, resolveBoatSpec } from "@/engine/physics/IgePhysicsBoat3d";
import { IgePhysicsAircraft3d, resolveAircraftSpec } from "@/engine/physics/IgePhysicsAircraft3d";
import type {
	IgePhysicsAircraft3dApi,
	IgePhysicsAircraftOptions,
	IgePhysicsBoat3dApi,
	IgePhysicsBoatOptions,
	IgePhysicsBuoyancy3dApi,
	IgePhysicsBuoyancyOptions,
	IgePhysicsCraft3dApi
} from "@/engine/physics/IgePhysicsCraft3dApi";
import {
	type IgePhysicsBackend,
	type IgePhysicsBackendFactory,
	type IgePhysicsBackendRaycastHit,
	type IgePhysicsBodyHandle,
	staticOnlyShape,
	toBackendShape
} from "@/engine/physics/IgePhysicsBackend";
import type {
	IgePhysics3dOptions,
	IgePhysicsBodyOptions,
	IgePhysicsImpact,
	IgePhysicsQuat,
	IgePhysicsRaycastHit,
	IgePhysicsRaycastOptions,
	IgePhysicsSensorOptions,
	IgePhysicsVec3
} from "@/engine/physics/IgePhysics3dTypes";

export { matrixToQuaternion, rotateVector, multiplyQuat, IgePhysicsBody3d, IgePhysicsSensor3d, IgeWater3d };
export type { IgeWaterOptions };
export type {
	IgePhysics3dOptions,
	IgePhysicsBodyOptions,
	IgePhysicsBodyState,
	IgePhysicsCharacterState,
	IgePhysicsImpact,
	IgePhysicsQuat,
	IgePhysicsRaycastHit,
	IgePhysicsRaycastOptions,
	IgePhysicsSensorOptions,
	IgePhysicsShape,
	IgePhysicsVec3,
	IgeJoltTuning,
	IgeRagdollState
} from "@/engine/physics/IgePhysics3dTypes";
export type { IgePhysicsBackend, IgePhysicsBackendFactory } from "@/engine/physics/IgePhysicsBackend";

type Vec3 = IgePhysicsVec3;
type Quat = IgePhysicsQuat;

const DEFAULTS: IgePhysics3dOptions = {
	backend: "jolt",
	unitsPerMetre: 100,
	gravity: -9.81,
	fixedTimeStep: 1 / 60,
	maxSubSteps: 4,
	interpolate: true,
	threads: "auto",
	maxBodies: 10240,
	layers: [{ name: "static", static: true }, { name: "moving" }],
	ignore: [],
	jolt: {}
};

/** Distance (metres) within which bodies count as touching a body that reports an impact. */
const IMPACT_MARGIN = 0.02;
/** Seconds a vehicle must be in the air for coming down to be a "landed" event (not a hop over a kerb). */
const MIN_AIR_TIME = 0.25;

let warnedDeprecated = false;

/** Fill in the defaults, and read the deprecated top-level Jolt options into `jolt`. */
function resolveOptions (options: Partial<IgePhysics3dOptions>): IgePhysics3dOptions {
	const opts: IgePhysics3dOptions = { ...DEFAULTS, ...options, jolt: { ...options.jolt } };
	if (options.maxBodyPairs !== undefined || options.maxContactConstraints !== undefined) {
		if (!warnedDeprecated) {
			warnedDeprecated = true;
			console.warn("IgePhysics3d: maxBodyPairs and maxContactConstraints are Jolt's tuning; pass them as jolt: { maxBodyPairs, maxContactConstraints }");
		}
		opts.jolt.maxBodyPairs ??= options.maxBodyPairs;
		opts.jolt.maxContactConstraints ??= options.maxContactConstraints;
	}
	return opts;
}

/** The backends IgePhysics3d knows by name, loaded when asked for. */
async function builtInBackend (name: string): Promise<IgePhysicsBackendFactory> {
	if (name === "jolt") {
		const { igeJoltPhysics } = await import(/* webpackChunkName: "ige-physics-jolt" */ "@/engine/physics/IgeJoltBackend");
		return igeJoltPhysics();
	}
	throw new Error(`IgePhysics3d: no backend called "${name}" (pass a backend factory instead)`);
}

/**
 * 3D rigid-body physics for IGE entities. The engine behind it is a
 * backend (IgePhysicsBackend): Jolt Physics in WebAssembly by default,
 * loaded only when a world is created (multithreaded when the page is
 * cross-origin isolated). Nothing in this API depends on which.
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

	/** The physics engine (see IgePhysicsBackend). */
	_backend: IgePhysicsBackend;
	_options: IgePhysics3dOptions;
	_list: IgePhysicsBody3d[] = [];
	_ragdolls: IgeRagdoll3d[] = [];
	_ragdollBodies: Map<IgeRagdoll3d, IgePhysicsBody3d[]> = new Map();
	_layers: Map<string, number> = new Map();
	_impactBodies: IgePhysicsBody3d[] = [];
	_sensors: IgePhysicsSensor3d[] = [];
	_characters: IgePhysicsCharacter3d[] = [];
	_vehicles: IgePhysicsVehicle3d[] = [];
	/** Each vehicle's chassis, registered so raycasts, sensors and wheels report the vehicle's entity. */
	_vehicleBodies: Map<IgePhysicsVehicle3d, IgePhysicsBody3d> = new Map();
	/** Every body by its backend handle, to turn query results into bodies. */
	_byHandle: Map<IgePhysicsBodyHandle, IgePhysicsBody3d> = new Map();
	/** The water boats and floating bodies float on (see water()). */
	_water: IgeWater3d | null = null;
	/** Boats and aircraft. */
	_crafts: IgePhysicsCraft3d[] = [];
	/** Bodies floated with addBuoyancy(). */
	_floaters: IgePhysicsBuoyancy3d[] = [];
	_accumulator: number = 0;
	_behaviourId: string;
	_stepMs: number = 0;
	_stepsLastUpdate: number = 0;
	_bodiesAddedSinceOptimize: number = 0;

	// Reused query results and vectors (no allocation per step)
	_touching: IgePhysicsBodyHandle[] = [];
	_rayHit: IgePhysicsBackendRaycastHit = { body: {}, distance: 0, normal: { x: 0, y: 1, z: 0 } };
	_scratch: Vec3 = { x: 0, y: 0, z: 0 };
	_scratchQuat: Quat = { x: 0, y: 0, z: 0, w: 1 };

	/**
	 * Load the backend (Jolt by default) and create a world. Rejects if it
	 * can't load (e.g. the jolt-physics package isn't installed).
	 * @example #The default backend, tuned
	 *     const physics = await IgePhysics3d.create({ unitsPerMetre: 100, jolt: { maxBodyPairs: 131072 } });
	 * @example #Another backend
	 *     const physics = await IgePhysics3d.create({ backend: myRapierBackend() });
	 */
	static async create (options: Partial<IgePhysics3dOptions> = {}): Promise<IgePhysics3d> {
		const opts = resolveOptions(options);
		const factory = typeof opts.backend === "string" ? await builtInBackend(opts.backend) : opts.backend;
		const layers = opts.layers;
		if (!layers.length) throw new Error("IgePhysics3d: at least one collision layer is needed");
		const index = (name: string) => {
			const i = layers.findIndex((layer) => layer.name === name);
			if (i < 0) throw new Error(`IgePhysics3d: no collision layer "${name}" to ignore (see the layers option)`);
			return i;
		};
		const backend = await factory.create({
			gravity: opts.gravity,
			layers: layers.map((layer) => ({ ...layer })),
			ignore: opts.ignore.map(([a, b]) => [index(a), index(b)] as [number, number]),
			threads: opts.threads,
			maxBodies: opts.maxBodies,
			options: opts
		});
		return new IgePhysics3d(backend, opts);
	}

	/** A world on a backend that's already made (IgePhysics3d.create() makes both). */
	constructor (backend: IgePhysicsBackend, options: Partial<IgePhysics3dOptions> = {}) {
		super();
		this._backend = backend;
		this._options = resolveOptions(options);
		this._behaviourId = `physics3d_${Math.random().toString(36).slice(2)}`;
		this._options.layers.forEach((layer, index) => this._layers.set(layer.name, index));
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

	/** The entity a backend body belongs to (a wheel's ground). */
	_entityOfBody (handle: IgePhysicsBodyHandle): IgeEntity | null {
		return this._byHandle.get(handle)?.entity ?? null;
	}

	/** The name of the backend running the world, e.g. "jolt". */
	backendName (): string {
		return this._backend.name;
	}

	/** Whether the backend runs on worker threads (Jolt's multithreaded build). */
	threaded (): boolean {
		return this._backend.threaded();
	}

	/** IGE units per metre. */
	unitsPerMetre (): number {
		return this._options.unitsPerMetre;
	}

	/** Gets / sets gravity along Y, in metres per second squared. */
	gravity (): number;
	gravity (val: number): this;
	gravity (val?: number): number | this {
		if (val === undefined) return this._options.gravity;
		this._options.gravity = val;
		this._backend.setGravity(val);
		return this;
	}

	/**
	 * Rebuild the backend's spatial index of bodies for fast queries.
	 * start() does this; call it again after adding many bodies at once,
	 * e.g. after loading a level.
	 */
	optimize (): this {
		this._backend.optimize();
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

	/** An entity's world position, rotation and scale (from its world matrix when it has one). */
	_entityPose (entity: IgeEntity): { position: Vec3; rotation: Quat; scale: Vec3 } {
		entity.updateTransform();
		const world = entity._worldMatrix4?.matrix;
		if (!world) return { position: { ...entity._translate }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } };
		return {
			position: { x: world[12], y: world[13], z: world[14] },
			rotation: matrixToQuaternion(world),
			scale: { x: Math.hypot(world[0], world[1], world[2]), y: Math.hypot(world[4], world[5], world[6]), z: Math.hypot(world[8], world[9], world[10]) }
		};
	}

	/** Make a backend body for an entity at its world transform. */
	_createBody (entity: IgeEntity, options: IgePhysicsBodyOptions, sensor: boolean, allowKinematic: boolean = false): IgePhysicsBodyHandle {
		const type = sensor ? "kinematic" : options.type || "dynamic";
		const u = this._options.unitsPerMetre;
		if (type === "dynamic" && staticOnlyShape(options.shape)) {
			throw new Error("IgePhysics3d: mesh and heightfield shapes can't be dynamic; use convex or compound shapes, or a static or kinematic body");
		}
		const layer = options.layer ? this._layerIndex(options.layer) : this._defaultLayer(type === "static");
		const pose = this._entityPose(entity);
		const rotation = options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : pose.rotation;
		const offset = options.offset ? rotateVector(options.offset, rotation.x, rotation.y, rotation.z, rotation.w) : { x: 0, y: 0, z: 0 };
		const p = pose.position;
		const o = options.offset || { x: 0, y: 0, z: 0 };
		const com = options.centreOfMass;
		return this._backend.createBody({
			type,
			shape: toBackendShape(options.shape, pose.scale, u),
			position: { x: (p.x + offset.x) / u, y: (p.y + offset.y) / u, z: (p.z + offset.z) / u },
			rotation,
			layer,
			friction: options.friction ?? 0.5,
			restitution: options.restitution ?? 0,
			density: options.density ?? 1000,
			linearDamping: options.linearDamping ?? 0.05,
			angularDamping: options.angularDamping ?? 0.05,
			gravityFactor: options.gravityFactor ?? 1,
			lockRotation: !!options.lockRotation,
			ccd: !!options.ccd,
			sensor,
			mass: options.mass,
			// The shape's origin is the entity's plus the offset
			centreOfMass: com ? { x: (com.x - o.x) / u, y: (com.y - o.y) / u, z: (com.z - o.z) / u } : undefined,
			allowKinematic
		});
	}

	/** Register a body so queries find it. */
	_register (body: IgePhysicsBody3d): IgePhysicsBody3d {
		this._byHandle.set(body._handle, body);
		return body;
	}

	/**
	 * Create a body for an entity at the entity's current world position
	 * and rotation.
	 */
	addBody (entity: IgeEntity, options: IgePhysicsBodyOptions): IgePhysicsBody3d {
		const handle = this._createBody(entity, options, false);

		// Many new bodies at once (a level loading): rebuild the broad phase
		if (++this._bodiesAddedSinceOptimize > 256) this.optimize();

		const wrapper = this._register(new IgePhysicsBody3d(this, entity, options, handle));
		this._list.push(wrapper);
		if (wrapper._impactThreshold > 0) this._impactBodies.push(wrapper);
		(entity as any)._physicsBody3d = wrapper;
		return wrapper;
	}

	/** Remove a body from the world and free it. */
	removeBody (body: IgePhysicsBody3d): void {
		if (body._destroyed) return;
		// A vehicle's chassis (e.g. from a raycast hit) goes with its vehicle
		const vehicle = (body as any)._vehicle as IgePhysicsVehicle3d | undefined;
		if (vehicle) return this.removeVehicle(vehicle);
		// ...as does a boat's or aircraft's
		const craft = (body as any)._craft as IgePhysicsCraft3d | undefined;
		if (craft && !craft._destroyed) return this.removeCraft(craft);
		for (const floater of this._floaters.filter((f) => f.body === body)) this.removeBuoyancy(floater);
		this._backend.destroyBody(body._handle);
		body._destroyed = true;
		const index = this._list.indexOf(body);
		if (index >= 0) this._list.splice(index, 1);
		const impactIndex = this._impactBodies.indexOf(body);
		if (impactIndex >= 0) this._impactBodies.splice(impactIndex, 1);
		this._byHandle.delete(body._handle);
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
		const wrappers = ragdoll._parts.map((part, index) =>
			this._register(new IgePhysicsBody3d(this, entity, { type: "dynamic", shape: { type: "capsule", ...ragdoll._partShapes[index] }, density: ragdoll._density }, part.body)));
		this._ragdollBodies.set(ragdoll, wrappers);
		return ragdoll;
	}

	/** Remove a ragdoll's bodies and joints. */
	removeRagdoll (ragdoll: IgeRagdoll3d): void {
		const index = this._ragdolls.indexOf(ragdoll);
		if (index >= 0) this._ragdolls.splice(index, 1);
		const wrappers = this._ragdollBodies.get(ragdoll) || [];
		for (const wrapper of wrappers) {
			this._byHandle.delete(wrapper._handle);
			wrapper._destroyed = true;
		}
		for (const floater of this._floaters.filter((f) => wrappers.includes(f.body))) this.removeBuoyancy(floater);
		this._ragdollBodies.delete(ragdoll);
		ragdoll._free();
	}

	/**
	 * Add a trigger volume that follows an entity and reports bodies
	 * entering and leaving it (see IgePhysicsSensor3d).
	 */
	addSensor (entity: IgeEntity, options: IgePhysicsSensorOptions): IgePhysicsSensor3d {
		const bodyOptions: IgePhysicsBodyOptions = { type: "kinematic", shape: options.shape, offset: options.offset, layer: options.layer };
		const handle = this._createBody(entity, bodyOptions, true);
		const body = this._register(new IgePhysicsBody3d(this, entity, bodyOptions, handle));
		body._sensor = true;
		this._list.push(body);
		(entity as any)._physicsBody3d = body;
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
	 * Add a player character to an entity: a capsule with its feet at the
	 * entity's origin that walks where it's told with move(), up stairs and
	 * slopes, and pushes other bodies with a limited strength (see
	 * IgePhysicsCharacter3d).
	 * @example #A player
	 *     const hero = physics.addCharacter(entity, { radius: 28, height: 130 });
	 *     // each frame, from input:
	 *     hero.move(moveX * 260, moveZ * 260);
	 */
	addCharacter (entity: IgeEntity, options: IgePhysicsCharacterOptions): IgePhysicsCharacter3d {
		const u = this._options.unitsPerMetre;
		const radius = options.radius / u, height = options.height / u;
		const p = this._entityPose(entity).position;
		const handle = this._backend.createCharacter({
			position: { x: p.x / u, y: p.y / u, z: p.z / u },
			radius,
			height,
			mass: options.mass ?? 80,
			maxStrength: options.maxStrength ?? 500,
			maxSlopeAngle: ((options.maxSlopeAngle ?? 50) * Math.PI) / 180,
			stepHeight: (options.stepHeight ?? 0.3 * u) / u,
			layer: options.layer ? this._layerIndex(options.layer) : this._defaultLayer(false),
			pushable: options.pushable !== false
		});

		// The body other bodies, raycasts and sensors meet
		const halfHeight = Math.max(0.01, height / 2 - radius);
		const body = this._register(new IgePhysicsBody3d(this, entity, {
			type: "kinematic",
			shape: { type: "capsule", radius: options.radius, halfHeight: halfHeight * u },
			layer: options.layer
		}, this._backend.characterBody(handle)));
		(entity as any)._physicsBody3d = body;

		const character = new IgePhysicsCharacter3d(this, entity, handle, body);
		this._characters.push(character);
		return character;
	}

	/** Remove a character and free it. */
	removeCharacter (character: IgePhysicsCharacter3d): void {
		if (character._destroyed) return;
		character._destroyed = true;
		const index = this._characters.indexOf(character);
		if (index >= 0) this._characters.splice(index, 1);
		this._byHandle.delete(character.body._handle);
		if ((character.entity as any)._physicsBody3d === character.body) (character.entity as any)._physicsBody3d = undefined;
		character.body._destroyed = true;
		this._backend.destroyCharacter(character._handle);
	}

	/** The body attached to an entity by addBody(), addSensor() or addCharacter(), if any. */
	bodyOf (entity: IgeEntity): IgePhysicsBody3d | undefined {
		return (entity as any)._physicsBody3d;
	}

	/**
	 * Make an entity a vehicle: a car (4 or more wheels) or a motorcycle,
	 * driven with drive() and moving its entity and wheel entities every
	 * frame. With no options it's an arcade-leaning saloon car with its
	 * origin on the ground. See IgePhysicsVehicle3dApi and
	 * guides/vehicles-3d.md.
	 * @example #A car driven from input
	 *     const car = physics.addVehicle(carEntity, { wheels: [...] });
	 *     // each frame:
	 *     car.drive({ forward: throttle, right: steer, brake, handbrake });
	 */
	addVehicle (entity: IgeEntity, options: IgePhysicsVehicleOptions = {}): IgePhysicsVehicle3dApi {
		const u = this._options.unitsPerMetre;
		const spec = resolveVehicleSpec(options, u);
		const layer = spec.layer ? this._layerIndex(spec.layer) : this._defaultLayer(false);
		const pose = this._entityPose(entity);
		const p = pose.position;
		const backend = this._backend.createVehicle(vehicleBackendSpec(spec, layer), { x: p.x / u, y: p.y / u, z: p.z / u }, pose.rotation);
		const vehicle = new IgePhysicsVehicle3d(this, entity, spec, backend);

		// Raycasts, sensors and other vehicles' wheels report the vehicle's entity
		const body = this._register(new IgePhysicsBody3d(this, entity, { type: "dynamic", shape: spec.chassis, layer: spec.layer }, backend.body));
		(body as any)._vehicle = vehicle;
		this._vehicleBodies.set(vehicle, body);
		this._vehicles.push(vehicle);
		(entity as any)._physicsVehicle3d = vehicle;
		return vehicle;
	}

	/** Remove a vehicle and free it. */
	removeVehicle (vehicle: IgePhysicsVehicle3dApi): void {
		const own = vehicle as IgePhysicsVehicle3d;
		const index = this._vehicles.indexOf(own);
		if (index < 0) return;
		this._vehicles.splice(index, 1);
		const body = this._vehicleBodies.get(own);
		if (body) {
			this._byHandle.delete(body._handle);
			body._destroyed = true;
			this._vehicleBodies.delete(own);
		}
		if ((own.entity as any)._physicsVehicle3d === own) (own.entity as any)._physicsVehicle3d = undefined;
		own._free();
	}

	/** The vehicle made from an entity by addVehicle(), if any. */
	vehicleOf (entity: IgeEntity): IgePhysicsVehicle3dApi | undefined {
		return (entity as any)._physicsVehicle3d;
	}

	/**
	 * Gets / sets the water: a level and waves (one shared function of
	 * position and time, IgeWater3d) that boats and floating bodies float
	 * on. Its clock moves on with every step; set it with water().time()
	 * from a shared clock so every machine has the same waves. null removes
	 * it. See guides/aircraft-boats-3d.md.
	 * @example #A sea with a gentle swell
	 *     physics.water({ level: 0, waves: [{ direction: 30, length: 4000, amplitude: 25 }] });
	 */
	water (): IgeWater3d | null;
	water (options: IgeWaterOptions | IgeWater3d | null): IgeWater3d | null;
	water (options?: IgeWaterOptions | IgeWater3d | null): IgeWater3d | null {
		if (options === undefined) return this._water;
		const time = this._water?.time() ?? 0;
		this._water = options === null ? null : options instanceof IgeWater3d ? options : new IgeWater3d(options, this._options.unitsPerMetre);
		if (this._water && !(options instanceof IgeWater3d)) this._water.time(time);
		return this._water;
	}

	/** A body for a boat or aircraft: dynamic, able to switch to kinematic, pushed by its own forces (no damping). */
	_addCraftBody (entity: IgeEntity, options: IgePhysicsBodyOptions): IgePhysicsBody3d {
		const handle = this._createBody(entity, { ...options, linearDamping: 0, angularDamping: 0 }, false, true);
		const body = this._register(new IgePhysicsBody3d(this, entity, options, handle));
		this._list.push(body);
		(entity as any)._physicsBody3d = body;
		return body;
	}

	_addCraft<T extends IgePhysicsCraft3d> (craft: T): T {
		(craft.body as any)._craft = craft;
		this._crafts.push(craft);
		(craft.entity as any)._physicsCraft3d = craft;
		return craft;
	}

	/**
	 * Make an entity a boat: buoyancy over its hull on the water (see
	 * water()), drag, a propeller and rudder, planing, and arcade help (it
	 * leans into turns, is hard to capsize and rights itself). Driven with
	 * drive({ throttle, steer }). Presets: "speedboat" (default),
	 * "fishingBoat", "yacht", "cargoShip". The entity's origin is on the
	 * keel under the hull's middle, facing +Z. See guides/aircraft-boats-3d.md.
	 * @example #A speedboat
	 *     const boat = physics.addBoat(boatEntity, { preset: "speedboat" });
	 *     // each frame:
	 *     boat.drive({ throttle, steer });
	 */
	addBoat (entity: IgeEntity, options: IgePhysicsBoatOptions = {}): IgePhysicsBoat3dApi {
		const u = this._options.unitsPerMetre;
		const spec = resolveBoatSpec(options, u);
		const layer = spec.layer ? this._layerIndex(spec.layer) : this._defaultLayer(false);
		const c = spec.centreOfMass;
		const body = this._addCraftBody(entity, {
			shape: spec.shape, mass: spec.mass, centreOfMass: { x: c.x * u, y: c.y * u, z: c.z * u }, friction: spec.friction, layer: spec.layer
		});
		return this._addCraft(new IgePhysicsBoat3d(this, entity, body, spec, layer));
	}

	/**
	 * Make an entity a plane or helicopter, flown with fly({ throttle,
	 * pitch, roll, yaw, flaps, gear, brake }) or, for helicopters, fly({
	 * collective, pitch, roll, yaw }). Presets: "lightPlane" (default),
	 * "floatplane", "jet", "airliner", "helicopter". The entity's origin is
	 * on the ground under the aircraft resting on its wheels, skids or
	 * floats, facing +Z. See guides/aircraft-boats-3d.md.
	 * @example #A light plane on the runway
	 *     const plane = physics.addAircraft(planeEntity, { preset: "lightPlane" });
	 *     // each frame:
	 *     plane.fly({ throttle, pitch, roll, yaw, brake });
	 */
	addAircraft (entity: IgeEntity, options: IgePhysicsAircraftOptions = {}): IgePhysicsAircraft3dApi {
		const u = this._options.unitsPerMetre;
		const spec = resolveAircraftSpec(options, u);
		const layer = spec.layer ? this._layerIndex(spec.layer) : this._defaultLayer(false);
		const c = spec.centreOfMass;
		const body = this._addCraftBody(entity, {
			shape: spec.shape, mass: spec.mass, centreOfMass: { x: c.x * u, y: c.y * u, z: c.z * u }, friction: spec.friction, layer: spec.layer, ccd: true
		});
		return this._addCraft(new IgePhysicsAircraft3d(this, entity, body, spec, layer));
	}

	/** Remove a boat or aircraft and free its body. */
	removeCraft (craft: IgePhysicsCraft3dApi): void {
		const own = craft as IgePhysicsCraft3d;
		const index = this._crafts.indexOf(own);
		if (index < 0 || own._destroyed) return;
		this._crafts.splice(index, 1);
		own._destroyed = true;
		if ((own.entity as any)._physicsCraft3d === own) (own.entity as any)._physicsCraft3d = undefined;
		this.removeBody(own.body);
	}

	/** The boat or aircraft made from an entity, if any. */
	craftOf (entity: IgeEntity): IgePhysicsCraft3dApi | undefined {
		return (entity as any)._physicsCraft3d;
	}

	/**
	 * Float any dynamic body on the water (see water()), or sink it, by its
	 * density: crates, barrels, wrecks, or a whole ragdoll (a person). A body lighter
	 * than water floats with that share of it under (a crate of density 300
	 * rides 30% under); a heavier one sinks, slowed by the water.
	 * @example #A crate that floats
	 *     const crate = physics.addBody(entity, { shape: { type: "box", halfExtents: { x: 30, y: 30, z: 30 } }, density: 300 });
	 *     physics.addBuoyancy(crate);
	 */
	addBuoyancy (target: IgePhysicsBody3d | IgeRagdoll3d, options: IgePhysicsBuoyancyOptions = {}): IgePhysicsBuoyancy3dApi {
		if (target instanceof IgeRagdoll3d) {
			// A person: every part floats by the ragdoll's density (1000 by default: just afloat in the sea)
			const parts = (this._ragdollBodies.get(target) || []).map((body) => this.addBuoyancy(body, { drag: options.drag }) as IgePhysicsBuoyancy3d);
			return new IgePhysicsBuoyancyGroup(parts);
		}
		const body = target;
		if (body.type !== "dynamic") throw new Error("IgePhysics3d: only dynamic bodies float");
		const floater = new IgePhysicsBuoyancy3d(this, body, options);
		this._floaters.push(floater);
		return floater;
	}

	/** Stop floating a body (see addBuoyancy()). */
	removeBuoyancy (buoyancy: IgePhysicsBuoyancy3dApi): void {
		const own = buoyancy as IgePhysicsBuoyancy3d;
		const index = this._floaters.indexOf(own);
		if (index >= 0) this._floaters.splice(index, 1);
		own._destroyed = true;
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
			for (const vehicle of this._vehicles) vehicle._preStep(step);
			for (const floater of this._floaters) floater._preStep();
			for (const craft of this._crafts) craft._preStep(step);
			this._moveKinematicBodies(step);
			if (this._impactBodies.length) this._recordImpactVelocities();
			this._backend.step(step);
			this._water?._advance(step);
			this._captureBodies();
			for (const vehicle of this._vehicles) vehicle._postStep();
			for (const craft of this._crafts) craft._postStep(step);
			if (this._impactBodies.length) this._checkImpacts(step);
			if (this._vehicles.length) {
				this._checkVehicleImpacts(step);
				this._checkVehiclesAirborne(step);
			}
			this._accumulator -= step;
			steps++;
		}
		this._stepsLastUpdate = steps;

		// Place entities between the last two steps (every frame, steps or not)
		const alpha = this._options.interpolate ? this._accumulator / step : 1;
		this._syncEntities(alpha);
		for (const character of this._characters) character._sync(alpha);
		for (const vehicle of this._vehicles) vehicle._sync(alpha);
		for (const craft of this._crafts) craft._sync(alpha);

		if (steps > 0) {
			this._stepMs = performance.now() - started;
			// Pose the ragdolls; those that have settled (or lasted their restAfter) come to rest
			for (let i = this._ragdolls.length - 1; i >= 0; i--) {
				const ragdoll = this._ragdolls[i];
				const asleep = ragdoll.asleep();
				if (!asleep) ragdoll.sync();
				if (ragdoll._restAfter === undefined) continue;
				ragdoll._age += steps * step;
				if (asleep || ragdoll._age >= ragdoll._restAfter) ragdoll.rest();
			}
			if (this._sensors.length) this._updateSensors();
			this.emit("afterStep", steps);
		}
	}

	/** Counts (bodies include ragdoll parts and vehicles) and the time the last update spent stepping. */
	stats (): { bodies: number; activeBodies: number; ragdolls: number; vehicles: number; crafts: number; floating: number; stepMs: number; steps: number; threaded: boolean; backend: string } {
		let ragdollParts = 0;
		for (const ragdoll of this._ragdolls) ragdollParts += ragdoll._parts.length;
		return {
			bodies: this._list.length + ragdollParts + this._vehicles.length,
			ragdolls: this._ragdolls.length,
			vehicles: this._vehicles.length,
			crafts: this._crafts.length,
			floating: this._floaters.length,
			activeBodies: this._backend.activeBodyCount(),
			stepMs: this._stepMs,
			steps: this._stepsLastUpdate,
			threaded: this._backend.threaded(),
			backend: this._backend.name
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
		const layer = options.layer ? this._layerIndex(options.layer) : this._defaultLayer(false);
		const hit = this._rayHit;
		if (!this._backend.raycast({ x: origin.x / u, y: origin.y / u, z: origin.z / u }, { x: dx, y: dy, z: dz }, maxDistance / u, layer, hit)) {
			return null;
		}
		const body = this._byHandle.get(hit.body);
		if (!body) return null;
		const distance = hit.distance * u;
		const point = { x: origin.x + dx * distance, y: origin.y + dy * distance, z: origin.z + dz * distance };
		return { body, entity: body.entity, point, normal: { ...hit.normal }, distance };
	}

	/** Free every body and the world. */
	destroy (): void {
		this.stop();
		for (const ragdoll of [...this._ragdolls]) this.removeRagdoll(ragdoll);
		for (const vehicle of [...this._vehicles]) this.removeVehicle(vehicle);
		for (const craft of [...this._crafts]) this.removeCraft(craft);
		for (const floater of [...this._floaters]) this.removeBuoyancy(floater);
		for (const sensor of [...this._sensors]) this.removeSensor(sensor);
		for (const character of [...this._characters]) this.removeCharacter(character);
		for (const body of [...this._list]) this.removeBody(body);
		this._byHandle.clear();
		this._backend.destroy();
	}

	_moveKinematicBodies (dt: number): void {
		const u = this._options.unitsPerMetre;
		const backend = this._backend;
		const position = this._scratch;
		for (const body of this._list) {
			if (body.type !== "kinematic" || !body._enabled) continue;
			const entity = body.entity;
			entity.updateTransform();
			const m = entity._worldMatrix4?.matrix;
			if (!m) continue;
			const q = body.options.lockRotation ? this._scratchQuat : matrixToQuaternion(m);
			const o = body._worldOffset(q);
			position.x = (m[12] + o.x) / u; position.y = (m[13] + o.y) / u; position.z = (m[14] + o.z) / u;
			backend.moveKinematic(body._handle, position, q, dt);
		}
	}

	/** Remember the velocity of bodies that report impacts, before a step. */
	_recordImpactVelocities (): void {
		for (const body of this._impactBodies) {
			if (!body._enabled || body.type !== "dynamic") continue;
			this._backend.readBodyVelocity(body._handle, body._impactVelocity);
		}
	}

	/** The bodies touching a body (impacts): not itself, not sensors. */
	_othersTouching (handle: IgePhysicsBodyHandle, own: IgePhysicsBody3d | undefined): IgePhysicsBody3d[] {
		this._backend.touching(handle, IMPACT_MARGIN, this._touching);
		const others: IgePhysicsBody3d[] = [];
		for (const touching of this._touching) {
			const other = this._byHandle.get(touching);
			if (other && other !== own && !other._sensor && !others.includes(other)) others.push(other);
		}
		return others;
	}

	/**
	 * After a step: a body whose velocity changed by more than gravity
	 * explains hit something. Emit "impact" with the bodies touching it.
	 */
	_checkImpacts (dt: number): void {
		const u = this._options.unitsPerMetre;
		const gravity = this._options.gravity;
		const backend = this._backend;
		const v = this._scratch;
		for (const body of this._impactBodies) {
			if (!body._enabled || body.type !== "dynamic" || !backend.bodyAwake(body._handle)) continue;
			const before = body._impactVelocity;
			backend.readBodyVelocity(body._handle, v);
			const gravityFactor = body.options.gravityFactor ?? 1;
			const change = Math.hypot(v.x - before.x, v.y - (before.y + gravity * gravityFactor * dt), v.z - before.z);
			if (change < body._impactThreshold) continue;
			const speed = change * u;
			const impact: IgePhysicsImpact = { speed, impulse: speed * backend.bodyMass(body._handle), others: this._othersTouching(body._handle, body) };
			body.emit("impact", impact);
		}
	}

	/** The same for vehicles with `impacts` on (their velocity is read after every step anyway). */
	_checkVehicleImpacts (dt: number): void {
		const gravity = this._options.gravity * this._options.unitsPerMetre;
		for (const vehicle of this._vehicles) {
			const threshold = vehicle._spec.impacts;
			if (!threshold || !vehicle._enabled || vehicle._destroyed || vehicle._kinematic) continue;
			const a = vehicle._velocityBefore, b = vehicle._velocity;
			const change = Math.hypot(b.x - a.x, b.y - (a.y + gravity * dt), b.z - a.z);
			if (change < threshold) continue;
			const body = this._vehicleBodies.get(vehicle);
			if (!body) continue;
			const impact: IgePhysicsImpact = { speed: change, impulse: change * vehicle._spec.mass, others: this._othersTouching(body._handle, body) };
			vehicle.emit("impact", impact);
		}
	}

	/**
	 * Whether each vehicle is in the air (no wheel down, its body touching
	 * nothing), and "landed" when one comes down.
	 */
	_checkVehiclesAirborne (dt: number): void {
		for (const vehicle of this._vehicles) {
			if (!vehicle._enabled || vehicle._destroyed) continue;
			const onWheels = vehicle.grounded();
			let touching = onWheels;
			if (!touching) {
				const body = this._vehicleBodies.get(vehicle);
				touching = !!body && this._othersTouching(body._handle, body).length > 0;
			}
			const was = vehicle._airborne;
			vehicle._airborne = !touching;
			if (!touching) {
				vehicle._airTime += dt;
				continue;
			}
			if (was && vehicle._airTime >= MIN_AIR_TIME && !vehicle._kinematic) {
				const v = vehicle._velocityBefore;
				const landing: IgePhysicsVehicleLanding = {
					airTime: vehicle._airTime,
					speed: Math.max(0, -v.y),
					velocity: { x: v.x, y: v.y, z: v.z },
					tilt: vehicle.tilt(),
					onWheels
				};
				vehicle.emit("landed", landing);
			}
			vehicle._airTime = 0;
		}
	}

	/** Find what overlaps each sensor and emit "enter" / "exit" for the changes. */
	_updateSensors (): void {
		const touching = this._touching;
		for (const sensor of this._sensors) {
			const own = sensor.body;
			if (!own._enabled) continue;
			this._backend.touching(own._handle, 0, touching);
			const now = new Set<IgePhysicsBody3d>();
			for (const handle of touching) {
				const other = this._byHandle.get(handle);
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

	/** Record every awake dynamic body's transform after a step. */
	_captureBodies (): void {
		const backend = this._backend;
		for (const body of this._list) {
			if (body.type !== "dynamic" || !body._enabled) continue;
			if (backend.bodyAwake(body._handle)) {
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
		const backend = this._backend;
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
			const o = body._worldOffset(q || this._scratchQuat);
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
			if (!backend.bodyAwake(body._handle) && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
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
