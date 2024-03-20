import type { IgeCircle } from "@/engine/core/IgeCircle";
import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgePoly2d } from "@/engine/core/IgePoly2d";
import {
	circleIntersectsRect,
	pointIntersectsRect,
	rectIntersectsPolygon,
	rectIntersectsRect
} from "@/engine/utils/intersections";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeShapeFunctionality } from "@/types/IgeShapeFunctionality";

/**
 * Creates a new bounds rectangle (x, y, width, height).
 * This differs from the IgeRect in that the x, y are the top-left
 * co-ordinates of the bounds rectangle, whereas the IgeRect assumes
 * that the x, y are the centre co-ordinates.
 */
export class IgeBounds implements IgeShapeFunctionality {
	classId = "IgeBounds";
	_igeShapeType = "rect";
	x: number = 0;
	y: number = 0;
	width: number = 0;
	height: number = 0;
	x2: number = 0;
	y2: number = 0;

	constructor (x = 0, y = 0, width = 0, height = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;

		this.x2 = this.x / 2;
		this.y2 = this.y / 2;
	}

	translateTo (x: number, y: number) {
		this.x = x;
		this.y = y;

		return this;
	}

	translateBy (x: number, y: number) {
		this.x += x;
		this.y += y;

		return this;
	}

	/**
	 * Combines the extents of the passed IgeBounds with this rect
	 * to create a new rect whose bounds encapsulate both rects.
	 * @param {IgeBounds} rect The rect to combine with this one.
	 * @return {IgeBounds} The new rect encapsulating both rects.
	 */
	combineRect (rect: IgeBounds): IgeBounds {
		const thisRectMaxX = this.x + this.width,
			thisRectMaxY = this.y + this.height,
			thatRectMaxX = rect.x + rect.width,
			thatRectMaxY = rect.y + rect.height,
			x = Math.min(this.x, rect.x),
			y = Math.min(this.y, rect.y),
			width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x),
			height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);

		return new IgeBounds(x, y, width, height);
	}

	/**
	 * Combines the extents of the passed IgeBounds with this rect
	 * and replaces this rect with one whose bounds encapsulate
	 * both rects.
	 * @param {IgeBounds} rect The rect to combine with this one.
	 */
	thisCombineRect (rect: IgeBounds) {
		const thisRectMaxX = this.x + this.width,
			thisRectMaxY = this.y + this.height,
			thatRectMaxX = rect.x + rect.width,
			thatRectMaxY = rect.y + rect.height;

		this.x = Math.min(this.x, rect.x);
		this.y = Math.min(this.y, rect.y);

		this.width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
		this.height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
	}

	minusPoint (point: IgePoint2d | IgePoint3d): IgeBounds {
		return new IgeBounds(this.x - point.x, this.y - point.y, this.width, this.height);
	}

	/**
	 * Compares this rects dimensions with the passed rect and returns
	 * true if they are the same and false if any is different.
	 * @param {IgeBounds} rect
	 * @return {boolean}
	 */
	compare (rect: IgeBounds): boolean {
		return (
			rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height
		);
	}

	/**
	 * Returns boolean indicating if the passed x, y is
	 * inside the rectangle.
	 * @param x
	 * @param y
	 * @return {Boolean}
	 */
	xyInside (x: number, y: number): boolean {
		//return x >= this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
		return pointIntersectsRect({ x, y }, this);
	}

	/**
	 * Returns boolean indicating if the passed point is
	 * inside the rectangle.
	 * @param {IgePoint3d} point
	 * @return {Boolean}
	 */
	pointInside (point: IgePoint3d): boolean {
		return pointIntersectsRect(point, this);
	}

	/**
	 * Multiplies this rects data by the values specified
	 * and returns a new IgeBounds whose values are the result.
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @return {*}
	 */
	multiply (x1: number, y1: number, x2: number, y2: number): IgeBounds {
		return new IgeBounds(this.x * x1, this.y * y1, this.width * x2, this.height * y2);
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
	thisMultiply (x1: number, y1: number, x2: number, y2: number): this {
		this.x *= x1;
		this.y *= y1;
		this.width *= x2;
		this.height *= y2;

		return this;
	}

	/**
	 * Returns a clone of this object that is not a reference
	 * but retains the same values.
	 * @return {IgeBounds}
	 */
	clone (): IgeBounds {
		return new IgeBounds(this.x, this.y, this.width, this.height);
	}

	/**
	 * Returns a string representation of the rects x, y, width,
	 * height, converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {number=} precision
	 * @return {String}
	 */
	toString (precision?: number): string {
		if (precision === undefined) {
			precision = 2;
		}
		return (
			this.x.toFixed(precision) +
			"," +
			this.y.toFixed(precision) +
			"," +
			this.width.toFixed(precision) +
			"," +
			this.height.toFixed(precision)
		);
	}

	/**
	 * Returns boolean indicating if the passed IgeBounds is
	 * intersecting the rectangle.
	 * @param {IgeShape} shape
	 * @return {boolean}
	 */
	intersects (shape: IgeShapeFunctionality): boolean {
		switch (shape._igeShapeType) {
			case "circle":
				return circleIntersectsRect(shape as IgeCircle, this);
			case "rect":
				return rectIntersectsRect(this, shape as IgeBounds);
			case "polygon":
				return rectIntersectsPolygon(this, shape as IgePoly2d);
		}

		return false;
	}

	/**
	 * Draws the polygon bounding lines to the passed context.
	 */
	render (ctx: IgeCanvasRenderingContext2d, fillStyle: string = "") {
		ctx.rect(this.x, this.y, this.width, this.height);

		if (fillStyle) {
			ctx.fillStyle = fillStyle;
			ctx.fill();
		}

		ctx.stroke();
		return this;
	}
}
