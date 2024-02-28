import type { XY } from "../common/b2_math.js"
import { b2Vec2, b2Transform } from "../common/b2_math.js"
import type { RGBA } from "../common/b2_draw.js"
import { b2Color } from "../common/b2_draw.js"
import type { b2Shape } from "../collision/b2_shape.js"
import type { b2ParticleFlag } from "./b2_particle.js"
import type { b2ParticleSystem } from "./b2_particle_system.js"
export declare enum b2ParticleGroupFlag {
    b2_none = 0,
    b2_solidParticleGroup = 1,
    b2_rigidParticleGroup = 2,
    b2_particleGroupCanBeEmpty = 4,
    b2_particleGroupWillBeDestroyed = 8,
    b2_particleGroupNeedsUpdateDepth = 16,
    b2_particleGroupInternalMask = 24
}
export interface b2IParticleGroupDef {
    flags?: b2ParticleFlag;
    groupFlags?: b2ParticleGroupFlag;
    position?: XY;
    angle?: number;
    linearVelocity?: XY;
    angularVelocity?: number;
    color?: RGBA;
    strength?: number;
    shape?: b2Shape;
    shapes?: b2Shape[];
    shapeCount?: number;
    stride?: number;
    particleCount?: number;
    positionData?: XY[];
    lifetime?: number;
    userData?: any;
    group?: b2ParticleGroup | null;
}
export declare class b2ParticleGroupDef implements b2IParticleGroupDef {
    flags: b2ParticleFlag;
    groupFlags: b2ParticleGroupFlag;
    readonly position: b2Vec2;
    angle: number;
    readonly linearVelocity: b2Vec2;
    angularVelocity: number;
    readonly color: b2Color;
    strength: number;
    shape?: b2Shape;
    shapes?: b2Shape[];
    shapeCount: number;
    stride: number;
    particleCount: number;
    positionData?: b2Vec2[];
    lifetime: number;
    userData: any;
    group: b2ParticleGroup | null;
}
export declare class b2ParticleGroup {
    readonly m_system: b2ParticleSystem;
    m_firstIndex: number;
    m_lastIndex: number;
    m_groupFlags: b2ParticleGroupFlag;
    m_strength: number;
    m_prev: b2ParticleGroup | null;
    m_next: b2ParticleGroup | null;
    m_timestamp: number;
    m_mass: number;
    m_inertia: number;
    readonly m_center: b2Vec2;
    readonly m_linearVelocity: b2Vec2;
    m_angularVelocity: number;
    readonly m_transform: b2Transform;
    m_userData: any;
    constructor(system: b2ParticleSystem);
    GetNext(): b2ParticleGroup | null;
    GetParticleSystem(): b2ParticleSystem;
    GetParticleCount(): number;
    GetBufferIndex(): number;
    ContainsParticle(index: number): boolean;
    GetAllParticleFlags(): b2ParticleFlag;
    GetGroupFlags(): b2ParticleGroupFlag;
    SetGroupFlags(flags: number): void;
    GetMass(): number;
    GetInertia(): number;
    GetCenter(): Readonly<b2Vec2>;
    GetLinearVelocity(): Readonly<b2Vec2>;
    GetAngularVelocity(): number;
    GetTransform(): Readonly<b2Transform>;
    GetPosition(): Readonly<b2Vec2>;
    GetAngle(): number;
    GetLinearVelocityFromWorldPoint<T extends XY>(worldPoint: XY, out: T): T;
    static readonly GetLinearVelocityFromWorldPoint_s_t0: b2Vec2;
    GetUserData(): void;
    SetUserData(data: any): void;
    ApplyForce(force: XY): void;
    ApplyLinearImpulse(impulse: XY): void;
    DestroyParticles(callDestructionListener: boolean): void;
    UpdateStatistics(): void;
}
