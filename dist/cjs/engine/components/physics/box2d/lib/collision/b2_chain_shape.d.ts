import { b2Vec2, b2Transform, XY } from "../common/b2_math.js"
import { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js"
import { b2DistanceProxy } from "./b2_distance.js"
import { b2MassData } from "./b2_shape.js"
import { b2Shape } from "./b2_shape.js"
import { b2EdgeShape } from "./b2_edge_shape.js"
export declare class b2ChainShape extends b2Shape {
    m_vertices: b2Vec2[];
    m_count: number;
    readonly m_prevVertex: b2Vec2;
    readonly m_nextVertex: b2Vec2;
    constructor();
    CreateLoop(vertices: XY[]): this;
    CreateLoop(vertices: number[]): this;
    private _CreateLoop;
    CreateChain(vertices: XY[], prevVertex: Readonly<XY>, nextVertex: Readonly<XY>): this;
    CreateChain(vertices: number[], prevVertex: Readonly<XY>, nextVertex: Readonly<XY>): this;
    private _CreateChain;
    Clone(): b2ChainShape;
    Copy(other: b2ChainShape): this;
    GetChildCount(): number;
    GetChildEdge(edge: b2EdgeShape, index: number): void;
    TestPoint(xf: b2Transform, p: XY): boolean;
    private static ComputeDistance_s_edgeShape;
    ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number;
    private static RayCast_s_edgeShape;
    RayCast(output: b2RayCastOutput, input: b2RayCastInput, xf: b2Transform, childIndex: number): boolean;
    private static ComputeAABB_s_v1;
    private static ComputeAABB_s_v2;
    private static ComputeAABB_s_lower;
    private static ComputeAABB_s_upper;
    ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void;
    ComputeMass(massData: b2MassData, density: number): void;
    SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void;
    ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number;
    Dump(log: (format: string, ...args: any[]) => void): void;
}
