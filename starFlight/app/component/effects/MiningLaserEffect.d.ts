import { LaserEffect } from "./LaserEffect";
import { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { IgeAudioEntity } from "@/engine/audio";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export declare class MiningLaserEffect extends LaserEffect {
    classId: string;
    audio?: IgeAudioEntity;
    particleEmitter?: IgeParticleEmitter;
    constructor(data?: Record<string, any>);
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    destroy(): this;
}
