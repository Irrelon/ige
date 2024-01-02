import { IgeParticle } from "../../../../../engine/core/IgeParticle.js"
import type { IgeParticleEmitter } from "../../../../../engine/core/IgeParticleEmitter.js"
export declare class MiningParticle extends IgeParticle {
    classId: string;
    constructor(emitter: IgeParticleEmitter);
    destroy(): this;
}
