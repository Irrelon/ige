"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgePhysics3d = exports.IgePhysicsSensor3d = exports.IgePhysicsBody3d = void 0;
exports.rotateVector = rotateVector;
exports.matrixToQuaternion = matrixToQuaternion;
exports.multiplyQuat = multiplyQuat;
const IgeEventingClass_1 = require("../core/IgeEventingClass.js");
const instance_1 = require("../instance.js");
const enums_1 = require("../../enums/index.js");
const IgeRaycast_1 = require("../webgl/IgeRaycast.js");
const IgeRagdoll3d_1 = require("./IgeRagdoll3d.js");
const IgePhysicsCharacter3d_1 = require("./IgePhysicsCharacter3d.js");
const DEFAULTS = {
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
class IgePhysicsBody3d extends IgeEventingClass_1.IgeEventingClass {
    constructor(physics, entity, options, body) {
        super();
        this.classId = "IgePhysicsBody3d";
        this._enabled = true;
        this._destroyed = false;
        /** True for trigger sensors (see addSensor()). */
        this._sensor = false;
        /** Body position and rotation at the last two steps (IGE units): x, y, z, qx, qy, qz, qw. */
        this._previous = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
        this._current = new Float64Array([0, 0, 0, 0, 0, 0, 1]);
        /** Whether _previous and _current differ (the entity still needs placing). */
        this._moving = true;
        /** Impact threshold in metres per second (0: no impact events). */
        this._impactThreshold = 0;
        /** Velocity before the current step (metres per second). */
        this._impactVelocity = new Float64Array(3);
        this._physics = physics;
        this.entity = entity;
        this.type = options.type || "dynamic";
        this.options = options;
        this._body = body;
        this._id = body.GetID();
        this._offset = options.offset ? Object.assign({}, options.offset) : { x: 0, y: 0, z: 0 };
        if (options.impacts) {
            this._impactThreshold = (options.impacts === true ? 100 : options.impacts) / physics._options.unitsPerMetre;
        }
        this._capture(true);
    }
    /** Record the body's transform as the latest step's (and the previous one's too when resetting). */
    _capture(reset = false) {
        const u = this._physics._options.unitsPerMetre;
        const p = this._body.GetPosition(), r = this._body.GetRotation();
        const previous = this._previous, current = this._current;
        if (!reset)
            previous.set(current);
        current[0] = p.GetX() * u;
        current[1] = p.GetY() * u;
        current[2] = p.GetZ() * u;
        current[3] = r.GetX();
        current[4] = r.GetY();
        current[5] = r.GetZ();
        current[6] = r.GetW();
        if (reset)
            previous.set(current);
        this._moving = true;
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
        this._capture(true);
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
            this._capture(true);
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
exports.IgePhysicsBody3d = IgePhysicsBody3d;
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
class IgePhysicsSensor3d extends IgeEventingClass_1.IgeEventingClass {
    constructor(body, includeStatic) {
        super();
        this.classId = "IgePhysicsSensor3d";
        this._overlapping = new Set();
        this.body = body;
        this.includeStatic = includeStatic;
    }
    /** The entity the sensor follows. */
    get entity() {
        return this.body.entity;
    }
    /** Bodies inside the sensor after the last step. */
    overlapping() {
        return [...this._overlapping];
    }
    /** Remove the sensor. */
    destroy() {
        this.body._physics.removeSensor(this);
    }
}
exports.IgePhysicsSensor3d = IgePhysicsSensor3d;
/** Whether a shape can only be used by static or kinematic bodies. */
function staticOnlyShape(shape) {
    if (shape.type === "mesh" || shape.type === "heightfield")
        return true;
    if (shape.type === "compound")
        return shape.children.some((child) => staticOnlyShape(child.shape));
    return false;
}
/** v rotated by the unit quaternion (x, y, z, w). */
function rotateVector(v, x, y, z, w) {
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
function matrixToQuaternion(m) {
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
class IgePhysics3d extends IgeEventingClass_1.IgeEventingClass {
    /**
     * Load Jolt and create a world. Rejects if Jolt can't load (e.g. the
     * jolt-physics package isn't installed).
     */
    static create() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const opts = Object.assign(Object.assign({}, DEFAULTS), options);
            const isolated = typeof globalThis !== "undefined" && globalThis.crossOriginIsolated === true;
            const threaded = opts.threads === true || (opts.threads === "auto" && isolated);
            if (opts.threads === true && !isolated) {
                throw new Error("IgePhysics3d: threads need a cross-origin isolated page (COOP/COEP headers)");
            }
            let init;
            if (threaded) {
                // @ts-ignore - subpath export (the package's typings cover the main entry)
                init = (yield Promise.resolve().then(() => __importStar(require(/* webpackChunkName: "jolt-physics-mt" */ "jolt-physics/wasm-compat-multithread")))).default;
            }
            else {
                init = (yield Promise.resolve().then(() => __importStar(require(/* webpackChunkName: "jolt-physics" */ "jolt-physics")))).default;
            }
            const jolt = yield init();
            return new IgePhysics3d(jolt, opts, threaded);
        });
    }
    constructor(jolt, options, threaded) {
        super();
        this.classId = "IgePhysics3d";
        this._list = [];
        this._ragdolls = [];
        this._ragdollBodies = new Map();
        this._layers = new Map();
        this._layerFilters = new Map();
        this._impactBodies = [];
        this._sensors = [];
        this._characters = [];
        this._byBodyId = new Map();
        this._accumulator = 0;
        this._stepMs = 0;
        this._stepsLastUpdate = 0;
        this._bodiesAddedSinceOptimize = 0;
        this._pendingDestroy = [];
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
        if (!layers.length)
            throw new Error("IgePhysics3d: at least one collision layer is needed");
        layers.forEach((layer, index) => this._layers.set(layer.name, index));
        const pairs = new jolt.ObjectLayerPairFilterTable(layers.length);
        for (let a = 0; a < layers.length; a++) {
            for (let b = a; b < layers.length; b++) {
                if (layers[a].static && layers[b].static)
                    continue;
                const ignored = options.ignore.some(([x, y]) => (x === layers[a].name && y === layers[b].name) || (x === layers[b].name && y === layers[a].name));
                if (!ignored)
                    pairs.EnableCollision(a, b);
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
    _layerIndex(name) {
        const index = this._layers.get(name);
        if (index === undefined)
            throw new Error(`IgePhysics3d: no collision layer "${name}" (see the layers option)`);
        return index;
    }
    /** The layer bodies go on by default: "static" / "moving" if they exist, else the first static / non-static layer. */
    _defaultLayer(isStatic) {
        const named = this._layers.get(isStatic ? "static" : "moving");
        if (named !== undefined)
            return named;
        const index = this._options.layers.findIndex((layer) => !!layer.static === isStatic);
        return index >= 0 ? index : 0;
    }
    /** Query filters that test what a layer collides with (cached per layer). */
    _filtersFor(layer) {
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
        instance_1.ige.engine.addBehaviour(enums_1.IgeBehaviourType.postUpdate, this._behaviourId, (_engine, tickDelta) => {
            this.update((tickDelta || 0) / 1000);
        });
        return this;
    }
    /** Stop stepping the world. */
    stop() {
        instance_1.ige.engine.removeBehaviour(enums_1.IgeBehaviourType.postUpdate, this._behaviourId);
        return this;
    }
    /**
     * Create a body for an entity at the entity's current world position
     * and rotation.
     */
    addBody(entity, options) {
        var _a, _b, _c, _d, _e, _f;
        const jolt = this._jolt;
        const type = options.type || "dynamic";
        const u = this._options.unitsPerMetre;
        if (type === "dynamic" && staticOnlyShape(options.shape)) {
            throw new Error("IgePhysics3d: mesh and heightfield shapes can't be dynamic; use convex or compound shapes, or a static or kinematic body");
        }
        const layer = options.layer ? this._layerIndex(options.layer) : this._defaultLayer(type === "static");
        // Start at the entity's world transform
        entity.updateTransform();
        const world = (_a = entity._worldMatrix4) === null || _a === void 0 ? void 0 : _a.matrix;
        const scale = world
            ? { x: Math.hypot(world[0], world[1], world[2]), y: Math.hypot(world[4], world[5], world[6]), z: Math.hypot(world[8], world[9], world[10]) }
            : { x: 1, y: 1, z: 1 };
        const { shape, cleanup } = this._createShape(options.shape, scale);
        const position = world ? { x: world[12], y: world[13], z: world[14] } : Object.assign({}, entity._translate);
        const rotation = options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : world ? matrixToQuaternion(world) : { x: 0, y: 0, z: 0, w: 1 };
        const offset = options.offset ? rotateVector(options.offset, rotation.x, rotation.y, rotation.z, rotation.w) : { x: 0, y: 0, z: 0 };
        this._rvec.Set((position.x + offset.x) / u, (position.y + offset.y) / u, (position.z + offset.z) / u);
        this._quat.Set(rotation.x, rotation.y, rotation.z, rotation.w);
        const motion = type === "static" ? jolt.EMotionType_Static : type === "kinematic" ? jolt.EMotionType_Kinematic : jolt.EMotionType_Dynamic;
        const settings = new jolt.BodyCreationSettings(shape, this._rvec, this._quat, motion, layer);
        settings.mFriction = (_b = options.friction) !== null && _b !== void 0 ? _b : 0.5;
        settings.mRestitution = (_c = options.restitution) !== null && _c !== void 0 ? _c : 0;
        settings.mLinearDamping = (_d = options.linearDamping) !== null && _d !== void 0 ? _d : 0.05;
        settings.mAngularDamping = (_e = options.angularDamping) !== null && _e !== void 0 ? _e : 0.05;
        settings.mGravityFactor = (_f = options.gravityFactor) !== null && _f !== void 0 ? _f : 1;
        if (options.lockRotation) {
            settings.mAllowedDOFs = jolt.EAllowedDOFs_TranslationX | jolt.EAllowedDOFs_TranslationY | jolt.EAllowedDOFs_TranslationZ;
        }
        if (options.ccd)
            settings.mMotionQuality = jolt.EMotionQuality_LinearCast;
        const body = this._bodies.CreateBody(settings);
        jolt.destroy(settings);
        cleanup === null || cleanup === void 0 ? void 0 : cleanup();
        this._bodies.AddBody(body.GetID(), type === "static" ? jolt.EActivation_DontActivate : jolt.EActivation_Activate);
        // Many new bodies at once (a level loading): rebuild the broad phase
        if (++this._bodiesAddedSinceOptimize > 256)
            this.optimize();
        const wrapper = new IgePhysicsBody3d(this, entity, options, body);
        this._list.push(wrapper);
        if (wrapper._impactThreshold > 0)
            this._impactBodies.push(wrapper);
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
        const impactIndex = this._impactBodies.indexOf(body);
        if (impactIndex >= 0)
            this._impactBodies.splice(impactIndex, 1);
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
        const ragdoll = new IgeRagdoll3d_1.IgeRagdoll3d(this, entity, options);
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
    removeRagdoll(ragdoll) {
        const index = this._ragdolls.indexOf(ragdoll);
        if (index >= 0)
            this._ragdolls.splice(index, 1);
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
    addSensor(entity, options) {
        const body = this.addBody(entity, { type: "kinematic", shape: options.shape, offset: options.offset, layer: options.layer });
        this._bodies.SetIsSensor(body._id, true);
        body._sensor = true;
        const sensor = new IgePhysicsSensor3d(body, !!options.includeStatic);
        this._sensors.push(sensor);
        return sensor;
    }
    /** Remove a sensor (bodies inside it get no "exit" event). */
    removeSensor(sensor) {
        const index = this._sensors.indexOf(sensor);
        if (index >= 0)
            this._sensors.splice(index, 1);
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
    addCharacter(entity, options) {
        var _a, _b, _c, _d, _e;
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
        settings.mMass = (_a = options.mass) !== null && _a !== void 0 ? _a : 80;
        settings.mMaxStrength = (_b = options.maxStrength) !== null && _b !== void 0 ? _b : 500;
        settings.mMaxSlopeAngle = (((_c = options.maxSlopeAngle) !== null && _c !== void 0 ? _c : 50) * Math.PI) / 180;
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
        const world = (_d = entity._worldMatrix4) === null || _d === void 0 ? void 0 : _d.matrix;
        const position = world ? { x: world[12], y: world[13], z: world[14] } : Object.assign({}, entity._translate);
        this._rvec.Set(position.x / u, position.y / u, position.z / u);
        const character = new jolt.CharacterVirtual(settings, this._rvec, this._identity, this._system);
        jolt.destroy(settings);
        jolt.destroy(shapeSettings);
        const update = new jolt.ExtendedUpdateSettings();
        this._vec.Set(0, ((_e = options.stepHeight) !== null && _e !== void 0 ? _e : 0.3 * u) / u, 0);
        update.mWalkStairsStepUp = this._vec;
        // Characters collide with each other
        if (!this._characterCollision)
            this._characterCollision = new jolt.CharacterVsCharacterCollisionSimple();
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
        entity._physicsBody3d = body;
        const wrapper = new IgePhysicsCharacter3d_1.IgePhysicsCharacter3d(this, entity, character, update, body);
        if (options.layer) {
            const filters = this._filtersFor(this._layerIndex(options.layer));
            wrapper._bpFilter = filters.bp;
            wrapper._objectFilter = filters.object;
        }
        if (options.pushable === false) {
            // Contacts can't push the character (the listener runs during its
            // update, on the main thread)
            const listener = new jolt.CharacterContactListenerJS();
            const noPush = (_character, _body, _subShape, _position, _normal, ioSettings) => {
                jolt.wrapPointer(ioSettings, jolt.CharacterContactSettings).mCanPushCharacter = false;
            };
            listener.OnAdjustBodyVelocity = () => { };
            listener.OnContactValidate = () => true;
            listener.OnCharacterContactValidate = () => true;
            listener.OnContactAdded = noPush;
            listener.OnContactPersisted = noPush;
            listener.OnContactRemoved = () => { };
            listener.OnCharacterContactAdded = noPush;
            listener.OnCharacterContactPersisted = noPush;
            listener.OnCharacterContactRemoved = () => { };
            listener.OnContactSolve = () => { };
            listener.OnCharacterContactSolve = () => { };
            character.SetListener(listener);
            wrapper._listener = listener;
        }
        this._characters.push(wrapper);
        return wrapper;
    }
    /** Remove a character and free it. */
    removeCharacter(character) {
        var _a;
        if (character._destroyed)
            return;
        character._destroyed = true;
        const index = this._characters.indexOf(character);
        if (index >= 0)
            this._characters.splice(index, 1);
        this._byBodyId.delete(character.body._id.GetIndexAndSequenceNumber());
        if (character.entity._physicsBody3d === character.body)
            character.entity._physicsBody3d = undefined;
        character.body._destroyed = true;
        if (!character.body._enabled) {
            // The character's destructor removes its inner body from the world
            this._bodies.AddBody(character.body._id, this._jolt.EActivation_DontActivate);
        }
        (_a = this._characterCollision) === null || _a === void 0 ? void 0 : _a.Remove(character._character);
        this._jolt.destroy(character._character);
        this._jolt.destroy(character._settings);
        if (character._listener)
            this._jolt.destroy(character._listener);
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
            for (const character of this._characters)
                character._update(step);
            this._moveKinematicBodies(step);
            if (this._impactBodies.length)
                this._recordImpactVelocities();
            this._interface.Step(step, 1);
            this._captureBodies();
            if (this._impactBodies.length)
                this._checkImpacts(step);
            this._accumulator -= step;
            steps++;
        }
        this._stepsLastUpdate = steps;
        // Place entities between the last two steps (every frame, steps or not)
        const alpha = this._options.interpolate ? this._accumulator / step : 1;
        this._syncEntities(alpha);
        for (const character of this._characters)
            character._sync(alpha);
        if (steps > 0) {
            this._stepMs = performance.now() - started;
            for (const ragdoll of this._ragdolls) {
                if (!ragdoll.asleep())
                    ragdoll.sync();
            }
            if (this._sensors.length)
                this._updateSensors();
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
    raycast(origin, direction, maxDistance, options = {}) {
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
        const jolt = this._jolt;
        for (const ragdoll of [...this._ragdolls])
            this.removeRagdoll(ragdoll);
        for (const sensor of [...this._sensors])
            this.removeSensor(sensor);
        for (const character of [...this._characters])
            this.removeCharacter(character);
        if (this._characterCollision)
            jolt.destroy(this._characterCollision);
        if (this._sensorCollector)
            jolt.destroy(this._sensorCollector);
        if (this._sensorSettings)
            jolt.destroy(this._sensorSettings);
        if (this._unitScale)
            jolt.destroy(this._unitScale);
        for (const body of [...this._list])
            this.removeBody(body);
        for (const value of [this._vec, this._rvec, this._quat, this._identity, this._ray, this._raySettings, this._rayCollector,
            this._bodyFilter, this._shapeFilter]) {
            jolt.destroy(value);
        }
        for (const filters of this._layerFilters.values()) {
            jolt.destroy(filters.bp);
            jolt.destroy(filters.object);
        }
        this._layerFilters.clear();
        if (this._impactCollector)
            jolt.destroy(this._impactCollector);
        jolt.destroy(this._interface);
    }
    /**
     * Build a Jolt shape. Shapes made from settings (mesh, convex) belong to
     * the settings until a body takes a reference, so cleanup() frees the
     * settings after the body is created.
     */
    _createShape(shape, scale) {
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
    _createCompoundShape(shape, scale) {
        const jolt = this._jolt;
        const u = this._options.unitsPerMetre;
        if (!shape.children.length)
            throw new Error("IgePhysics3d: a compound shape needs at least one child");
        const settings = new jolt.StaticCompoundShapeSettings();
        const cleanups = [];
        const position = new jolt.Vec3(0, 0, 0);
        const rotation = new jolt.Quat(0, 0, 0, 1);
        for (const child of shape.children) {
            const built = this._createShape(child.shape, scale);
            if (built.cleanup)
                cleanups.push(built.cleanup);
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
            for (const fn of cleanups)
                fn();
        };
        if (result.HasError()) {
            const message = result.GetError().c_str();
            cleanup();
            throw new Error(`IgePhysics3d: compound shape failed: ${message}`);
        }
        return { shape: result.Get(), cleanup };
    }
    _createHeightfieldShape(shape) {
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
    _createMeshShape(geometry, scale) {
        const jolt = this._jolt;
        const u = this._options.unitsPerMetre;
        const source = geometry.vertices;
        if (!source || source.length < 9)
            throw new Error(`IgePhysics3d: geometry "${geometry.id}" has no vertices`);
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
    _createConvexShape(geometry, scale) {
        const jolt = this._jolt;
        const u = this._options.unitsPerMetre;
        const source = geometry.vertices;
        if (!source || source.length < 12)
            throw new Error(`IgePhysics3d: geometry "${geometry.id}" needs at least 4 vertices for a convex shape`);
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
    _moveKinematicBodies(dt) {
        var _a;
        const u = this._options.unitsPerMetre;
        for (const body of this._list) {
            if (body.type !== "kinematic" || !body._enabled)
                continue;
            const entity = body.entity;
            entity.updateTransform();
            const m = (_a = entity._worldMatrix4) === null || _a === void 0 ? void 0 : _a.matrix;
            if (!m)
                continue;
            const q = body.options.lockRotation ? { x: 0, y: 0, z: 0, w: 1 } : matrixToQuaternion(m);
            const o = body._worldOffset(q);
            this._rvec.Set((m[12] + o.x) / u, (m[13] + o.y) / u, (m[14] + o.z) / u);
            this._quat.Set(q.x, q.y, q.z, q.w);
            this._bodies.MoveKinematic(body._id, this._rvec, this._quat, dt);
        }
    }
    /** Remember the velocity of bodies that report impacts, before a step. */
    _recordImpactVelocities() {
        for (const body of this._impactBodies) {
            if (!body._enabled || body.type !== "dynamic")
                continue;
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
    _checkImpacts(dt) {
        const jolt = this._jolt;
        const u = this._options.unitsPerMetre;
        const gravity = this._options.gravity;
        for (const body of this._impactBodies) {
            if (!body._enabled || body.type !== "dynamic" || !body._body.IsActive())
                continue;
            const before = body._impactVelocity;
            const v = body._body.GetLinearVelocity();
            const gravityFactor = body._body.GetMotionProperties().GetGravityFactor();
            const dx = v.GetX() - before[0];
            const dy = v.GetY() - (before[1] + gravity * gravityFactor * dt);
            const dz = v.GetZ() - before[2];
            const change = Math.hypot(dx, dy, dz);
            if (change < body._impactThreshold)
                continue;
            // What it is touching now
            const collector = this._impactCollector || (this._impactCollector = new jolt.CollideShapeAllHitCollisionCollector());
            const settings = this._sensorSettings || (this._sensorSettings = new jolt.CollideShapeSettings());
            const unitScale = this._unitScale || (this._unitScale = new jolt.Vec3(1, 1, 1));
            settings.mMaxSeparationDistance = 0.02;
            collector.Reset();
            const filters = this._filtersFor(body._body.GetObjectLayer());
            this._rvec.Set(0, 0, 0);
            this._system.GetNarrowPhaseQuery().CollideShape(body._body.GetShape(), unitScale, body._body.GetCenterOfMassTransform(), settings, this._rvec, collector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);
            settings.mMaxSeparationDistance = 0;
            const others = [];
            const hits = collector.mHits;
            for (let i = 0, n = hits.size(); i < n; i++) {
                const other = this._byBodyId.get(hits.at(i).mBodyID2.GetIndexAndSequenceNumber());
                if (other && other !== body && !other._sensor && !others.includes(other))
                    others.push(other);
            }
            const impact = { speed: change * u, others };
            body.emit("impact", impact);
        }
    }
    /** Find what overlaps each sensor and emit "enter" / "exit" for the changes. */
    _updateSensors() {
        const jolt = this._jolt;
        const collector = this._sensorCollector || (this._sensorCollector = new jolt.CollideShapeAllHitCollisionCollector());
        const settings = this._sensorSettings || (this._sensorSettings = new jolt.CollideShapeSettings());
        const unitScale = this._unitScale || (this._unitScale = new jolt.Vec3(1, 1, 1));
        const query = this._system.GetNarrowPhaseQuery();
        this._rvec.Set(0, 0, 0);
        for (const sensor of this._sensors) {
            const own = sensor.body;
            if (!own._enabled)
                continue;
            collector.Reset();
            const filters = this._filtersFor(own._body.GetObjectLayer());
            query.CollideShape(own._body.GetShape(), unitScale, own._body.GetCenterOfMassTransform(), settings, this._rvec, collector, filters.bp, filters.object, this._bodyFilter, this._shapeFilter);
            const now = new Set();
            const hits = collector.mHits;
            for (let i = 0, n = hits.size(); i < n; i++) {
                const other = this._byBodyId.get(hits.at(i).mBodyID2.GetIndexAndSequenceNumber());
                if (!other || other === own || !other._enabled)
                    continue;
                if (other.type === "static" && !sensor.includeStatic)
                    continue;
                now.add(other);
            }
            for (const other of now) {
                if (!sensor._overlapping.has(other))
                    sensor.emit("enter", other);
            }
            for (const other of sensor._overlapping) {
                if (!now.has(other))
                    sensor.emit("exit", other);
            }
            sensor._overlapping = now;
        }
    }
    /** Move each awake dynamic body's entity to the body. */
    /** Record every awake dynamic body's transform after a step. */
    _captureBodies() {
        for (const body of this._list) {
            if (body.type !== "dynamic" || !body._enabled)
                continue;
            if (body._body.IsActive()) {
                body._capture();
            }
            else if (body._moving) {
                // Fell asleep: settle on the last step's transform
                body._previous.set(body._current);
            }
        }
    }
    /**
     * Move each dynamic body's entity to its transform, alpha of the way
     * from the previous step's to the latest (1 = the latest).
     */
    _syncEntities(alpha) {
        var _a, _b;
        for (const body of this._list) {
            if (body.type !== "dynamic" || !body._enabled || !body._moving)
                continue;
            const a = body._previous, b = body._current;
            let x = a[0] + (b[0] - a[0]) * alpha;
            let y = a[1] + (b[1] - a[1]) * alpha;
            let z = a[2] + (b[2] - a[2]) * alpha;
            const entity = body.entity;
            let q = null;
            if (!body.options.lockRotation) {
                // Normalised lerp, along the shorter arc
                const sign = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0 ? -1 : 1;
                const qx = a[3] + (b[3] * sign - a[3]) * alpha, qy = a[4] + (b[4] * sign - a[4]) * alpha;
                const qz = a[5] + (b[5] * sign - a[5]) * alpha, qw = a[6] + (b[6] * sign - a[6]) * alpha;
                const len = Math.hypot(qx, qy, qz, qw) || 1;
                q = { x: qx / len, y: qy / len, z: qz / len, w: qw / len };
            }
            const o = body._worldOffset(q || { x: 0, y: 0, z: 0, w: 1 });
            x -= o.x;
            y -= o.y;
            z -= o.z;
            // Into the parent's space when the parent isn't at the origin
            const parentMatrix = (_b = (_a = entity._parent) === null || _a === void 0 ? void 0 : _a._worldMatrix4) === null || _b === void 0 ? void 0 : _b.matrix;
            if (parentMatrix && !isIdentity(parentMatrix)) {
                const inverse = (0, IgeRaycast_1.invertMat4)(parentMatrix);
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
            // Asleep with both steps the same: placed for good until it moves again
            if (!body._body.IsActive() && a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
                a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6]) {
                body._moving = false;
            }
        }
    }
}
exports.IgePhysics3d = IgePhysics3d;
function isIdentity(m) {
    return m[0] === 1 && m[5] === 1 && m[10] === 1 && m[15] === 1 &&
        m[1] === 0 && m[2] === 0 && m[4] === 0 && m[6] === 0 && m[8] === 0 && m[9] === 0 &&
        m[12] === 0 && m[13] === 0 && m[14] === 0;
}
/** a * b for quaternions. */
function multiplyQuat(a, b) {
    return {
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
}
