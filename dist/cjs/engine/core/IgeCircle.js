"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCircle = void 0;
const intersections_1 = require("../utils/intersections.js");
/**
 * Creates a new circle (x, y, radius).
 */
class IgeCircle {
    constructor(x = 0, y = 0, radius = 20) {
        this.classId = "IgeCircle";
        this._igeShapeType = "circle";
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.x2 = 0;
        this.y2 = 0;
        this._scale = 1;
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
        return (0, intersections_1.pointIntersectsCircle)({ x, y }, this);
    }
    pointInside(point) {
        return (0, intersections_1.pointIntersectsCircle)(point, this);
    }
    intersects(shape) {
        switch (shape._igeShapeType) {
            // case "line":
            // 	return this._intersectsLine(shape as IgeLine);
            case "circle":
                return (0, intersections_1.circleIntersectsCircle)(this, shape);
            case "rect":
                return (0, intersections_1.circleIntersectsRect)(this, shape);
            case "polygon":
                return (0, intersections_1.circleIntersectsPolygon)(this, shape);
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
exports.IgeCircle = IgeCircle;
