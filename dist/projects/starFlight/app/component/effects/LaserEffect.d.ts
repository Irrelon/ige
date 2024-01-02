import { IgeEntity } from "../../../../../engine/core/IgeEntity.js"
import type { IgeCanvasRenderingContext2d } from "../../../../../types/IgeCanvasRenderingContext2d.js"
export declare class LaserEffect extends IgeEntity {
    classId: string;
    _scanX: number;
    _scanY: number;
    _scanSpeedX: number;
    _scanSpeedY: number;
    _scanDirX: boolean;
    _scanDirY: boolean;
    _scanMaxX: number;
    _scanMaxY: number;
    _fromEntity?: IgeEntity;
    _toEntity?: IgeEntity;
    constructor(data?: Record<string, any>);
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
