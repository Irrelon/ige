import { b2Vec2, b2Mat22, b2Rot, XY } from "../common/b2_math.js"
import { b2Joint, b2JointDef, b2IJointDef } from "./b2_joint.js"
import { b2SolverData } from "./b2_time_step.js"
export interface b2IMouseJointDef extends b2IJointDef {
    target?: XY;
    maxForce?: number;
    stiffness?: number;
    damping?: number;
}
export declare class b2MouseJointDef extends b2JointDef implements b2IMouseJointDef {
    readonly target: b2Vec2;
    maxForce: number;
    stiffness: number;
    damping: number;
    constructor();
}
export declare class b2MouseJoint extends b2Joint {
    readonly m_localAnchorB: b2Vec2;
    readonly m_targetA: b2Vec2;
    m_stiffness: number;
    m_damping: number;
    m_beta: number;
    readonly m_impulse: b2Vec2;
    m_maxForce: number;
    m_gamma: number;
    m_indexA: number;
    m_indexB: number;
    readonly m_rB: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_invMassB: number;
    m_invIB: number;
    readonly m_mass: b2Mat22;
    readonly m_C: b2Vec2;
    readonly m_qB: b2Rot;
    readonly m_lalcB: b2Vec2;
    readonly m_K: b2Mat22;
    constructor(def: b2IMouseJointDef);
    SetTarget(target: XY): void;
    GetTarget(): b2Vec2;
    SetMaxForce(maxForce: number): void;
    GetMaxForce(): number;
    SetStiffness(stiffness: number): void;
    GetStiffness(): number;
    SetDamping(damping: number): void;
    GetDamping(): number;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_Cdot;
    private static SolveVelocityConstraints_s_impulse;
    private static SolveVelocityConstraints_s_oldImpulse;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
    ShiftOrigin(newOrigin: XY): void;
}
