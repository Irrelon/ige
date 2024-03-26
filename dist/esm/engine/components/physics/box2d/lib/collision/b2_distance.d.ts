import { b2Vec2, b2Transform } from "../common/b2_math.js"
import type { b2Shape } from "./b2_shape.js"
export declare class b2DistanceProxy {
    readonly m_buffer: b2Vec2[];
    m_vertices: b2Vec2[];
    m_count: number;
    m_radius: number;
    Copy(other: Readonly<b2DistanceProxy>): this;
    Reset(): b2DistanceProxy;
    SetShape(shape: b2Shape, index: number): void;
    SetVerticesRadius(vertices: b2Vec2[], count: number, radius: number): void;
    GetSupport(d: b2Vec2): number;
    GetSupportVertex(d: b2Vec2): b2Vec2;
    GetVertexCount(): number;
    GetVertex(index: number): b2Vec2;
}
export declare class b2SimplexCache {
    metric: number;
    count: number;
    readonly indexA: [number, number, number];
    readonly indexB: [number, number, number];
    Reset(): b2SimplexCache;
}
export declare class b2DistanceInput {
    readonly proxyA: b2DistanceProxy;
    readonly proxyB: b2DistanceProxy;
    readonly transformA: b2Transform;
    readonly transformB: b2Transform;
    useRadii: boolean;
    Reset(): b2DistanceInput;
}
export declare class b2DistanceOutput {
    readonly pointA: b2Vec2;
    readonly pointB: b2Vec2;
    distance: number;
    iterations: number;
    Reset(): b2DistanceOutput;
}
export declare class b2ShapeCastInput {
    readonly proxyA: b2DistanceProxy;
    readonly proxyB: b2DistanceProxy;
    readonly transformA: b2Transform;
    readonly transformB: b2Transform;
    readonly translationB: b2Vec2;
}
export declare class b2ShapeCastOutput {
    readonly point: b2Vec2;
    readonly normal: b2Vec2;
    lambda: number;
    iterations: number;
}
export declare let b2_gjkCalls: number;
export declare let b2_gjkIters: number;
export declare let b2_gjkMaxIters: number;
export declare function b2_gjk_reset(): void;
export declare class b2SimplexVertex {
    readonly wA: b2Vec2;
    readonly wB: b2Vec2;
    readonly w: b2Vec2;
    a: number;
    indexA: number;
    indexB: number;
    Copy(other: b2SimplexVertex): b2SimplexVertex;
}
export declare class b2Simplex {
    readonly m_v1: b2SimplexVertex;
    readonly m_v2: b2SimplexVertex;
    readonly m_v3: b2SimplexVertex;
    readonly m_vertices: b2SimplexVertex[];
    m_count: number;
    constructor();
    ReadCache(cache: b2SimplexCache, proxyA: b2DistanceProxy, transformA: b2Transform, proxyB: b2DistanceProxy, transformB: b2Transform): void;
    WriteCache(cache: b2SimplexCache): void;
    GetSearchDirection(out: b2Vec2): b2Vec2;
    GetClosestPoint(out: b2Vec2): b2Vec2;
    GetWitnessPoints(pA: b2Vec2, pB: b2Vec2): void;
    GetMetric(): number;
    Solve2(): void;
    Solve3(): void;
    private static s_e12;
    private static s_e13;
    private static s_e23;
}
export declare function b2Distance(output: b2DistanceOutput, cache: b2SimplexCache, input: b2DistanceInput): void;
export declare function b2ShapeCast(output: b2ShapeCastOutput, input: b2ShapeCastInput): boolean;
