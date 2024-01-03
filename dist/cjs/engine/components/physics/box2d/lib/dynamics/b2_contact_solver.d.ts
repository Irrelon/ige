import { b2Vec2, b2Mat22, b2Transform } from "../common/b2_math.js"
import { b2ManifoldType } from "../collision/b2_collision.js"
import { b2Contact } from "./b2_contact.js"
import { b2TimeStep, b2Position, b2Velocity } from "./b2_time_step.js"
export declare let g_blockSolve: boolean;
export declare function get_g_blockSolve(): boolean;
export declare function set_g_blockSolve(value: boolean): void;
export declare class b2VelocityConstraintPoint {
    readonly rA: b2Vec2;
    readonly rB: b2Vec2;
    normalImpulse: number;
    tangentImpulse: number;
    normalMass: number;
    tangentMass: number;
    velocityBias: number;
    static MakeArray(length: number): b2VelocityConstraintPoint[];
}
export declare class b2ContactVelocityConstraint {
    readonly points: b2VelocityConstraintPoint[];
    readonly normal: b2Vec2;
    readonly tangent: b2Vec2;
    readonly normalMass: b2Mat22;
    readonly K: b2Mat22;
    indexA: number;
    indexB: number;
    invMassA: number;
    invMassB: number;
    invIA: number;
    invIB: number;
    friction: number;
    restitution: number;
    threshold: number;
    tangentSpeed: number;
    pointCount: number;
    contactIndex: number;
    static MakeArray(length: number): b2ContactVelocityConstraint[];
}
export declare class b2ContactPositionConstraint {
    readonly localPoints: b2Vec2[];
    readonly localNormal: b2Vec2;
    readonly localPoint: b2Vec2;
    indexA: number;
    indexB: number;
    invMassA: number;
    invMassB: number;
    readonly localCenterA: b2Vec2;
    readonly localCenterB: b2Vec2;
    invIA: number;
    invIB: number;
    type: b2ManifoldType;
    radiusA: number;
    radiusB: number;
    pointCount: number;
    static MakeArray(length: number): b2ContactPositionConstraint[];
}
export declare class b2ContactSolverDef {
    readonly step: b2TimeStep;
    contacts: b2Contact[];
    count: number;
    positions: b2Position[];
    velocities: b2Velocity[];
}
export declare class b2PositionSolverManifold {
    readonly normal: b2Vec2;
    readonly point: b2Vec2;
    separation: number;
    private static Initialize_s_pointA;
    private static Initialize_s_pointB;
    private static Initialize_s_planePoint;
    private static Initialize_s_clipPoint;
    Initialize(pc: b2ContactPositionConstraint, xfA: b2Transform, xfB: b2Transform, index: number): void;
}
export declare class b2ContactSolver {
    readonly m_step: b2TimeStep;
    m_positions: b2Position[];
    m_velocities: b2Velocity[];
    readonly m_positionConstraints: b2ContactPositionConstraint[];
    readonly m_velocityConstraints: b2ContactVelocityConstraint[];
    m_contacts: b2Contact[];
    m_count: number;
    Initialize(def: b2ContactSolverDef): b2ContactSolver;
    private static InitializeVelocityConstraints_s_xfA;
    private static InitializeVelocityConstraints_s_xfB;
    private static InitializeVelocityConstraints_s_worldManifold;
    InitializeVelocityConstraints(): void;
    private static WarmStart_s_P;
    WarmStart(): void;
    private static SolveVelocityConstraints_s_dv;
    private static SolveVelocityConstraints_s_dv1;
    private static SolveVelocityConstraints_s_dv2;
    private static SolveVelocityConstraints_s_P;
    private static SolveVelocityConstraints_s_a;
    private static SolveVelocityConstraints_s_b;
    private static SolveVelocityConstraints_s_x;
    private static SolveVelocityConstraints_s_d;
    private static SolveVelocityConstraints_s_P1;
    private static SolveVelocityConstraints_s_P2;
    private static SolveVelocityConstraints_s_P1P2;
    SolveVelocityConstraints(): void;
    StoreImpulses(): void;
    private static SolvePositionConstraints_s_xfA;
    private static SolvePositionConstraints_s_xfB;
    private static SolvePositionConstraints_s_psm;
    private static SolvePositionConstraints_s_rA;
    private static SolvePositionConstraints_s_rB;
    private static SolvePositionConstraints_s_P;
    SolvePositionConstraints(): boolean;
    private static SolveTOIPositionConstraints_s_xfA;
    private static SolveTOIPositionConstraints_s_xfB;
    private static SolveTOIPositionConstraints_s_psm;
    private static SolveTOIPositionConstraints_s_rA;
    private static SolveTOIPositionConstraints_s_rB;
    private static SolveTOIPositionConstraints_s_P;
    SolveTOIPositionConstraints(toiIndexA: number, toiIndexB: number): boolean;
}
