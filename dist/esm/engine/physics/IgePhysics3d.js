import { IgeEventingClass } from "../core/IgeEventingClass.js"
import { ige } from "../instance.js";
import { IgeBehaviourType } from "../../enums/index.js";
import { invertMat4 } from "../webgl/IgeRaycast.js"
import { IgeRagdoll3d } from "./IgeRagdoll3d.js";
const LAYER_STATIC = 0;
const LAYER_MOVING = 1;
const NUM_LAYERS = 2;
const DEFAULTS = {
    unitsPerMetre: 100,
    gravity: -9.81,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 4,
    threads: "auto",
    maxBodies: 10240,
    maxBodyPairs: 65536,
    maxContactConstraints: 20000
};
/**
 * A rigid body in an IgePhysics3d world, attached to one entity. Positions,
 * velocities and impulses are in IGE units; the entity follows the body
 * after every simulation step (dynamic bodies) or leads it (kinematic).
 */
export class IgePhysicsBody3d {
    entity;
    type;
    options;
    _physics;
    _body;
    _id;
    _offset;
    _enabled = true;
    _destroyed = false;
    constructor(physics, entity, options, body) {
        this._physics = physics;
        this.entity = entity;
        this.type = options.type || "dynamic";
        this.options = options;
        this._body = body;
        this._id = body.GetID();
        this._offset = options.offset ? { ...options.offset } : { x: 0, y: 0, z: 0 };
    }
    /** Linear velocity in IGE units per second. */
    velocity() {
        const v = this._physics._bodies.GetLinearVelocity(this._id);
        const u = this._physics._options.unitsPerMetre;
        return { x: v.GetX() * u, y: v.GetY() * u, z: v.GetZ() * u };
    }
    /** Set the linear velocity in IGE units per second (wakes the body). */
    setVelocity(x, y, z) {
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
    setVelocityXZ(x, z) {
        const bodies = this._physics._bodies;
        const v = bodies.GetLinearVelocity(this._id);
        const u = this._physics._options.unitsPerMetre;
        const vec = this._physics._vec;
        vec.Set(x / u, v.GetY(), z / u);
        bodies.SetLinearVelocity(this._id, vec);
        return this;
    }
    /** Push the body: an impulse in kg * IGE units per second, at its centre or at a world point. */
    applyImpulse(x, y, z, at) {
        const u = this._physics._options.unitsPerMetre;
        const vec = this._physics._vec;
        vec.Set(x / u, y / u, z / u);
        if (at) {
            const point = this._physics._rvec;
            point.Set(at.x / u, at.y / u, at.z / u);
            this._physics._bodies.AddImpulse(this._id, vec, point);
        }
        else {
            this._physics._bodies.AddImpulse(this._id, vec);
        }
        return this;
    }
    /** Mass in kg. */
    mass() {
        const inverse = this._body.GetMotionProperties().GetInverseMass();
        return inverse > 0 ? 1 / inverse : Infinity;
    }
    /** Move the body (and its entity) to a world position, e.g. a respawn, keeping its velocity at zero. */
    teleport(x, y, z) {
        const physics = this._physics;
        const u = physics._options.unitsPerMetre;
        const q = this.type === "dynamic" && !this.options.lockRotation ? physics._bodies.GetRotation(this._id) : physics._identity;
        const o = this._worldOffset(q);
        physics._rvec.Set((x + o.x) / u, (y + o.y) / u, (z + o.z) / u);
        physics._bodies.SetPositionAndRotation(this._id, physics._rvec, q, physics._jolt.EActivation_Activate);
        physics._vec.Set(0, 0, 0);
        if (this.type !== "static")
            physics._bodies.SetLinearVelocity(this._id, physics._vec);
        this.entity.translateTo(x, y, z);
        return this;
    }
    enabled(val) {
        if (val === undefined)
            return this._enabled;
        if (val === this._enabled || this._destroyed)
            return this;
        this._enabled = val;
        if (val) {
            this._physics._bodies.AddBody(this._id, this._physics._jolt.EActivation_Activate);
        }
        else {
            this._physics._bodies.RemoveBody(this._id);
        }
        return this;
    }
    /** Remove the body from the world and free it. */
    destroy() {
        this._physics.removeBody(this);
    }
    /** The shape offset rotated by a body rotation (IGE units). */
    _worldOffset(q) {
        const o = this._offset;
        if (!o.x && !o.y && !o.z)
            return o;
        const qx = typeof q.GetX === "function" ? q.GetX() : q.x;
        const qy = typeof q.GetY === "function" ? q.GetY() : q.y;
        const qz = typeof q.GetZ === "function" ? q.GetZ() : q.z;
        const qw = typeof q.GetW === "function" ? q.GetW() : q.w;
        return rotateVector(o, qx, qy, qz, qw);
    }
}
/** v rotated by the unit quaternion (x, y, z, w). */
export function rotateVector(v, x, y, z, w) {
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
/** The rotation of a column-major matrix's upper 3x3 (scale removed) as a unit quaternion. */
export function matrixToQuaternion(m) {
    const sx = Math.hypot(m[0], m[1], m[2]) || 1;
    const sy = Math.hypot(m[4], m[5], m[6]) || 1;
    const sz = Math.hypot(m[8], m[9], m[10]) || 1;
    const r00 = m[0] / sx, r10 = m[1] / sx, r20 = m[2] / sx;
    const r01 = m[4] / sy, r11 = m[5] / sy, r21 = m[6] / sy;
    const r02 = m[8] / sz, r12 = m[9] / sz, r22 = m[10] / sz;
    const trace = r00 + r11 + r22;
    let x, y, z, w;
    if (trace > 0) {
        const s = Math.sqrt(trace + 1) * 2;
        w = 0.25 * s;
        x = (r21 - r12) / s;
        y = (r02 - r20) / s;
        z = (r10 - r01) / s;
    }
    else if (r00 > r11 && r00 > r22) {
        const s = Math.sqrt(1 + r00 - r11 - r22) * 2;
        w = (r21 - r12) / s;
        x = 0.25 * s;
        y = (r01 + r10) / s;
        z = (r02 + r20) / s;
    }
    else if (r11 > r22) {
        const s = Math.sqrt(1 + r11 - r00 - r22) * 2;
        w = (r02 - r20) / s;
        x = (r01 + r10) / s;
        y = 0.25 * s;
        z = (r12 + r21) / s;
    }
    else {
        const s = Math.sqrt(1 + r22 - r00 - r11) * 2;
        w = (r10 - r01) / s;
        x = (r02 + r20) / s;
        y = (r12 + r21) / s;
        z = 0.25 * s;
    }
    const len = Math.hypot(x, y, z, w) || 1;
    return { x: x / len, y: y / len, z: z / len, w: w / len };
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
    _jolt;
    _options;
    _interface;
    _system;
    _bodies;
    _threaded;
    _list = [];
    _ragdolls = [];
    _byBodyId = new Map();
    _accumulator = 0;
    _behaviourId;
    _stepMs = 0;
    _stepsLastUpdate = 0;
    _bodiesAddedSinceOptimize = 0;
    // Reused Jolt values (never allocate per call)
    _vec;
    _rvec;
    _quat;
    _identity;
    _ray;
    _raySettings;
    _rayCollector;
    _bpFilter;
    _objectFilter;
    _bodyFilter;
    _shapeFilter;
    _pendingDestroy = [];
    /**
     * Load Jolt and create a world. Rejects if Jolt can't load (e.g. the
     * jolt-physics package isn't installed).
     */
    static async create(options = {}) {
        const opts = { ...DEFAULTS, ...options };
        const isolated = typeof globalThis !== "undefined" && globalThis.crossOriginIsolated === true;
        const threaded = opts.threads === true || (opts.threads === "auto" && isolated);
        if (opts.threads === true && !isolated) {
            throw new Error("IgePhysics3d: threads need a cross-origin isolated page (COOP/COEP headers)");
        }
        let init;
        if (threaded) {
            // @ts-ignore - subpath export (the package's typings cover the main entry)
            init = (await import(/* webpackChunkName: "jolt-physics-mt" */ "jolt-physics/wasm-compat-multithread")).default;
        }
        else {
            init = (await import(/* webpackChunkName: "jolt-physics" */ "jolt-physics")).default;
        }
        const jolt = await init();
        return new IgePhysics3d(jolt, opts, threaded);
    }
    constructor(jolt, options, threaded) {
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
        // Static bodies don't collide with each other; moving ones collide with everything
        const pairs = new jolt.ObjectLayerPairFilterTable(NUM_LAYERS);
        pairs.EnableCollision(LAYER_STATIC, LAYER_MOVING);
        pairs.EnableCollision(LAYER_MOVING, LAYER_MOVING);
        const bpStatic = new jolt.BroadPhaseLayer(0);
        const bpMoving = new jolt.BroadPhaseLayer(1);
        const bpInterface = new jolt.BroadPhaseLayerInterfaceTable(NUM_LAYERS, 2);
        bpInterface.MapObjectToBroadPhaseLayer(LAYER_STATIC, bpStatic);
        bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, bpMoving);
        settings.mObjectLayerPairFilter = pairs;
        settings.mBroadPhaseLayerInterface = bpInterface;
        settings.mObjectVsBroadPhaseLayerFilter = new jolt.ObjectVsBroadPhaseLayerFilterTable(bpInterface, 2, pairs, NUM_LAYERS);
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
        this._bpFilter = new jolt.DefaultBroadPhaseLayerFilter(this._interface.GetObjectVsBroadPhaseLayerFilter(), LAYER_MOVING);
        this._objectFilter = new jolt.DefaultObjectLayerFilter(this._interface.GetObjectLayerPairFilter(), LAYER_MOVING);
        this._bodyFilter = new jolt.BodyFilter();
        this._shapeFilter = new jolt.ShapeFilter();
    }
    /** Whether Jolt's multithreaded build is running. */
    threaded() {
        return this._threaded;
    }
    /** IGE units per metre. */
    unitsPerMetre() {
        return this._options.unitsPerMetre;
    }
    /**
     * Rebuild Jolt's broad phase (its spatial index of bodies) for fast
     * queries. start() does this; call it again after adding many bodies
     * at once, e.g. after loading a level.
     */
    optimize() {
        this._system.OptimizeBroadPhase();
        this._bodiesAddedSinceOptimize = 0;
        return this;
    }
    /** Step the world every engine frame (after entity updates) until stop(). */
    start() {
        this.optimize();
        ige.engine.addBehaviour(IgeBehaviourType.postUpdate, this._behaviourId, (_engine, tickDelta) => {
            this.update((tickDelta || 0) / 1000);
        });
        return this;
    }
    /** Stop stepping the world. */
    stop() {
        ige.engine.removeBehaviour(IgeBehaviourType.postUpdate, this._behaviourId);
        return this;
    }
    /**
     * Create a body for an entity at the entity's current world position
     * and rotation.
     */
    addBody(entity, options) {
        const jolt = this._jolt;
        const type = options.type || "dynamic";
        const u = this._options.unitsPerMetre;
        const shape = this._createShape(options.shape);
        // Start at the entity's world transform
        entity.updateTransform();
        const world = entity._worldMatrix4?.matrix;
        const position = world ? { x: world[12], y: world[13], z: world[14] } : { ...entity._translate };
        const rotation = options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : world ? matrixToQuaternion(world) : { x: 0, y: 0, z: 0, w: 1 };
        const offset = options.offset ? rotateVector(options.offset, rotation.x, rotation.y, rotation.z, rotation.w) : { x: 0, y: 0, z: 0 };
        this._rvec.Set((position.x + offset.x) / u, (position.y + offset.y) / u, (position.z + offset.z) / u);
        this._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
        const motion = type === "static" ? jolt.EMotionType_Static : type === "kinematic" ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic;
        const settings = new jolt.BodyCreationSettings(shape, this._rvec, this._quat, motion, type === "static" ? LAYER_STATIC : LAYER_MOVING);
        settings.mFriction = options.friction ?? 0.5;
        settings.mRestitution = options.restitution ?? 0;
        settings.mLinearDamping = options.linearDamping ?? 0.05;
        settings.mAngularDamping = options.angularDamping ?? 0.05;
        settings.mGravityFactor = options.gravityFactor ?? 1;
        if (options.lockRotation) {
            settings.mAllowedDOFs = jolt.EAllowedDOFs_TranslationX | jolt.EAllowedDOFs_TranslationY | jolt.EAllowedDOFs_TranslationZ;
        }
        if (options.ccd)
            settings.mMotionQuality = jolt.EMotionQuality_LinearCast;
        const body = this._bodies.CreateBody(settings);
        jolt.destroy(settings);
        this._bodies.AddBody(body.GetID(), type === "static" ? jolt.EActivation_DontActivate : jolt.EActivation_Activate);
        // Many new bodies at once (a level loading): rebuild the broad phase
        if (++this._bodiesAddedSinceOptimize > 256)
            this.optimize();
        const wrapper = new IgePhysicsBody3d(this, entity, options, body);
        this._list.push(wrapper);
        this._byBodyId.set(wrapper._id.GetIndexAndSequenceNumber(), wrapper);
        entity._physicsBody3d = wrapper;
        return wrapper;
    }
    /** Remove a body from the world and free it. */
    removeBody(body) {
        if (body._destroyed)
            return;
        if (body._enabled)
            this._bodies.RemoveBody(body._id);
        this._bodies.DestroyBody(body._id);
        body._destroyed = true;
        const index = this._list.indexOf(body);
        if (index >= 0)
            this._list.splice(index, 1);
        this._byBodyId.delete(body._id.GetIndexAndSequenceNumber());
        if (body.entity._physicsBody3d === body)
            body.entity._physicsBody3d = undefined;
    }
    /**
     * Turn a skinned entity into a ragdoll: capsule bodies along its bones,
     * starting from its current pose, that drive its skeleton from now on
     * (its animation stops). destroy() the ragdoll before animating the
     * entity again.
     * @example #Ragdoll a zombie when it dies, thrown along the killing blow
     *     const ragdoll = physics.createRagdoll(zombie, { velocity: { x: dx * 400, y: 150, z: dz * 400 } });
     */
    createRagdoll(entity, options = {}) {
        const ragdoll = new IgeRagdoll3d(this, entity, options);
        this._ragdolls.push(ragdoll);
        return ragdoll;
    }
    /** Remove a ragdoll's bodies and joints. */
    removeRagdoll(ragdoll) {
        const index = this._ragdolls.indexOf(ragdoll);
        if (index >= 0)
            this._ragdolls.splice(index, 1);
        ragdoll._free();
    }
    /** The body attached to an entity by addBody(), if any. */
    bodyOf(entity) {
        return entity._physicsBody3d;
    }
    /**
     * Advance the simulation by dt seconds in fixed steps (start() calls
     * this every frame), then move entities to their bodies.
     */
    update(dt) {
        const step = this._options.fixedTimeStep;
        this._accumulator = Math.min(this._accumulator + dt, step * this._options.maxSubSteps);
        let steps = 0;
        const started = performance.now();
        while (this._accumulator >= step) {
            this._moveKinematicBodies(step);
            this._interface.Step(step, 1);
            this._accumulator -= step;
            steps++;
        }
        this._stepsLastUpdate = steps;
        if (steps > 0) {
            this._stepMs = performance.now() - started;
            this._syncEntities();
            for (const ragdoll of this._ragdolls) {
                if (!ragdoll.asleep())
                    ragdoll.sync();
            }
            this.emit("afterStep", steps);
        }
    }
    /** Counts (bodies include ragdoll parts) and the time the last update spent stepping. */
    stats() {
        let ragdollParts = 0;
        for (const ragdoll of this._ragdolls)
            ragdollParts += ragdoll._parts.length;
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
    raycast(origin, direction, maxDistance) {
        const u = this._options.unitsPerMetre;
        const len = Math.hypot(direction.x, direction.y, direction.z) || 1;
        const dx = direction.x / len, dy = direction.y / len, dz = direction.z / len;
        this._rvec.Set(origin.x / u, origin.y / u, origin.z / u);
        this._ray.mOrigin = this._rvec;
        this._vec.Set((dx * maxDistance) / u, (dy * maxDistance) / u, (dz * maxDistance) / u);
        this._ray.mDirection = this._vec;
        this._rayCollector.Reset();
        this._system.GetNarrowPhaseQuery().CastRay(this._ray, this._raySettings, this._rayCollector, this._bpFilter, this._objectFilter, this._bodyFilter, this._shapeFilter);
        if (!this._rayCollector.HadHit())
            return null;
        const hit = this._rayCollector.mHit;
        const body = this._byBodyId.get(hit.mBodyID.GetIndexAndSequenceNumber());
        if (!body)
            return null;
        const distance = hit.mFraction * maxDistance;
        const point = { x: origin.x + dx * distance, y: origin.y + dy * distance, z: origin.z + dz * distance };
        this._rvec.Set(point.x / u, point.y / u, point.z / u);
        const n = body._body.GetWorldSpaceSurfaceNormal(hit.mSubShapeID2, this._rvec);
        return { body, entity: body.entity, point, normal: { x: n.GetX(), y: n.GetY(), z: n.GetZ() }, distance };
    }
    /** Free every body and the world. */
    destroy() {
        this.stop();
        for (const ragdoll of [...this._ragdolls])
            this.removeRagdoll(ragdoll);
        for (const body of [...this._list])
            this.removeBody(body);
        const jolt = this._jolt;
        for (const value of [this._vec, this._rvec, this._quat, this._identity, this._ray, this._raySettings, this._rayCollector,
            this._bpFilter, this._objectFilter, this._bodyFilter, this._shapeFilter]) {
            jolt.destroy(value);
        }
        jolt.destroy(this._interface);
    }
    _createShape(shape) {
        const jolt = this._jolt;
        const u = this._options.unitsPerMetre;
        switch (shape.type) {
            case "box": {
                const hx = shape.halfExtents.x / u, hy = shape.halfExtents.y / u, hz = shape.halfExtents.z / u;
                this._vec.Set(hx, hy, hz);
                // Jolt rounds box corners by the convex radius; keep it within the smallest half extent
                return new jolt.BoxShape(this._vec, Math.min(0.05, hx * 0.5, hy * 0.5, hz * 0.5), undefined);
            }
            case "sphere":
                return new jolt.SphereShape(shape.radius / u, undefined);
            case "capsule":
                return new jolt.CapsuleShape(shape.halfHeight / u, shape.radius / u, undefined);
        }
    }
    _moveKinematicBodies(dt) {
        const u = this._options.unitsPerMetre;
        for (const body of this._list) {
            if (body.type !== "kinematic" || !body._enabled)
                continue;
            const entity = body.entity;
            entity.updateTransform();
            const m = entity._worldMatrix4?.matrix;
            if (!m)
                continue;
            const q = body.options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : matrixToQuaternion(m);
            const o = body._worldOffset(q);
            this._rvec.Set((m[12] + o.x) / u, (m[13] + o.y) / u, (m[14] + o.z) / u);
            this._quat.Set(q.x, q.y, q.z, q.w);
            this._bodies.MoveKinematic(body._id, this._rvec, this._quat, dt);
        }
    }
    /** Move each awake dynamic body's entity to the body. */
    _syncEntities() {
        const u = this._options.unitsPerMetre;
        for (const body of this._list) {
            if (body.type !== "dynamic" || !body._enabled || !body._body.IsActive())
                continue;
            const p = body._body.GetPosition();
            let x = p.GetX() * u, y = p.GetY() * u, z = p.GetZ() * u;
            const entity = body.entity;
            let q = null;
            if (!body.options.lockRotation) {
                const r = body._body.GetRotation();
                q = { x: r.GetX(), y: r.GetY(), z: r.GetZ(), w: r.GetW() };
            }
            const o = body._worldOffset(q || { x: 0, y: 0, z: 0, w: 1 });
            x -= o.x;
            y -= o.y;
            z -= o.z;
            // Into the parent's space when the parent isn't at the origin
            const parentMatrix = entity._parent?._worldMatrix4?.matrix;
            if (parentMatrix && !isIdentity(parentMatrix)) {
                const inverse = invertMat4(parentMatrix);
                if (inverse) {
                    const lx = inverse[0] * x + inverse[4] * y + inverse[8] * z + inverse[12];
                    const ly = inverse[1] * x + inverse[5] * y + inverse[9] * z + inverse[13];
                    const lz = inverse[2] * x + inverse[6] * y + inverse[10] * z + inverse[14];
                    x = lx;
                    y = ly;
                    z = lz;
                    if (q) {
                        const pq = matrixToQuaternion(parentMatrix);
                        q = multiplyQuat({ x: -pq.x, y: -pq.y, z: -pq.z, w: pq.w }, q);
                    }
                }
            }
            entity.translateTo(x, y, z);
            if (q)
                entity.quaternion(q);
        }
    }
}
function isIdentity(m) {
    return m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
        m[1] === 0 && m[2] === 0 && m[4] === 0 && m[6] === 0 && m[8] === 0 && m[9] === 0 &&
        m[12] === 0 && m[13] === 0 && m[14] === 0;
}
/** a * b for quaternions. */
export function multiplyQuat(a, b) {
    return {
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
}
