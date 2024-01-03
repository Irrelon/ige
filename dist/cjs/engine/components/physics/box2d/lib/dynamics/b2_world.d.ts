import { b2Vec2, b2Transform, XY } from "../common/b2_math.js"
import { b2Color, b2Draw } from "../common/b2_draw.js"
import { b2AABB } from "../collision/b2_collision.js"
import { b2Shape } from "../collision/b2_shape.js"
import { b2Contact } from "./b2_contact.js"
import { b2Joint } from "./b2_joint.js"
import { b2AreaJoint, b2IAreaJointDef } from "./b2_area_joint.js"
import { b2DistanceJoint, b2IDistanceJointDef } from "./b2_distance_joint.js"
import { b2FrictionJoint, b2IFrictionJointDef } from "./b2_friction_joint.js"
import { b2GearJoint, b2IGearJointDef } from "./b2_gear_joint.js"
import { b2MotorJoint, b2IMotorJointDef } from "./b2_motor_joint.js"
import { b2MouseJoint, b2IMouseJointDef } from "./b2_mouse_joint.js"
import { b2PrismaticJoint, b2IPrismaticJointDef } from "./b2_prismatic_joint.js"
import { b2PulleyJoint, b2IPulleyJointDef } from "./b2_pulley_joint.js"
import { b2RevoluteJoint, b2IRevoluteJointDef } from "./b2_revolute_joint.js"
import { b2WeldJoint, b2IWeldJointDef } from "./b2_weld_joint.js"
import { b2WheelJoint, b2IWheelJointDef } from "./b2_wheel_joint.js"
import { b2Body, b2IBodyDef } from "./b2_body.js"
import { b2ContactManager } from "./b2_contact_manager.js"
import { b2Fixture } from "./b2_fixture.js"
import { b2Island } from "./b2_island.js"
import { b2Profile, b2TimeStep } from "./b2_time_step.js"
import { b2ContactFilter } from "./b2_world_callbacks.js"
import { b2ContactListener } from "./b2_world_callbacks.js"
import { b2DestructionListener } from "./b2_world_callbacks.js"
import { b2QueryCallback, b2QueryCallbackFunction } from "./b2_world_callbacks.js"
import { b2RayCastCallback, b2RayCastCallbackFunction } from "./b2_world_callbacks.js"
import { b2ParticleSystemDef, b2ParticleSystem } from "../particle/b2_particle_system.js"
import { b2Controller } from "../controllers/b2_controller.js"
export declare class b2World {
    readonly m_contactManager: b2ContactManager;
    m_bodyList: b2Body | null;
    m_jointList: b2Joint | null;
    m_particleSystemList: b2ParticleSystem | null;
    m_bodyCount: number;
    m_jointCount: number;
    readonly m_gravity: b2Vec2;
    m_allowSleep: boolean;
    m_destructionListener: b2DestructionListener | null;
    m_debugDraw: b2Draw | null;
    m_inv_dt0: number;
    m_newContacts: boolean;
    m_locked: boolean;
    m_clearForces: boolean;
    m_warmStarting: boolean;
    m_continuousPhysics: boolean;
    m_subStepping: boolean;
    m_stepComplete: boolean;
    readonly m_profile: b2Profile;
    readonly m_island: b2Island;
    readonly s_stack: Array<b2Body | null>;
    m_controllerList: b2Controller | null;
    m_controllerCount: number;
    constructor(gravity: XY);
    SetDestructionListener(listener: b2DestructionListener | null): void;
    SetContactFilter(filter: b2ContactFilter): void;
    SetContactListener(listener: b2ContactListener): void;
    SetDebugDraw(debugDraw: b2Draw | null): void;
    CreateBody(def?: b2IBodyDef): b2Body;
    DestroyBody(b: b2Body): void;
    private static _Joint_Create;
    private static _Joint_Destroy;
    CreateJoint(def: b2IAreaJointDef): b2AreaJoint;
    CreateJoint(def: b2IDistanceJointDef): b2DistanceJoint;
    CreateJoint(def: b2IFrictionJointDef): b2FrictionJoint;
    CreateJoint(def: b2IGearJointDef): b2GearJoint;
    CreateJoint(def: b2IMotorJointDef): b2MotorJoint;
    CreateJoint(def: b2IMouseJointDef): b2MouseJoint;
    CreateJoint(def: b2IPrismaticJointDef): b2PrismaticJoint;
    CreateJoint(def: b2IPulleyJointDef): b2PulleyJoint;
    CreateJoint(def: b2IRevoluteJointDef): b2RevoluteJoint;
    CreateJoint(def: b2IWeldJointDef): b2WeldJoint;
    CreateJoint(def: b2IWheelJointDef): b2WheelJoint;
    DestroyJoint(j: b2Joint): void;
    CreateParticleSystem(def: b2ParticleSystemDef): b2ParticleSystem;
    DestroyParticleSystem(p: b2ParticleSystem): void;
    CalculateReasonableParticleIterations(timeStep: number): number;
    private static Step_s_step;
    private static Step_s_stepTimer;
    private static Step_s_timer;
    Step(dt: number, velocityIterations: number, positionIterations: number, particleIterations?: number): void;
    ClearForces(): void;
    DrawParticleSystem(system: b2ParticleSystem): void;
    private static DebugDraw_s_color;
    private static DebugDraw_s_vs;
    private static DebugDraw_s_xf;
    DebugDraw(): void;
    QueryAABB(callback: b2QueryCallback, aabb: b2AABB): void;
    QueryAABB(aabb: b2AABB, fn: b2QueryCallbackFunction): void;
    private _QueryAABB;
    QueryAllAABB(aabb: b2AABB, out?: b2Fixture[]): b2Fixture[];
    QueryPointAABB(callback: b2QueryCallback, point: XY): void;
    QueryPointAABB(point: XY, fn: b2QueryCallbackFunction): void;
    private _QueryPointAABB;
    QueryAllPointAABB(point: XY, out?: b2Fixture[]): b2Fixture[];
    QueryFixtureShape(callback: b2QueryCallback, shape: b2Shape, index: number, transform: b2Transform): void;
    QueryFixtureShape(shape: b2Shape, index: number, transform: b2Transform, fn: b2QueryCallbackFunction): void;
    private static QueryFixtureShape_s_aabb;
    private _QueryFixtureShape;
    QueryAllFixtureShape(shape: b2Shape, index: number, transform: b2Transform, out?: b2Fixture[]): b2Fixture[];
    QueryFixturePoint(callback: b2QueryCallback, point: XY): void;
    QueryFixturePoint(point: XY, fn: b2QueryCallbackFunction): void;
    private _QueryFixturePoint;
    QueryAllFixturePoint(point: XY, out?: b2Fixture[]): b2Fixture[];
    RayCast(callback: b2RayCastCallback, point1: XY, point2: XY): void;
    RayCast(point1: XY, point2: XY, fn: b2RayCastCallbackFunction): void;
    private static RayCast_s_input;
    private static RayCast_s_output;
    private static RayCast_s_point;
    private _RayCast;
    RayCastOne(point1: XY, point2: XY): b2Fixture | null;
    RayCastAll(point1: XY, point2: XY, out?: b2Fixture[]): b2Fixture[];
    GetBodyList(): b2Body | null;
    GetJointList(): b2Joint | null;
    GetParticleSystemList(): b2ParticleSystem | null;
    GetContactList(): b2Contact | null;
    SetAllowSleeping(flag: boolean): void;
    GetAllowSleeping(): boolean;
    SetWarmStarting(flag: boolean): void;
    GetWarmStarting(): boolean;
    SetContinuousPhysics(flag: boolean): void;
    GetContinuousPhysics(): boolean;
    SetSubStepping(flag: boolean): void;
    GetSubStepping(): boolean;
    GetProxyCount(): number;
    GetBodyCount(): number;
    GetJointCount(): number;
    GetContactCount(): number;
    GetTreeHeight(): number;
    GetTreeBalance(): number;
    GetTreeQuality(): number;
    SetGravity(gravity: XY, wake?: boolean): void;
    GetGravity(): Readonly<b2Vec2>;
    IsLocked(): boolean;
    SetAutoClearForces(flag: boolean): void;
    GetAutoClearForces(): boolean;
    ShiftOrigin(newOrigin: XY): void;
    GetContactManager(): b2ContactManager;
    GetProfile(): b2Profile;
    Dump(log: (format: string, ...args: any[]) => void): void;
    DrawShape(fixture: b2Fixture, color: b2Color): void;
    Solve(step: b2TimeStep): void;
    private static SolveTOI_s_subStep;
    private static SolveTOI_s_backup;
    private static SolveTOI_s_backup1;
    private static SolveTOI_s_backup2;
    private static SolveTOI_s_toi_input;
    private static SolveTOI_s_toi_output;
    SolveTOI(step: b2TimeStep): void;
    AddController(controller: b2Controller): b2Controller;
    RemoveController(controller: b2Controller): b2Controller;
}
