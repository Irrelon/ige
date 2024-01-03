import { b2Vec2, XY } from "../common/b2_math.js"
import { b2Color, RGBA } from "../common/b2_draw.js"
import { b2ParticleGroup } from "./b2_particle_group.js"
/**
 * The particle type. Can be combined with the | operator.
 */
export declare enum b2ParticleFlag {
    b2_waterParticle = 0,
    b2_zombieParticle = 2,
    b2_wallParticle = 4,
    b2_springParticle = 8,
    b2_elasticParticle = 16,
    b2_viscousParticle = 32,
    b2_powderParticle = 64,
    b2_tensileParticle = 128,
    b2_colorMixingParticle = 256,
    b2_destructionListenerParticle = 512,
    b2_barrierParticle = 1024,
    b2_staticPressureParticle = 2048,
    b2_reactiveParticle = 4096,
    b2_repulsiveParticle = 8192,
    b2_fixtureContactListenerParticle = 16384,
    b2_particleContactListenerParticle = 32768,
    b2_fixtureContactFilterParticle = 65536,
    b2_particleContactFilterParticle = 131072
}
export interface b2IParticleDef {
    flags?: b2ParticleFlag;
    position?: XY;
    velocity?: XY;
    color?: RGBA;
    lifetime?: number;
    userData?: any;
    group?: b2ParticleGroup | null;
}
export declare class b2ParticleDef implements b2IParticleDef {
    flags: b2ParticleFlag;
    readonly position: b2Vec2;
    readonly velocity: b2Vec2;
    readonly color: b2Color;
    lifetime: number;
    userData: any;
    group: b2ParticleGroup | null;
}
export declare function b2CalculateParticleIterations(gravity: number, radius: number, timeStep: number): number;
export declare class b2ParticleHandle {
    m_index: number;
    GetIndex(): number;
    SetIndex(index: number): void;
}
