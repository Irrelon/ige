import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export declare class Target extends IgeEntity {
    classId: string;
    _targetEntity?: IgeEntity;
    constructor();
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
