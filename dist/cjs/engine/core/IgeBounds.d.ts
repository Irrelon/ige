import type { IgePoint2d } from "./IgePoint2d.js"
import type { IgePoint3d } from "./IgePoint3d.js";
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgeShapeFunctionality } from "../../types/IgeShapeFunctionality.js"
/**
 * Creates a new bounds rectangle (x, y, width, height).
 * This differs from the IgeRect in that the x, y are the top-left
 * co-ordinates of the bounds rectangle, whereas the IgeRect assumes
 * that the x, y are the centre co-ordinates.
 */
export declare class IgeBounds implements IgeShapeFunctionality {
    classId: string;
    _igeShapeType: string;
    x: number;
    y: number;
    width: number;
    height: number;
    x2: number;
    y2: number;
    constructor(x?: number, y?: number, width?: number, height?: number);
    translateTo(x: number, y: number): this;
    translateBy(x: number, y: number): this;
    /**
     * Combines the extents of the passed IgeBounds with this rect
     * to create a new rect whose bounds encapsulate both rects.
     * @param {IgeBounds} rect The rect to combine with this one.
     * @return {IgeBounds} The new rect encapsulating both rects.
     */
    combineRect(rect: IgeBounds): IgeBounds;
    /**
     * Combines the extents of the passed IgeBounds with this rect
     * and replaces this rect with one whose bounds encapsulate
     * both rects.
     * @param {IgeBounds} rect The rect to combine with this one.
     */
    thisCombineRect(rect: IgeBounds): void;
    minusPoint(point: IgePoint2d | IgePoint3d): IgeBounds;
    /**
     * Compares this rects dimensions with the passed rect and returns
     * true if they are the same and false if any is different.
     * @param {IgeBounds} rect
     * @return {boolean}
     */
    compare(rect: IgeBounds): boolean;
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
     * Multiplies this rects data by the values specified
     * and returns a new IgeBounds whose values are the result.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return {*}
     */
    multiply(x1: number, y1: number, x2: number, y2: number): IgeBounds;
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
     * @return {IgeBounds}
     */
    clone(): IgeBounds;
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
     * Returns boolean indicating if the passed IgeBounds is
     * intersecting the rectangle.
     * @param {IgeShape} shape
     * @return {boolean}
     */
    intersects(shape: IgeShapeFunctionality): boolean;
    /**
     * Draws the polygon bounding lines to the passed context.
     */
    render(ctx: IgeCanvasRenderingContext2d, fillStyle?: string): this;
}
