import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Transform } from "../common/b2_math.js"
import type { b2Shape } from "./b2_shape.js"
export declare enum b2ContactFeatureType {
    e_vertex = 0,
    e_face = 1
}
export declare class b2ContactFeature {
    private _key;
    private _key_invalid;
    private _indexA;
    private _indexB;
    private _typeA;
    private _typeB;
    get key(): number;
    set key(value: number);
    get indexA(): number;
    set indexA(value: number);
    get indexB(): number;
    set indexB(value: number);
    get typeA(): number;
    set typeA(value: number);
    get typeB(): number;
    set typeB(value: number);
}
export declare class b2ContactID {
    readonly cf: b2ContactFeature;
    Copy(o: b2ContactID): b2ContactID;
    Clone(): b2ContactID;
    get key(): number;
    set key(value: number);
}
export declare class b2ManifoldPoint {
    readonly localPoint: b2Vec2;
    normalImpulse: number;
    tangentImpulse: number;
    readonly id: b2ContactID;
    static MakeArray(length: number): b2ManifoldPoint[];
    Reset(): void;
    Copy(o: b2ManifoldPoint): b2ManifoldPoint;
}
export declare enum b2ManifoldType {
    e_unknown = -1,
    e_circles = 0,
    e_faceA = 1,
    e_faceB = 2
}
export declare class b2Manifold {
    readonly points: b2ManifoldPoint[];
    readonly localNormal: b2Vec2;
    readonly localPoint: b2Vec2;
    type: b2ManifoldType;
    pointCount: number;
    Reset(): void;
    Copy(o: b2Manifold): b2Manifold;
    Clone(): b2Manifold;
}
export declare class b2WorldManifold {
    readonly normal: b2Vec2;
    readonly points: b2Vec2[];
    readonly separations: number[];
    private static Initialize_s_pointA;
    private static Initialize_s_pointB;
    private static Initialize_s_cA;
    private static Initialize_s_cB;
    private static Initialize_s_planePoint;
    private static Initialize_s_clipPoint;
    Initialize(manifold: b2Manifold, xfA: b2Transform, radiusA: number, xfB: b2Transform, radiusB: number): void;
}
export declare enum b2PointState {
    b2_nullState = 0,///< point does not exist
    b2_addState = 1,///< point was added in the update
    b2_persistState = 2,///< point persisted across the update
    b2_removeState = 3
}
export declare function b2GetPointStates(state1: b2PointState[], state2: b2PointState[], manifold1: b2Manifold, manifold2: b2Manifold): void;
export declare class b2ClipVertex {
    readonly v: b2Vec2;
    readonly id: b2ContactID;
    static MakeArray(length: number): b2ClipVertex[];
    Copy(other: b2ClipVertex): b2ClipVertex;
}
export declare class b2RayCastInput {
    readonly p1: b2Vec2;
    readonly p2: b2Vec2;
    maxFraction: number;
    Copy(o: b2RayCastInput): b2RayCastInput;
}
export declare class b2RayCastOutput {
    readonly normal: b2Vec2;
    fraction: number;
    Copy(o: b2RayCastOutput): b2RayCastOutput;
}
export declare class b2AABB {
    readonly lowerBound: b2Vec2;
    readonly upperBound: b2Vec2;
    private readonly m_cache_center;
    private readonly m_cache_extent;
    Copy(o: b2AABB): b2AABB;
    IsValid(): boolean;
    GetCenter(): b2Vec2;
    GetExtents(): b2Vec2;
    GetPerimeter(): number;
    Combine1(aabb: b2AABB): b2AABB;
    Combine2(aabb1: b2AABB, aabb2: b2AABB): b2AABB;
    static Combine(aabb1: b2AABB, aabb2: b2AABB, out: b2AABB): b2AABB;
    Contains(aabb: b2AABB): boolean;
    RayCast(output: b2RayCastOutput, input: b2RayCastInput): boolean;
    TestContain(point: XY): boolean;
    TestOverlap(other: b2AABB): boolean;
}
export declare function b2TestOverlapAABB(a: b2AABB, b: b2AABB): boolean;
export declare function b2ClipSegmentToLine(vOut: [b2ClipVertex, b2ClipVertex], vIn: [b2ClipVertex, b2ClipVertex], normal: b2Vec2, offset: number, vertexIndexA: number): number;
export declare function b2TestOverlapShape(shapeA: b2Shape, indexA: number, shapeB: b2Shape, indexB: number, xfA: b2Transform, xfB: b2Transform): boolean;
