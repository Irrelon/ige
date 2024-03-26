import type { b2Transform, XY } from "../common/b2_math.js"
import { b2Vec2 } from "../common/b2_math.js"
import type { b2AABB, b2RayCastInput, b2RayCastOutput } from "./b2_collision.js"
import type { b2DistanceProxy } from "./b2_distance.js"
export declare class b2MassData {
    mass: number;
    readonly center: b2Vec2;
    I: number;
}
export declare enum b2ShapeType {
    e_unknown = -1,
    e_circleShape = 0,
    e_edgeShape = 1,
    e_polygonShape = 2,
    e_chainShape = 3,
    e_shapeTypeCount = 4
}
export declare abstract class b2Shape {
    readonly m_type: b2ShapeType;
    m_radius: number;
    constructor(type: b2ShapeType, radius: number);
    abstract Clone(): b2Shape;
    Copy(other: b2Shape): b2Shape;
    GetType(): b2ShapeType;
    abstract GetChildCount(): number;
    abstract TestPoint(xf: b2Transform, p: XY): boolean;
    abstract ComputeDistance(xf: b2Transform, p: b2Vec2, normal: b2Vec2, childIndex: number): number;
    abstract RayCast(output: b2RayCastOutput, input: b2RayCastInput, transform: b2Transform, childIndex: number): boolean;
    abstract ComputeAABB(aabb: b2AABB, xf: b2Transform, childIndex: number): void;
    abstract ComputeMass(massData: b2MassData, density: number): void;
    abstract SetupDistanceProxy(proxy: b2DistanceProxy, index: number): void;
    abstract ComputeSubmergedArea(normal: b2Vec2, offset: number, xf: b2Transform, c: b2Vec2): number;
    abstract Dump(log: (format: string, ...args: any[]) => void): void;
}
