import { IgeEntity } from "../../../../engine/core/IgeEntity.js"
import type { IgeCanvasRenderingContext2d } from "../../../../types/IgeCanvasRenderingContext2d.js"
export declare class Target extends IgeEntity {
    classId: string;
    _targetEntity?: IgeEntity;
    constructor();
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
