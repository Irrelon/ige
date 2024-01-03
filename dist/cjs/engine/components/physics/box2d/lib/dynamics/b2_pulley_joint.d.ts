import { b2Vec2, b2Rot, XY } from "../common/b2_math.js"
import { b2Body } from "./b2_body.js"
import { b2Joint, b2JointDef, b2IJointDef } from "./b2_joint.js"
import { b2SolverData } from "./b2_time_step.js"
export declare const b2_minPulleyLength: number;
export interface b2IPulleyJointDef extends b2IJointDef {
    groundAnchorA?: XY;
    groundAnchorB?: XY;
    localAnchorA?: XY;
    localAnchorB?: XY;
    lengthA?: number;
    lengthB?: number;
    ratio?: number;
}
export declare class b2PulleyJointDef extends b2JointDef implements b2IPulleyJointDef {
    readonly groundAnchorA: b2Vec2;
    readonly groundAnchorB: b2Vec2;
    readonly localAnchorA: b2Vec2;
    readonly localAnchorB: b2Vec2;
    lengthA: number;
    lengthB: number;
    ratio: number;
    constructor();
    Initialize(bA: b2Body, bB: b2Body, groundA: XY, groundB: XY, anchorA: XY, anchorB: XY, r: number): void;
}
export declare class b2PulleyJoint extends b2Joint {
    readonly m_groundAnchorA: b2Vec2;
    readonly m_groundAnchorB: b2Vec2;
    m_lengthA: number;
    m_lengthB: number;
    readonly m_localAnchorA: b2Vec2;
    readonly m_localAnchorB: b2Vec2;
    m_constant: number;
    m_ratio: number;
    m_impulse: number;
    m_indexA: number;
    m_indexB: number;
    readonly m_uA: b2Vec2;
    readonly m_uB: b2Vec2;
    readonly m_rA: b2Vec2;
    readonly m_rB: b2Vec2;
    readonly m_localCenterA: b2Vec2;
    readonly m_localCenterB: b2Vec2;
    m_invMassA: number;
    m_invMassB: number;
    m_invIA: number;
    m_invIB: number;
    m_mass: number;
    readonly m_qA: b2Rot;
    readonly m_qB: b2Rot;
    readonly m_lalcA: b2Vec2;
    readonly m_lalcB: b2Vec2;
    constructor(def: b2IPulleyJointDef);
    private static InitVelocityConstraints_s_PA;
    private static InitVelocityConstraints_s_PB;
    InitVelocityConstraints(data: b2SolverData): void;
    private static SolveVelocityConstraints_s_vpA;
    private static SolveVelocityConstraints_s_vpB;
    private static SolveVelocityConstraints_s_PA;
    private static SolveVelocityConstraints_s_PB;
    SolveVelocityConstraints(data: b2SolverData): void;
    private static SolvePositionConstraints_s_PA;
    private static SolvePositionConstraints_s_PB;
    SolvePositionConstraints(data: b2SolverData): boolean;
    GetAnchorA<T extends XY>(out: T): T;
    GetAnchorB<T extends XY>(out: T): T;
    GetReactionForce<T extends XY>(inv_dt: number, out: T): T;
    GetReactionTorque(inv_dt: number): number;
    GetGroundAnchorA(): b2Vec2;
    GetGroundAnchorB(): b2Vec2;
    GetLengthA(): number;
    GetLengthB(): number;
    GetRatio(): number;
    private static GetCurrentLengthA_s_p;
    GetCurrentLengthA(): number;
    private static GetCurrentLengthB_s_p;
    GetCurrentLengthB(): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
    ShiftOrigin(newOrigin: XY): void;
}
