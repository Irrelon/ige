import type { IgePoint2d } from "./IgePoint2d.js"
import type { IgePoint3d } from "./IgePoint3d.js";
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgeShape } from "../../types/IgeShape.js"
import type { IgeShapeFunctionality } from "../../types/IgeShapeFunctionality.js"
/**
 * Creates a new circle (x, y, radius).
 */
export declare class IgeCircle implements IgeShapeFunctionality {
    classId: string;
    _igeShapeType: string;
    x: number;
    y: number;
    radius: number;
    x2: number;
    y2: number;
    _scale: number;
    constructor(x?: number, y?: number, radius?: number);
    translateTo(x: number, y: number): this;
    translateBy(x: number, y: number): this;
    xyInside(x: number, y: number): boolean;
    pointInside(point: IgePoint2d | IgePoint3d): boolean;
    intersects(shape: IgeShape): boolean;
    /**
     * Draws the circle to the passed context.
     */
    render(ctx: IgeCanvasRenderingContext2d, fillStyle?: string): this;
}
