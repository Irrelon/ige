import { LaserEffect } from "./LaserEffect.js"
import { IgeAudioEntity } from "../../../../../engine/audio/index.js"
import { IgeParticleEmitter } from "../../../../../engine/core/IgeParticleEmitter.js"
import type { IgeCanvasRenderingContext2d } from "../../../../../types/IgeCanvasRenderingContext2d.js"
export declare class MiningLaserEffect extends LaserEffect {
    classId: string;
    audio?: IgeAudioEntity;
    particleEmitter?: IgeParticleEmitter;
    constructor(data?: Record<string, any>);
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    destroy(): this;
}
