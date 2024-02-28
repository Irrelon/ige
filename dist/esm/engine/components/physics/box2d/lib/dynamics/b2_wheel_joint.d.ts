import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Rot } from "../common/b2_math.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Body } from "./b2_body.js"
import type { b2Draw } from "../common/b2_draw.js"
export interface b2IWheelJointDef extends b2IJointDef {
    localAnchorA?: XY;
    localAnchorB?: XY;
    localAxisA?: XY;
    enableLimit?: boolean;
    lowerTranslation?: number;
    upperTranslation?: number;
    enableMotor?: boolean;
    maxMotorTorque?: number;
    motorSpeed?: number;
    stiffness?: number;
    damping?: number;
}
export declare class b2WheelJointDef extends b2JointDef implements b2IWheelJointDef {
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    readonly localAxisA: b2Vec2;
    enableLimit: boolean;
    lowerTranslation: number;
    upperTranslation: number;
    enableMotor: boolean;
    maxMotorTorque: number;
    motorSpeed: number;
    stiffness: number;
    damping: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body, anchor: XY, axis: XY): void;
}
export declare class b2WheelJoint extends b2Joint {
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    readonly m_localXAxisA: b2Vec2;
    readonly m_localYAxisA: b2Vec2;
    m_impulse: number;
    m_motorImpulse: number;
    m_springImpulse: number;
    m_lowerImpulse: number;
    m_upperImpulse: number;
    m_translation: number;
    m_lowerTranslation: number;
    m_upperTranslation: number;
    m_maxMotorTorque: number;
    m_motorSpeed: number;
    m_enableLimit: boolean;
    m_enableMotor: boolean;
    m_stiffness: number;
    m_damping: number;
    m_indexA: number;
    m_indexB: number;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    readonly m_ax: b2Vec2;
    readonly m_ay: b2Vec2;
    m_sAx: number;
    m_sBx: number;
    m_sAy: number;
    m_sBy: number;
    m_mass: number;
    m_motorMass: number;
    m_axialMass: number;
    m_springMass: number;
    m_bias: number;
    m_gamma: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    constructor(def: b2IWheelJointDef);
    GetMotorSpeed(): number;
    GetMaxMotorTorque(): number;
    SetSpringFrequencyHz(hz: number): void;
    GetSpringFrequencyHz(): number;
    SetSpringDampingRatio(ratio: number): void;
    GetSpringDampingRatio(): number;
    private static InitVelocityConstraints_s_d;
    private static InitVelocityConstraints_s_P;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_P;
    SolveVelocityConstraints(data: b2SolverData): void;
    private static SolvePositionConstraints_s_d;
    private static SolvePositionConstraints_s_P;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetDefinition(def: b2WheelJointDef): b2WheelJointDef;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetLocalAnchorA(): Readonly<b2Vec2>;
    GetLocalAnchorB(): Readonly<b2Vec2>;
    GetLocalAxisA(): Readonly<b2Vec2>;
    GetJointTranslation(): number;
    GetJointLinearSpeed(): number;
    GetJointAngle(): number;
    GetJointAngularSpeed(): number;
    GetPrismaticJointTranslation(): number;
    GetPrismaticJointSpeed(): number;
    GetRevoluteJointAngle(): number;
    GetRevoluteJointSpeed(): number;
    IsMotorEnabled(): boolean;
    EnableMotor(flag: boolean): void;
    SetMotorSpeed(speed: number): void;
    SetMaxMotorTorque(force: number): void;
    GetMotorTorque(inv_dt: number): number;
    IsLimitEnabled(): boolean;
    EnableLimit(flag: boolean): void;
    GetLowerLimit(): number;
    GetUpperLimit(): number;
    SetLimits(lower: number, upper: number): void;
    Dump(log: (format: string, ...args: any[]) => void): void;
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
    Draw(draw: b2Draw): void;
}
