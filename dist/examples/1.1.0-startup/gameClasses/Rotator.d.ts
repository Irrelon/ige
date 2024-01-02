import { IgeEntity } from "../../../engine/core/IgeEntity.js"
import type { IgeCanvasRenderingContext2d } from "../../../types/IgeCanvasRenderingContext2d.js"
export declare class Rotator extends IgeEntity {
    classId: string;
    _rSpeed: number;
    constructor(speed: number);
    /**
     * Called every frame by the engine when this entity is mounted to the scenegraph.
     * @param ctx The canvas context to render to.
     */
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
