import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Transform } from "../common/b2_math.js"
import type { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js"
import type { b2DistanceProxy } from "./b2_distance.js"
import type { b2MassData } from "./b2_shape.js"
import { b2Shape } from "./b2_shape.js"
export declare class b2EdgeShape extends b2Shape {
    readonly m_vertex1: b2Vec2;
    readonly m_vertex2: b2Vec2;
    readonly m_vertex0: b2Vec2;
    readonly m_vertex3: b2Vec2;
    m_oneSided: boolean;
    constructor();
    SetOneSided(v0: XY, v1: XY, v2: XY, v3: XY): this;
    SetTwoSided(v1: XY, v2: XY): this;
    Clone(): b2EdgeShape;
    Copy(other: b2EdgeShape): this;
    GetChildCount(): number;
    TestPoint(xf: b2Transform, p: XY): boolean;
    private static ComputeDistance_s_v1;
    private static ComputeDistance_s_v2;
    private static ComputeDistance_s_d;
    private static ComputeDistance_s_s;
    ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number;
    private static RayCast_s_p1;
    private static RayCast_s_p2;
    private static RayCast_s_d;
    private static RayCast_s_e;
    private static RayCast_s_q;
    private static RayCast_s_r;
    RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean;
    private static ComputeAABB_s_v1;
    private static ComputeAABB_s_v2;
    ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void;
    ComputeMass(massData: b2MassData, density: number): void;
    SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void;
    ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
