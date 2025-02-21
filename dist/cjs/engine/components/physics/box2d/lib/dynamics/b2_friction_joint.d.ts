import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Mat22, b2Rot } from "../common/b2_math.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Body } from "./b2_body.js"
export interface b2IFrictionJointDef extends b2IJointDef {
    localAnchorA?: XY;
    localAnchorB?: XY;
    maxForce?: number;
    maxTorque?: number;
}
export declare class b2FrictionJointDef extends b2JointDef implements b2IFrictionJointDef {
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    maxForce: number;
    maxTorque: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body, anchor: XY): void;
}
export declare class b2FrictionJoint extends b2Joint {
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    readonly m_linearImpulse: b2Vec2;
    m_angularImpulse: number;
    m_maxForce: number;
    m_maxTorque: number;
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
    readonly m_linearMass: b2Mat22;
    m_angularMass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    readonly m_K: b2Mat22;
    constructor(def: b2IFrictionJointDef);
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_Cdot_v2;
    private static SolveVelocityConstraints_s_impulseV;
    private static SolveVelocityConstraints_s_oldImpulseV;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetLocalAnchorA(): Readonly<b2Vec2>;
    GetLocalAnchorB(): Readonly<b2Vec2>;
    SetMaxForce(force: number): void;
    GetMaxForce(): number;
    SetMaxTorque(torque: number): void;
    GetMaxTorque(): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
