import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Mat22, b2Mat33, b2Rot } from "../common/b2_math.js"
import type { b2Body } from "./b2_body.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Draw } from "../common/b2_draw.js"
export interface b2IPrismaticJointDef extends b2IJointDef {
    localAnchorA?: XY;
    localAnchorB?: XY;
    localAxisA?: XY;
    referenceAngle?: number;
    enableLimit?: boolean;
    lowerTranslation?: number;
    upperTranslation?: number;
    enableMotor?: boolean;
    maxMotorForce?: number;
    motorSpeed?: number;
}
export declare class b2PrismaticJointDef extends b2JointDef implements b2IPrismaticJointDef {
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    readonly localAxisA: b2Vec2;
    referenceAngle: number;
    enableLimit: boolean;
    lowerTranslation: number;
    upperTranslation: number;
    enableMotor: boolean;
    maxMotorForce: number;
    motorSpeed: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body, anchor: XY, axis: XY): void;
}
export declare class b2PrismaticJoint extends b2Joint {
    private static InitVelocityConstraints_s_d;
    private static InitVelocityConstraints_s_P;
    private static SolveVelocityConstraints_s_P;
    private static SolveVelocityConstraints_s_df;
    private static SolvePositionConstraints_s_d;
    private static SolvePositionConstraints_s_impulse;
    private static SolvePositionConstraints_s_impulse1;
    private static SolvePositionConstraints_s_P;
    private static GetJointTranslation_s_pA;
    private static GetJointTranslation_s_pB;
    private static GetJointTranslation_s_d;
    private static GetJointTranslation_s_axis;
    private static Draw_s_pA;
    private static Draw_s_pB;
    private static Draw_s_axis;
    private static Draw_s_c1;
    private static Draw_s_c2;
    private static Draw_s_c3;
    private static Draw_s_c4;
    private static Draw_s_c5;
    private static Draw_s_lower;
    private static Draw_s_upper;
    private static Draw_s_perp;
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    readonly m_localXAxisA: b2Vec2;
    readonly m_localYAxisA: b2Vec2;
    m_referenceAngle: number;
    readonly m_impulse: b2Vec2;
    m_motorImpulse: number;
    m_lowerImpulse: number;
    m_upperImpulse: number;
    m_lowerTranslation: number;
    m_upperTranslation: number;
    m_maxMotorForce: number;
    m_motorSpeed: number;
    m_enableLimit: boolean;
    m_enableMotor: boolean;
    m_indexA: number;
    m_indexB: number;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    readonly m_axis: b2Vec2;
    readonly m_perp: b2Vec2;
    m_s1: number;
    m_s2: number;
    m_a1: number;
    m_a2: number;
    readonly m_K: b2Mat22;
    readonly m_K3: b2Mat33;
    readonly m_K2: b2Mat22;
    m_translation: number;
    m_axialMass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    constructor(def: b2IPrismaticJointDef);
    InitVelocityConstraints(data: b2SolverData): void;
    SolveVelocityConstraints(data: b2SolverData): void;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetLocalAnchorA(): Readonly<b2Vec2>;
    GetLocalAnchorB(): Readonly<b2Vec2>;
    GetLocalAxisA(): Readonly<b2Vec2>;
    GetReferenceAngle(): number;
    GetJointTranslation(): number;
    GetJointSpeed(): number;
    IsLimitEnabled(): boolean;
    EnableLimit(flag: boolean): void;
    GetLowerLimit(): number;
    GetUpperLimit(): number;
    SetLimits(lower: number, upper: number): void;
    IsMotorEnabled(): boolean;
    EnableMotor(flag: boolean): void;
    SetMotorSpeed(speed: number): void;
    GetMotorSpeed(): number;
    SetMaxMotorForce(force: number): void;
    GetMaxMotorForce(): number;
    GetMotorForce(inv_dt: number): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
    Draw(draw: b2Draw): void;
}
