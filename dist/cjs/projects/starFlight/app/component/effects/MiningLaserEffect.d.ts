import { LaserEffect } from "./LaserEffect";
import { IgeAudioEntity } from "@/engine/audio/index";
import { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export declare class MiningLaserEffect extends LaserEffect {
	classId: string;
	audio?: IgeAudioEntity;
	particleEmitter?: IgeParticleEmitter;
	constructor(data?: Record<string, any>);
	update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
	destroy(): this;
}
