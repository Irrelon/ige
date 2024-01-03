import { b2Vec2, b2Vec3, b2Mat33, b2Rot, XY } from "../common/b2_math.js"
import { b2Body } from "./b2_body.js"
import { b2Joint, b2JointDef, b2IJointDef } from "./b2_joint.js"
import { b2SolverData } from "./b2_time_step.js"
export interface b2IWeldJointDef extends b2IJointDef {
    localAnchorA?: XY;
    localAnchorB?: XY;
    referenceAngle?: number;
    stiffness?: number;
    damping?: number;
}
export declare class b2WeldJointDef extends b2JointDef implements b2IWeldJointDef {
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    referenceAngle: number;
    stiffness: number;
    damping: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body, anchor: XY): void;
}
export declare class b2WeldJoint extends b2Joint {
    m_stiffness: number;
    m_damping: number;
    m_bias: number;
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    m_referenceAngle: number;
    m_gamma: number;
    readonly m_impulse: b2Vec3;
    m_indexA: number;
    m_indexB: number;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    readonly m_mass: b2Mat33;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    readonly m_K: b2Mat33;
    constructor(def: b2IWeldJointDef);
    private static InitVelocityConstraints_s_P;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_Cdot1;
    private static SolveVelocityConstraints_s_impulse1;
    private static SolveVelocityConstraints_s_impulse;
    private static SolveVelocityConstraints_s_P;
    SolveVelocityConstraints(data: b2SolverData): void;
    private static SolvePositionConstraints_s_C1;
    private static SolvePositionConstraints_s_P;
    private static SolvePositionConstraints_s_impulse;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetLocalAnchorA(): Readonly<b2Vec2>;
    GetLocalAnchorB(): Readonly<b2Vec2>;
    GetReferenceAngle(): number;
    SetStiffness(stiffness: number): void;
    GetStiffness(): number;
    SetDamping(damping: number): void;
    GetDamping(): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
