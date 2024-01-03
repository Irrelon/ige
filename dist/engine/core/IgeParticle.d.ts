import { IgeEntity } from "../../export/exports.js"
import type { IgeParticleEmitter } from "../../export/exports.js"
export declare class IgeParticle extends IgeEntity {
    classId: string;
    _emitter: IgeParticleEmitter;
    constructor(emitter: IgeParticleEmitter);
    destroy(): this;
}
