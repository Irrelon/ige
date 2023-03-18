import IgePoint2d from "./IgePoint2d";
import IgeRect from "./IgeRect";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
/**
 * Creates a new 2d polygon made up of IgePoint2d instances.
 */
declare class IgePoly2d {
    classId: string;
    _poly: IgePoint2d[];
    _scale: IgePoint2d;
    constructor();
    scale(x?: number, y?: number): IgePoint2d | this;
    /**
     * Multiplies the points of the polygon by the supplied factor.
     * @param {Number} factor The multiplication factor.
     * @return {*}
     */
    multiply(factor?: number): this;
    /**
     * Divides the points of the polygon by the supplied value.
     * @param {Number} value The divide value.
     * @return {*}
     */
    divide(value?: number): this;
    /**
     * Adds a point to the polygon relative to the polygon center at 0, 0.
     * @param x
     * @param y
     */
    addPoint(x: number, y: number): this;
    /**
     * Returns the length of the poly array.
     * @return {Number}
     */
    length(): number;
    /**
     * Check if a point is inside this polygon.
     * @param {IgePoint2d} point
     * @return {Boolean}
     */
    pointInPoly(point: IgePoint2d): boolean;
    /**
     * Check if the passed x and y are inside this polygon.
     * @param {Number} x
     * @param {Number} y
     * @return {Boolean}
     */
    xyInside(x: number, y: number): boolean;
    aabb(): IgeRect;
    /**
     * Returns a copy of this IgePoly2d object that is
     * its own version, separate from the original.
     * @return {IgePoly2d}
     */
    clone(): IgePoly2d;
    /**
     * Determines if the polygon is clockwise or not.
     * @return {Boolean} A boolean true if clockwise or false
     * if not.
     */
    clockWiseTriangle(): boolean;
    makeClockWiseTriangle(): void;
    triangulate(): IgePoly2d[];
    triangulationIndices(): number[];
    _area(): number;
    _snip(u: number, v: number, w: number, n: number, V: number[]): boolean;
    _insideTriangle(A: IgePoint2d, B: IgePoint2d, C: IgePoint2d, P: IgePoint2d): boolean;
    /**
     * Draws the polygon bounding lines to the passed context.
     * @param {CanvasRenderingContext2D} ctx
     * @param fill
     */
    render(ctx: IgeCanvasRenderingContext2d, fill?: boolean): this;
}
export default IgePoly2d;
