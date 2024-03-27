import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Mat22, b2Rot } from "../common/b2_math.js"
import type { b2Body } from "./b2_body.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
export interface b2IMotorJointDef extends b2IJointDef {
    linearOffset?: XY;
    angularOffset?: number;
    maxForce?: number;
    maxTorque?: number;
    correctionFactor?: number;
}
export declare class b2MotorJointDef extends b2JointDef implements b2IMotorJointDef {
    readonly linearOffset: b2Vec2;
    angularOffset: number;
    maxForce: number;
    maxTorque: number;
    correctionFactor: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body): void;
}
export declare class b2MotorJoint extends b2Joint {
    readonly m_linearOffset: b2Vec2;
    m_angularOffset: number;
    readonly m_linearImpulse: b2Vec2;
    m_angularImpulse: number;
    m_maxForce: number;
    m_maxTorque: number;
    m_correctionFactor: number;
    m_indexA: number;
    m_indexB: number;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    readonly m_linearError: b2Vec2;
    m_angularError: number;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    readonly m_linearMass: b2Mat22;
    m_angularMass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_K: b2Mat22;
    constructor(def: b2IMotorJointDef);
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    SetLinearOffset(linearOffset: b2Vec2): void;
    GetLinearOffset(): b2Vec2;
    SetAngularOffset(angularOffset: number): void;
    GetAngularOffset(): number;
    SetMaxForce(force: number): void;
    GetMaxForce(): number;
    SetMaxTorque(torque: number): void;
    GetMaxTorque(): number;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_Cdot_v2;
    private static SolveVelocityConstraints_s_impulse_v2;
    private static SolveVelocityConstraints_s_oldImpulse_v2;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
