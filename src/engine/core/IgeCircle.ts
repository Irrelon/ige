import type { IgePoint2d } from "@/engine/core/IgePoint2d";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgePoly2d } from "@/engine/core/IgePoly2d";
import type { IgeRect } from "@/engine/core/IgeRect";
import {
	circleIntersectsCircle,
	circleIntersectsPolygon,
	circleIntersectsRect,
	pointIntersectsCircle
} from "@/engine/utils/intersections";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeShape } from "@/types/IgeShape";
import type { IgeShapeFunctionality } from "@/types/IgeShapeFunctionality";

/**
 * Creates a new circle (x, y, radius).
 */
export class IgeCircle implements IgeShapeFunctionality {
	classId = "IgeCircle";
	_igeShapeType = "circle";
	x: number = 0;
	y: number = 0;
	radius: number = 0;
	x2: number = 0;
	y2: number = 0;
	_scale: number = 1;

	constructor (x = 0, y = 0, radius = 20) {
		this.x = x;
		this.y = y;
		this.radius = radius;

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

	xyInside (x: number, y: number): boolean {
		return pointIntersectsCircle({ x, y }, this);
	}

	pointInside (point: IgePoint2d | IgePoint3d): boolean {
		return pointIntersectsCircle(point, this);
	}

	intersects (shape: IgeShape): boolean {
		switch (shape._igeShapeType) {
		// case "line":
		// 	return this._intersectsLine(shape as IgeLine);
		case "circle":
			return circleIntersectsCircle(this, shape as IgeCircle);
		case "rect":
			return circleIntersectsRect(this, shape as IgeRect);
		case "polygon":
			return circleIntersectsPolygon(this, shape as IgePoly2d);
		}

		return false;
	}

	/**
	 * Draws the circle to the passed context.
	 */
	render (ctx: IgeCanvasRenderingContext2d, fillStyle: string = "") {
		ctx.beginPath();
		ctx.moveTo(this.x * this._scale, this.y * this._scale);
		ctx.arc(this.x * this._scale, this.y * this._scale, this.radius * this._scale, 0, 2 * Math.PI);

		if (fillStyle) {
			ctx.fillStyle = fillStyle;
			ctx.fill();
		}

		ctx.stroke();
		return this;
	}
}
