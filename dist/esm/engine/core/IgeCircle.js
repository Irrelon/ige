import { circleIntersectsCircle, circleIntersectsPolygon, circleIntersectsRect, pointIntersectsCircle } from "../utils/intersections.js"
/**
 * Creates a new circle (x, y, radius).
 */
export class IgeCircle {
    classId = "IgeCircle";
    _igeShapeType = "circle";
    x = 0;
    y = 0;
    radius = 0;
    x2 = 0;
    y2 = 0;
    _scale = 1;
    constructor(x = 0, y = 0, radius = 20) {
        this.x = x;
        this.y = y;
        this.radius = radius;
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
    xyInside(x, y) {
        return pointIntersectsCircle({ x, y }, this);
    }
    pointInside(point) {
        return pointIntersectsCircle(point, this);
    }
    intersects(shape) {
        switch (shape._igeShapeType) {
            // case "line":
            // 	return this._intersectsLine(shape as IgeLine);
            case "circle":
                return circleIntersectsCircle(this, shape);
            case "rect":
                return circleIntersectsRect(this, shape);
            case "polygon":
                return circleIntersectsPolygon(this, shape);
        }
        return false;
    }
    /**
     * Draws the circle to the passed context.
     */
    render(ctx, fillStyle = "") {
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
