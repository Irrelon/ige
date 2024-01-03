import { b2Transform, b2Sweep } from "../common/b2_math.js"
import { b2Manifold, b2WorldManifold } from "../collision/b2_collision.js"
import { b2Body } from "./b2_body.js"
import { b2Fixture } from "./b2_fixture.js"
import { b2Shape } from "../collision/b2_shape.js"
import { b2ContactListener } from "./b2_world_callbacks.js"
export declare function b2MixFriction(friction1: number, friction2: number): number;
export declare function b2MixRestitution(restitution1: number, restitution2: number): number;
export declare function b2MixRestitutionThreshold(threshold1: number, threshold2: number): number;
export declare class b2ContactEdge {
    private _other;
    get other(): b2Body;
    set other(value: b2Body);
    readonly contact: b2Contact;
    prev: b2ContactEdge | null;
    next: b2ContactEdge | null;
    constructor(contact: b2Contact);
    Reset(): void;
}
export declare abstract class b2Contact<A extends b2Shape = b2Shape, B extends b2Shape = b2Shape> {
    m_islandFlag: boolean;
    m_touchingFlag: boolean;
    m_enabledFlag: boolean;
    m_filterFlag: boolean;
    m_bulletHitFlag: boolean;
    m_toiFlag: boolean;
    m_prev: b2Contact | null;
    m_next: b2Contact | null;
    readonly m_nodeA: b2ContactEdge;
    readonly m_nodeB: b2ContactEdge;
    m_fixtureA: b2Fixture;
    m_fixtureB: b2Fixture;
    m_indexA: number;
    m_indexB: number;
    m_manifold: b2Manifold;
    m_toiCount: number;
    m_toi: number;
    m_friction: number;
    m_restitution: number;
    m_restitutionThreshold: number;
    m_tangentSpeed: number;
    m_oldManifold: b2Manifold;
    GetManifold(): b2Manifold;
    GetWorldManifold(worldManifold: b2WorldManifold): void;
    IsTouching(): boolean;
    SetEnabled(flag: boolean): void;
    IsEnabled(): boolean;
    GetNext(): b2Contact | null;
    GetFixtureA(): b2Fixture;
    GetChildIndexA(): number;
    GetShapeA(): A;
    GetFixtureB(): b2Fixture;
    GetChildIndexB(): number;
    GetShapeB(): B;
    abstract Evaluate(manifold: b2Manifold, xfA: b2Transform, xfB: b2Transform): void;
    FlagForFiltering(): void;
    SetFriction(friction: number): void;
    GetFriction(): number;
    ResetFriction(): void;
    SetRestitution(restitution: number): void;
    GetRestitution(): number;
    ResetRestitution(): void;
    SetRestitutionThreshold(threshold: number): void;
    GetRestitutionThreshold(): number;
    ResetRestitutionThreshold(): void;
    SetTangentSpeed(speed: number): void;
    GetTangentSpeed(): number;
    Reset(fixtureA: b2Fixture, indexA: number, fixtureB: b2Fixture, indexB: number): void;
    Update(listener: b2ContactListener): void;
    private static ComputeTOI_s_input;
    private static ComputeTOI_s_output;
    ComputeTOI(sweepA: b2Sweep, sweepB: b2Sweep): number;
}
