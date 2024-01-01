import { IgePoly2d } from "@/engine/core/IgePoly2d";
import { IgeParticleEmitter } from "@/engine/core/IgeParticleEmitter";
import { GameEntity, EntityPublicGameData } from "./GameEntity";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export declare class Ship extends GameEntity {
    classId: string;
    thrustEmitter?: IgeParticleEmitter;
    triangles?: IgePoly2d[];
    constructor(publicGameData?: EntityPublicGameData);
    _definePhysics(): void;
    /**
     * Called every frame by the engine when this entity is mounted to the
     * scenegraph.
     * @param ctx The canvas context to render to.
     * @param tickDelta
     */
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
