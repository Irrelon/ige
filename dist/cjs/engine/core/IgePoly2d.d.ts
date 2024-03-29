import { IgeBounds } from "./IgeBounds.js"
import { IgePoint2d } from "./IgePoint2d.js";
import type { IgePoint3d } from "./IgePoint3d.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js";
import type { IgeShapeFunctionality } from "../../types/IgeShapeFunctionality.js"
/**
 * Creates a new 2d polygon made up of IgePoint2d instances.
 */
export declare class IgePoly2d implements IgeShapeFunctionality {
    classId: string;
    x: number;
    y: number;
    _igeShapeType: string;
    _poly: IgePoint2d[];
    _scale: IgePoint2d;
    constructor();
    translateTo(x: number, y: number): this;
    translateBy(x: number, y: number): this;
    scale(x?: number, y?: number): IgePoint2d | this;
    /**
     * Multiplies the points of the polygon by the supplied factor.
     * @param {number} factor The multiplication factor.
     * @return {*}
     */
    multiply(factor?: number): this;
    /**
     * Divides the points of the polygon by the supplied value.
     * @param {number} value The divide value.
     * @return {*}
     */
    divide(value?: number): this;
    /**
     * Adds a point to the polygon relative to the polygon center at 0, 0.
     * @param {number} x
     * @param {number} y
     */
    addPoint(x: number, y: number): this;
    /**
     * Returns the length of the poly array.
     * @return {number}
     */
    length(): number;
    /**
     * Check if a point is inside this polygon.
     * @deprecated Please use pointInside() instead.
     */
    pointInPoly(): void;
    /**
     * Check if a point is inside this polygon.
     * @param {IgePoint2d | IgePoint3d} point
     * @return {boolean}
     */
    pointInside(point: IgePoint2d | IgePoint3d): boolean;
    /**
     * Check if the passed x and y are inside this polygon.
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    xyInside(x: number, y: number): boolean;
    /**
     * Calculates and returns the axis-aligned bounding-box for this polygon.
     */
    aabb(): IgeBounds;
    /**
     * Returns a copy of this IgePoly2d object that is its own version,
     * separate from the original.
     * @return {IgePoly2d}
     */
    clone(): IgePoly2d;
    /**
     * Determines if the polygon is clockwise or not.
     * @return {boolean} A boolean true if clockwise or false if not.
     */
    clockWiseTriangle(): boolean;
    /**
     * Modifies the points of this triangle so that the points are clock-wise.
     */
    makeClockWiseTriangle(): void;
    /**
     * Converts this polygon into many triangles so that there are no convex
     * parts to the polygon.
     */
    triangulate(): IgePoly2d[];
    triangulationIndices(): number[];
    _area(): number;
    _snip(u: number, v: number, w: number, n: number, V: number[]): boolean;
    /**
     * Determines if the point P is inside the triangle defined by points
     * A, B and C.
     * @param {IgePoint2d} A
     * @param {IgePoint2d} B
     * @param {IgePoint2d} C
     * @param {IgePoint2d} P
     */
    _insideTriangle(A: IgePoint2d, B: IgePoint2d, C: IgePoint2d, P: IgePoint2d): boolean;
    intersects(shape: IgeShapeFunctionality): boolean;
    /**
     * Draws the polygon bounding lines to the passed context.
     */
    render(ctx: IgeCanvasRenderingContext2d, fillStyle?: string): this;
}
