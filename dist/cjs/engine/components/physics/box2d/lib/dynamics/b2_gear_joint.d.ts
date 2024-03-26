import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Rot } from "../common/b2_math.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef, b2JointType } from "./b2_joint.js"
import type { b2PrismaticJoint } from "./b2_prismatic_joint.js"
import type { b2RevoluteJoint } from "./b2_revolute_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Body } from "./b2_body.js"
export interface b2IGearJointDef extends b2IJointDef {
    joint1: b2RevoluteJoint | b2PrismaticJoint;
    joint2: b2RevoluteJoint | b2PrismaticJoint;
    ratio?: number;
}
export declare class b2GearJointDef extends b2JointDef implements b2IGearJointDef {
    joint1: b2RevoluteJoint | b2PrismaticJoint;
    joint2: b2RevoluteJoint | b2PrismaticJoint;
    ratio: number;
    constructor();
}
export declare class b2GearJoint extends b2Joint {
    private static InitVelocityConstraints_s_u;
    private static InitVelocityConstraints_s_rA;
    private static InitVelocityConstraints_s_rB;
    private static InitVelocityConstraints_s_rC;
    private static InitVelocityConstraints_s_rD;
    private static SolvePositionConstraints_s_u;
    private static SolvePositionConstraints_s_rA;
    private static SolvePositionConstraints_s_rB;
    private static SolvePositionConstraints_s_rC;
    private static SolvePositionConstraints_s_rD;
    m_joint1: b2RevoluteJoint | b2PrismaticJoint;
    m_joint2: b2RevoluteJoint | b2PrismaticJoint;
    m_typeA: b2JointType;
    m_typeB: b2JointType;
    m_bodyC: b2Body;
    m_bodyD: b2Body;
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    readonly m_localAnchorC: b2Vec2;
    readonly m_localAnchorD: b2Vec2;
    readonly m_localAxisC: b2Vec2;
    readonly m_localAxisD: b2Vec2;
    m_referenceAngleA: number;
    m_referenceAngleB: number;
    m_constant: number;
    m_ratio: number;
    m_impulse: number;
    m_indexA: number;
    m_indexB: number;
    m_indexC: number;
    m_indexD: number;
    readonly m_lcA: b2Vec2;
    readonly m_lcB: b2Vec2;
    readonly m_lcC: b2Vec2;
    readonly m_lcD: b2Vec2;
    m_mA: number;
    m_mB: number;
    m_mC: number;
    m_mD: number;
    m_iA: number;
    m_iB: number;
    m_iC: number;
    m_iD: number;
    readonly m_JvAC: b2Vec2;
    readonly m_JvBD: b2Vec2;
    m_JwA: number;
    m_JwB: number;
    m_JwC: number;
    m_JwD: number;
    m_mass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_qC: b2Rot;
    readonly m_qD: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    readonly m_lalcC: b2Vec2;
    readonly m_lalcD: b2Vec2;
    constructor(def: b2IGearJointDef);
    InitVelocityConstraints(data: b2SolverData): void;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetJoint1(): b2PrismaticJoint | b2RevoluteJoint;
    GetJoint2(): b2PrismaticJoint | b2RevoluteJoint;
    GetRatio(): number;
    SetRatio(ratio: number): void;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
