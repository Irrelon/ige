import type JoltApi from "jolt-physics";
import type { IgeEntity } from "../core/IgeEntity.js"
import type { IgeGeometryData3d } from "../../types/IgeGeometryData3d.js";
import { IgeEventingClass } from "../core/IgeEventingClass.js"
import { IgeRagdoll3d, type IgeRagdollOptions } from "./IgeRagdoll3d.js";
import { IgePhysicsCharacter3d, type IgePhysicsCharacterOptions } from "./IgePhysicsCharacter3d.js"
type Jolt = typeof JoltApi;
type Vec3 = {
    x: number;
    y: number;
    z: number;
};
type Quat = {
    x: number;
    y: number;
    z: number;
    w: number;
};
/** A collision shape, in IGE world units. */
export type IgePhysicsShape = {
    type: "box";
    halfExtents: Vec3;
} | {
    type: "sphere";
    radius: number;
}
/** Upright (along Y); halfHeight is half the straight part between the two caps. */
 | {
    type: "capsule";
    radius: number;
    halfHeight: number;
}
/**
 * The triangles of a geometry (e.g. the entity's own _geometryData),
 * scaled by the entity's scale: level geometry and terrain. Static and
 * kinematic bodies only.
 */
 | {
    type: "mesh";
    geometry: IgeGeometryData3d;
}
/** The convex hull of a geometry's vertices, scaled by the entity's scale: props of any shape, dynamic too. */
 | {
    type: "convex";
    geometry: IgeGeometryData3d;
};
export interface IgePhysicsBodyOptions {
    /** "dynamic" (default) is moved by the simulation, "static" never moves, "kinematic" follows its entity. */
    type?: "dynamic" | "static" | "kinematic";
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
/**
 * A rigid body in an IgePhysics3d world, attached to one entity. Positions,
 * velocities and impulses are in IGE units; the entity follows the body
 * after every simulation step (dynamic bodies) or leads it (kinematic).
 */
export declare class IgePhysicsBody3d {
    readonly entity: IgeEntity;
    readonly type: "dynamic" | "static" | "kinematic";
    readonly options: IgePhysicsBodyOptions;
    _physics: IgePhysics3d;
    _body: JoltApi.Body;
    _id: JoltApi.BodyID;
    _offset: Vec3;
    _enabled: boolean;
    _destroyed: boolean;
    /** Body position and rotation at the last two steps (IGE units): x, y, z, qx, qy, qz, qw. */
    _previous: Float64Array;
    _current: Float64Array;
    /** Whether _previous and _current differ (the entity still needs placing). */
    _moving: boolean;
    constructor(physics: IgePhysics3d, entity: IgeEntity, options: IgePhysicsBodyOptions, body: JoltApi.Body);
    /** Record the body's transform as the latest step's (and the previous one's too when resetting). */
    _capture(reset?: boolean): void;
    /** Linear velocity in IGE units per second. */
    velocity(): Vec3;
    /** Set the linear velocity in IGE units per second (wakes the body). */
    setVelocity(x: number, y: number, z: number): this;
    /**
     * Set the horizontal velocity and keep the vertical one (so the body
     * still falls and lands), as character movement usually wants.
     */
    setVelocityXZ(x: number, z: number): this;
    /** Push the body: an impulse in kg * IGE units per second, at its centre or at a world point. */
    applyImpulse(x: number, y: number, z: number, at?: Vec3): this;
    /** Mass in kg. */
    mass(): number;
    /** Move the body (and its entity) to a world position, e.g. a respawn, keeping its velocity at zero. */
    teleport(x: number, y: number, z: number): this;
    /** Gets / sets whether the body takes part in the simulation (e.g. off while a character is dead). */
    enabled(): boolean;
    enabled(val: boolean): this;
    /** Remove the body from the world and free it. */
    destroy(): void;
    /** The shape offset rotated by a body rotation (IGE units). */
    _worldOffset(q: JoltApi.Quat | Quat): Vec3;
}
export interface IgePhysicsSensorOptions {
    shape: IgePhysicsShape;
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
export declare class IgePhysicsSensor3d extends IgeEventingClass {
    classId: string;
    readonly body: IgePhysicsBody3d;
    readonly includeStatic: boolean;
    _overlapping: Set<IgePhysicsBody3d>;
    constructor(body: IgePhysicsBody3d, includeStatic: boolean);
    /** The entity the sensor follows. */
    get entity(): IgeEntity;
    /** Bodies inside the sensor after the last step. */
    overlapping(): IgePhysicsBody3d[];
    /** Remove the sensor. */
    destroy(): void;
}
/** v rotated by the unit quaternion (x, y, z, w). */
export declare function rotateVector(v: Vec3, x: number, y: number, z: number, w: number): Vec3;
/** The rotation of a column-major matrix's upper 3x3 (scale removed) as a unit quaternion. */
export declare function matrixToQuaternion(m: ArrayLike<number>): Quat;
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
export declare class IgePhysics3d extends IgeEventingClass {
    classId: string;
    _jolt: Jolt;
    _options: IgePhysics3dOptions;
    _interface: JoltApi.JoltInterface;
    _system: JoltApi.PhysicsSystem;
    _bodies: JoltApi.BodyInterface;
    _threaded: boolean;
    _list: IgePhysicsBody3d[];
    _ragdolls: IgeRagdoll3d[];
    _sensors: IgePhysicsSensor3d[];
    _characters: IgePhysicsCharacter3d[];
    _characterCollision?: JoltApi.CharacterVsCharacterCollisionSimple;
    _sensorCollector?: JoltApi.CollideShapeAllHitCollisionCollector;
    _sensorSettings?: JoltApi.CollideShapeSettings;
    _unitScale?: JoltApi.Vec3;
    _byBodyId: Map<number, IgePhysicsBody3d>;
    _accumulator: number;
    _behaviourId: string;
    _stepMs: number;
    _stepsLastUpdate: number;
    _bodiesAddedSinceOptimize: number;
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
    _pendingDestroy: object[];
    /**
     * Load Jolt and create a world. Rejects if Jolt can't load (e.g. the
     * jolt-physics package isn't installed).
     */
    static create(options?: Partial<IgePhysics3dOptions>): Promise<IgePhysics3d>;
    constructor(jolt: Jolt, options: IgePhysics3dOptions, threaded: boolean);
    /** Whether Jolt's multithreaded build is running. */
    threaded(): boolean;
    /** IGE units per metre. */
    unitsPerMetre(): number;
    /**
     * Rebuild Jolt's broad phase (its spatial index of bodies) for fast
     * queries. start() does this; call it again after adding many bodies
     * at once, e.g. after loading a level.
     */
    optimize(): this;
    /** Step the world every engine frame (after entity updates) until stop(). */
    start(): this;
    /** Stop stepping the world. */
    stop(): this;
    /**
     * Create a body for an entity at the entity's current world position
     * and rotation.
     */
    addBody(entity: IgeEntity, options: IgePhysicsBodyOptions): IgePhysicsBody3d;
    /** Remove a body from the world and free it. */
    removeBody(body: IgePhysicsBody3d): void;
    /**
     * Turn a skinned entity into a ragdoll: capsule bodies along its bones,
     * starting from its current pose, that drive its skeleton from now on
     * (its animation stops). destroy() the ragdoll before animating the
     * entity again.
     * @example #Ragdoll a zombie when it dies, thrown along the killing blow
     *     const ragdoll = physics.createRagdoll(zombie, { velocity: { x: dx * 400, y: 150, z: dz * 400 } });
     */
    createRagdoll(entity: IgeEntity, options?: IgeRagdollOptions): IgeRagdoll3d;
    /** Remove a ragdoll's bodies and joints. */
    removeRagdoll(ragdoll: IgeRagdoll3d): void;
    /**
     * Add a trigger volume that follows an entity and reports bodies
     * entering and leaving it (see IgePhysicsSensor3d).
     */
    addSensor(entity: IgeEntity, options: IgePhysicsSensorOptions): IgePhysicsSensor3d;
    /** Remove a sensor (bodies inside it get no "exit" event). */
    removeSensor(sensor: IgePhysicsSensor3d): void;
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
    addCharacter(entity: IgeEntity, options: IgePhysicsCharacterOptions): IgePhysicsCharacter3d;
    /** Remove a character and free it. */
    removeCharacter(character: IgePhysicsCharacter3d): void;
    /** The body attached to an entity by addBody(), if any. */
    bodyOf(entity: IgeEntity): IgePhysicsBody3d | undefined;
    /**
     * Advance the simulation by dt seconds in fixed steps (start() calls
     * this every frame), then move entities to their bodies.
     */
    update(dt: number): void;
    /** Counts (bodies include ragdoll parts) and the time the last update spent stepping. */
    stats(): {
        bodies: number;
        activeBodies: number;
        ragdolls: number;
        stepMs: number;
        steps: number;
        threaded: boolean;
    };
    /**
     * The nearest body a ray hits (IGE units; direction needn't be unit
     * length). Static and moving bodies are both tested.
     */
    raycast(origin: Vec3, direction: Vec3, maxDistance: number): IgePhysicsRaycastHit | null;
    /** Free every body and the world. */
    destroy(): void;
    /**
     * Build a Jolt shape. Shapes made from settings (mesh, convex) belong to
     * the settings until a body takes a reference, so cleanup() frees the
     * settings after the body is created.
     */
    _createShape(shape: IgePhysicsShape, scale: Vec3): {
        shape: JoltApi.Shape;
        cleanup?: () => void;
    };
    _createMeshShape(geometry: IgeGeometryData3d, scale: Vec3): {
        shape: JoltApi.Shape;
        cleanup: () => void;
    };
    _createConvexShape(geometry: IgeGeometryData3d, scale: Vec3): {
        shape: JoltApi.Shape;
        cleanup: () => void;
    };
    _moveKinematicBodies(dt: number): void;
    /** Find what overlaps each sensor and emit "enter" / "exit" for the changes. */
    _updateSensors(): void;
    /** Move each awake dynamic body's entity to the body. */
    /** Record every awake dynamic body's transform after a step. */
    _captureBodies(): void;
    /**
     * Move each dynamic body's entity to its transform, alpha of the way
     * from the previous step's to the latest (1 = the latest).
     */
    _syncEntities(alpha: number): void;
}
/** a * b for quaternions. */
export declare function multiplyQuat(a: Quat, b: Quat): Quat;
export {};
