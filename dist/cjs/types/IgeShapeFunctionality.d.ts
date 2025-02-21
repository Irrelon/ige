import type { IgePoint2d } from "../engine/core/IgePoint2d.js"
import type { IgePoint3d } from "../engine/core/IgePoint3d.js"
import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d.js"
export interface IgeShapeFunctionality {
    _igeShapeType: string;
    pointInside(point: IgePoint2d | IgePoint3d): boolean;
    xyInside(x: number, y: number): boolean;
    intersects(shape: IgeShapeFunctionality): boolean;
    translateTo(x: number, y: number): this;
    translateBy(x: number, y: number): this;
    render(ctx: IgeCanvasRenderingContext2d, fillStyle?: string): this;
}
