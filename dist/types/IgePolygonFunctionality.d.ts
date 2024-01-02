import type { IgePoint2d } from "../engine/core/IgePoint2d.js"
import type { IgePoint3d } from "../engine/core/IgePoint3d.js"
export interface IgePolygonFunctionality {
    pointInside(point: IgePoint2d | IgePoint3d): boolean;
    xyInside(x: number, y: number): boolean;
}
