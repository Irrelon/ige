import { IgePoint2d } from "./IgePoint2d.js"
import { circleIntersectsRect, pointIntersectsRect, rectIntersectsPolygon, rectIntersectsRect } from "../utils/intersections.js";
/**
 * Creates a new rectangle (x, y, width, height).
 */
export class IgeRect {
    classId = "IgeRect";
    _igeShapeType = "rect";
    _origin = new IgePoint2d(0.5, 0.5);
    x = 0;
    y = 0;
    width = 0;
    height = 0;
    x2 = 0;
    y2 = 0;
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.x2 = this.x / 2;
        this.y2 = this.y / 2;
    }
    translateTo(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    translateBy(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }
    /**
     * Combines the extents of the passed IgeRect with this rect
     * to create a new rect whose bounds encapsulate both rects.
     * @param {IgeRect} rect The rect to combine with this one.
     * @return {IgeRect} The new rect encapsulating both rects.
     */
    combineRect(rect) {
        const thisRectMaxX = this.x + this.width, thisRectMaxY = this.y + this.height, thatRectMaxX = rect.x + rect.width, thatRectMaxY = rect.y + rect.height, x = Math.min(this.x, rect.x), y = Math.min(this.y, rect.y), width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x), height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
        return new IgeRect(x, y, width, height);
    }
    /**
     * Combines the extents of the passed IgeRect with this rect
     * and replaces this rect with one whose bounds encapsulate
     * both rects.
     * @param {IgeRect} rect The rect to combine with this one.
     */
    thisCombineRect(rect) {
        const thisRectMaxX = this.x + this.width, thisRectMaxY = this.y + this.height, thatRectMaxX = rect.x + rect.width, thatRectMaxY = rect.y + rect.height;
        this.x = Math.min(this.x, rect.x);
        this.y = Math.min(this.y, rect.y);
        this.width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
        this.height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
    }
    minusPoint(point) {
        return new IgeRect(this.x - point.x, this.y - point.y, this.width, this.height);
    }
    /**
     * Compares this rects dimensions with the passed rect and returns
     * true if they are the same and false if any is different.
     * @param {IgeRect} rect
     * @return {boolean}
     */
    compare(rect) {
        return (rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height);
    }
    /**
     * Returns boolean indicating if the passed x, y is
     * inside the rectangle.
     * @param x
     * @param y
     * @return {Boolean}
     */
    xyInside(x, y) {
        return pointIntersectsRect({ x, y }, this);
    }
    /**
     * Returns boolean indicating if the passed point is
     * inside the rectangle.
     * @param {IgePoint3d} point
     * @return {Boolean}
     */
    pointInside(point) {
        return pointIntersectsRect(point, this);
    }
    /**
     * Returns boolean indicating if the passed IgeRect is
     * intersecting the rectangle.
     * @deprecated Please use intersects() instead.
     */
    rectIntersect() {
        throw new Error("Deprecated, please use intersects() instead.");
    }
    /**
     * Multiplies this rects data by the values specified
     * and returns a new IgeRect whose values are the result.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return {*}
     */
    multiply(x1, y1, x2, y2) {
        return new IgeRect(this.x * x1, this.y * y1, this.width * x2, this.height * y2);
    }
    /**
     * Multiplies this rects data by the values specified and
     * overwrites the previous values with the result.
     * @param x1
     * @param y1
     * @param x2
     * @param y2
     * @return {*}
     */
    thisMultiply(x1, y1, x2, y2) {
        this.x *= x1;
        this.y *= y1;
        this.width *= x2;
        this.height *= y2;
        return this;
    }
    /**
     * Returns a clone of this object that is not a reference
     * but retains the same values.
     * @return {IgeRect}
     */
    clone() {
        return new IgeRect(this.x, this.y, this.width, this.height);
    }
    /**
     * Returns a string representation of the rects x, y, width,
     * height, converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number=} precision
     * @return {String}
     */
    toString(precision) {
        if (precision === undefined) {
            precision = 2;
        }
        return (this.x.toFixed(precision) +
            "," +
            this.y.toFixed(precision) +
            "," +
            this.width.toFixed(precision) +
            "," +
            this.height.toFixed(precision));
    }
    /**
     * Returns boolean indicating if the passed IgeRect is
     * intersecting the rectangle.
     * @param {IgeShape} shape
     * @return {boolean}
     */
    intersects(shape) {
        switch (shape._igeShapeType) {
            case "circle":
                return circleIntersectsRect(shape, this);
            case "rect":
                return rectIntersectsRect(this, shape);
            case "polygon":
                return rectIntersectsPolygon(this, shape);
        }
        return false;
    }
    /**
     * Draws the polygon bounding lines to the passed context.
     */
    render(ctx, fillStyle = "") {
        ctx.rect(this.x, this.y, this.width, this.height);
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        ctx.stroke();
        return this;
    }
}
