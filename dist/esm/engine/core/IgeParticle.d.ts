import { IgeEntity } from "./IgeEntity";
import type { IgeParticleEmitter } from "./IgeParticleEmitter";

export declare class IgeParticle extends IgeEntity {
	classId: string;
	_emitter: IgeParticleEmitter;
	constructor(emitter: IgeParticleEmitter);
	destroy(): this;
}
