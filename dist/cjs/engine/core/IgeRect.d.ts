import type { IgePoint2d } from "../../export/exports.js"
import type { IgePoint3d } from "../../export/exports.js"
import type { IgeCanvasRenderingContext2d } from "../../export/exports.js"
import type { IgePolygonFunctionality } from "../../export/exports.js"
/**
 * Creates a new rectangle (x, y, width, height).
 */
export declare class IgeRect implements IgePolygonFunctionality {
    classId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    x2: number;
    y2: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    /**
     * Combines the extents of the passed IgeRect with this rect
     * to create a new rect whose bounds encapsulate both rects.
     * @param {IgeRect} rect The rect to combine with this one.
     * @return {IgeRect} The new rect encapsulating both rects.
     */
    combineRect(rect: IgeRect): IgeRect;
    /**
     * Combines the extents of the passed IgeRect with this rect
     * and replaces this rect with one whose bounds encapsulate
     * both rects.
     * @param {IgeRect} rect The rect to combine with this one.
     */
    thisCombineRect(rect: IgeRect): void;
    minusPoint(point: IgePoint2d | IgePoint3d): IgeRect;
    /**
     * Compares this rects dimensions with the passed rect and returns
     * true if they are the same and false if any is different.
     * @param {IgeRect} rect
     * @return {Boolean}
     */
    compare(rect: IgeRect): boolean;
    /**
     * Returns boolean indicating if the passed x, y is
     * inside the rectangle.
     * @param x
     * @param y
     * @return {Boolean}
     */
    xyInside(x: number, y: number): boolean;
    /**
     * Returns boolean indicating if the passed point is
     * inside the rectangle.
     * @param {IgePoint3d} point
     * @return {Boolean}
     */
    pointInside(point: IgePoint3d): boolean;
    /**
     * Returns boolean indicating if the passed IgeRect is
     * intersecting the rectangle.
     * @deprecated Please use intersects() instead.
     */
    rectIntersect(): void;
    /**
     * Returns boolean indicating if the passed IgeRect is
     * intersecting the rectangle.
     * @param {IgeRect} rect
     * @return {Boolean}
     */
    intersects(rect: IgeRect): boolean;
    /**
     * Multiplies this rects data by the values specified
     * and returns a new IgeRect whose values are the result.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return {*}
     */
    multiply(x1: number, y1: number, x2: number, y2: number): IgeRect;
    /**
     * Multiplies this rects data by the values specified and
     * overwrites the previous values with the result.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return {*}
     */
    thisMultiply(x1: number, y1: number, x2: number, y2: number): this;
    /**
     * Returns a clone of this object that is not a reference
     * but retains the same values.
     * @return {IgeRect}
     */
    clone(): IgeRect;
    /**
     * Returns a string representation of the rects x, y, width,
     * height, converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number=} precision
     * @return {String}
     */
    toString(precision?: number): string;
    /**
     * Draws the polygon bounding lines to the passed context.
     * @param {CanvasRenderingContext2D} ctx
     * @param fill
     */
    render(ctx: IgeCanvasRenderingContext2d, fill?: boolean): this;
}
