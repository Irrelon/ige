import { b2Vec2 } from "../common/b2_math.js"
import { b2Draw } from "../common/b2_draw.js"
export declare enum b2StretchingModel {
    b2_pbdStretchingModel = 0,
    b2_xpbdStretchingModel = 1
}
export declare enum b2BendingModel {
    b2_springAngleBendingModel = 0,
    b2_pbdAngleBendingModel = 1,
    b2_xpbdAngleBendingModel = 2,
    b2_pbdDistanceBendingModel = 3,
    b2_pbdHeightBendingModel = 4,
    b2_pbdTriangleBendingModel = 5
}
export declare class b2RopeTuning {
    stretchingModel: b2StretchingModel;
    bendingModel: b2BendingModel;
    damping: number;
    stretchStiffness: number;
    stretchHertz: number;
    stretchDamping: number;
    bendStiffness: number;
    bendHertz: number;
    bendDamping: number;
    isometric: boolean;
    fixedEffectiveMass: boolean;
    warmStart: boolean;
    Copy(other: Readonly<b2RopeTuning>): this;
}
export declare class b2RopeDef {
    readonly position: b2Vec2;
    readonly vertices: b2Vec2[];
    count: number;
    readonly masses: number[];
    readonly gravity: b2Vec2;
    readonly tuning: b2RopeTuning;
}
export declare class b2Rope {
    private readonly m_position;
    private m_count;
    private m_stretchCount;
    private m_bendCount;
    private readonly m_stretchConstraints;
    private readonly m_bendConstraints;
    private readonly m_bindPositions;
    private readonly m_ps;
    private readonly m_p0s;
    private readonly m_vs;
    private readonly m_invMasses;
    private readonly m_gravity;
    private readonly m_tuning;
    Create(def: b2RopeDef): void;
    SetTuning(tuning: b2RopeTuning): void;
    Step(dt: number, iterations: number, position: Readonly<b2Vec2>): void;
    Reset(position: Readonly<b2Vec2>): void;
    Draw(draw: b2Draw): void;
    private SolveStretch_PBD;
    private SolveStretch_XPBD;
    private SolveBend_PBD_Angle;
    private SolveBend_XPBD_Angle;
    private SolveBend_PBD_Distance;
    private SolveBend_PBD_Height;
    private SolveBend_PBD_Triangle;
    private ApplyBendForces;
}
