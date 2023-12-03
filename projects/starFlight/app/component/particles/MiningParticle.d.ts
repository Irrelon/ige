import { IgeParticleEmitter } from "../../../../../engine/core/IgeParticleEmitter";
import { IgeParticle } from "../../../../../engine/core/IgeParticle";
export declare class MiningParticle extends IgeParticle {
    classId: string;
    constructor(emitter: IgeParticleEmitter);
    destroy(): this;
}
