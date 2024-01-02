import { IgeParticle } from "../../../../../engine/core/IgeParticle.js"
import type { IgeParticleEmitter } from "../../../../../engine/core/IgeParticleEmitter.js"
export declare class ThrustParticle extends IgeParticle {
    classId: string;
    constructor(emitter: IgeParticleEmitter);
    destroy(): this;
}
