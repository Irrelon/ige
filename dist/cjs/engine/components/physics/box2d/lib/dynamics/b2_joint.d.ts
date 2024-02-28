import type { XY } from "../common/b2_math.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2Body } from "./b2_body.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
export declare enum b2JointType {
    e_unknownJoint = 0,
    e_revoluteJoint = 1,
    e_prismaticJoint = 2,
    e_distanceJoint = 3,
    e_pulleyJoint = 4,
    e_mouseJoint = 5,
    e_gearJoint = 6,
    e_wheelJoint = 7,
    e_weldJoint = 8,
    e_frictionJoint = 9,
    e_ropeJoint = 10,
    e_motorJoint = 11,
    e_areaJoint = 12
}
export declare class b2Jacobian {
    readonly linear: b2Vec2;
    angularA: number;
    angularB: number;
    SetZero(): b2Jacobian;
    Set(x: XY, a1: number, a2: number): b2Jacobian;
}
export declare class b2JointEdge {
    private _other;
    get other(): b2Body;
    set other(value: b2Body);
    readonly joint: b2Joint;
    prev: b2JointEdge | null;
    next: b2JointEdge | null;
    constructor(joint: b2Joint);
    Reset(): void;
}
export interface b2IJointDef {
    type: b2JointType;
    userData?: any;
    bodyA: b2Body;
    bodyB: b2Body;
    collideConnected?: boolean;
}
export declare abstract class b2JointDef implements b2IJointDef {
    readonly type: b2JointType;
    userData: any;
    bodyA: b2Body;
    bodyB: b2Body;
    collideConnected: boolean;
    constructor(type: b2JointType);
}
export declare function b2LinearStiffness(def: {
    stiffness: number;
    damping: number;
}, frequencyHertz: number, dampingRatio: number, bodyA: b2Body, bodyB: b2Body): void;
export declare function b2AngularStiffness(def: {
    stiffness: number;
    damping: number;
}, frequencyHertz: number, dampingRatio: number, bodyA: b2Body, bodyB: b2Body): void;
export declare abstract class b2Joint {
    readonly m_type: b2JointType;
    m_prev: b2Joint | null;
    m_next: b2Joint | null;
    readonly m_edgeA: b2JointEdge;
    readonly m_edgeB: b2JointEdge;
    m_bodyA: b2Body;
    m_bodyB: b2Body;
    m_index: number;
    m_islandFlag: boolean;
    m_collideConnected: boolean;
    m_userData: any;
    constructor(def: b2IJointDef);
    GetType(): b2JointType;
    GetBodyA(): b2Body;
    GetBodyB(): b2Body;
    abstract GetAnchorA<T extends XY>(out: T): T;
    abstract GetAnchorB<T extends XY>(out: T): T;
    abstract GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    abstract GetReactionTorque(inv_dt: number): number;
    GetNext(): b2Joint | null;
    GetUserData(): any;
    SetUserData(data: any): void;
    IsEnabled(): boolean;
    GetCollideConnected(): boolean;
    Dump(log: (format: string, ...args: any[]) => void): void;
    ShiftOrigin(newOrigin: XY): void;
    private static Draw_s_p1;
    private static Draw_s_p2;
    private static Draw_s_color;
    private static Draw_s_c;
    Draw(draw: b2Draw): void;
    abstract InitVelocityConstraints(data: b2SolverData): void;
    abstract SolveVelocityConstraints(data: b2SolverData): void;
    abstract SolvePositionConstraints(data: b2SolverData): boolean;
}
