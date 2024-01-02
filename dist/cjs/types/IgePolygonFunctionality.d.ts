import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";

export interface IgePolygonFunctionality {
	pointInside(point: IgePoint2d | IgePoint3d): boolean;
	xyInside(x: number, y: number): boolean;
}
