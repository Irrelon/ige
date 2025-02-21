import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Rot } from "../common/b2_math.js"
import type { b2IJointDef } from "./b2_joint.js"
import { b2Joint, b2JointDef } from "./b2_joint.js"
import type { b2SolverData } from "./b2_time_step.js"
import type { b2Body } from "./b2_body.js"
import type { b2Draw } from "../common/b2_draw.js"
export interface b2IDistanceJointDef extends b2IJointDef {
    localAnchorA?: XY;
    localAnchorB?: XY;
    length?: number;
    minLength?: number;
    maxLength?: number;
    stiffness?: number;
    damping?: number;
}
export declare class b2DistanceJointDef extends b2JointDef implements b2IDistanceJointDef {
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    length: number;
    minLength: number;
    maxLength: number;
    stiffness: number;
    damping: number;
    constructor();
    Initialize(b1: b2Body, b2: b2Body, anchor1: XY, anchor2: XY): void;
}
export declare class b2DistanceJoint extends b2Joint {
    m_stiffness: number;
    m_damping: number;
    m_bias: number;
    m_length: number;
    m_minLength: number;
    m_maxLength: number;
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    m_gamma: number;
    m_impulse: number;
    m_lowerImpulse: number;
    m_upperImpulse: number;
    m_indexA: number;
    m_indexB: number;
    readonly m_u: b2Vec2;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_currentLength: number;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    m_softMass: number;
    m_mass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    constructor(def: b2IDistanceJointDef);
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetLocalAnchorA(): Readonly<b2Vec2>;
    GetLocalAnchorB(): Readonly<b2Vec2>;
    SetLength(length: number): number;
    GetLength(): number;
    SetMinLength(minLength: number): number;
    SetMaxLength(maxLength: number): number;
    GetCurrentLength(): number;
    SetStiffness(stiffness: number): void;
    GetStiffness(): number;
    SetDamping(damping: number): void;
    GetDamping(): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
    private static InitVelocityConstraints_s_P;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_vpA;
    private static SolveVelocityConstraints_s_vpB;
    private static SolveVelocityConstraints_s_P;
    SolveVelocityConstraints(data: b2SolverData): void;
    private static SolvePositionConstraints_s_P;
    SolvePositionConstraints(data: b2SolverData): boolean;
    private static Draw_s_pA;
    private static Draw_s_pB;
    private static Draw_s_axis;
    private static Draw_s_c1;
    private static Draw_s_c2;
    private static Draw_s_c3;
    private static Draw_s_c4;
    private static Draw_s_pRest;
    private static Draw_s_pMin;
    private static Draw_s_pMax;
    Draw(draw: b2Draw): void;
}
