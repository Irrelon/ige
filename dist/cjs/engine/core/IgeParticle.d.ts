import { IgeEntity } from "./IgeEntity.js"
import type { IgeParticleEmitter } from "./IgeParticleEmitter.js"
export declare class IgeParticle extends IgeEntity {
    classId: string;
    _emitter: IgeParticleEmitter;
    constructor(emitter: IgeParticleEmitter);
    destroy(): this;
}
