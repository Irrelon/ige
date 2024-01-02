import { IgeParticle } from "@/engine/core/IgeParticle";
import { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";

export declare class ThrustParticle extends IgeParticle {
	classId: string;
	constructor(emitter: IgeParticleEmitter);
	destroy(): this;
}
