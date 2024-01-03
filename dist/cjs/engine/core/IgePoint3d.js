"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgePoint3d = void 0;
let IgeTweenModule;
Promise.resolve().then(() => __importStar(require("./IgeTween.js"))).then((module) => {
    IgeTweenModule = module.IgeTween;
});
/**
 * Creates a new 3d point (x, y, z).
 */
class IgePoint3d {
    constructor(x = 0, y = 0, z = 0, floor = false) {
        this.classId = "IgePoint3d";
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.x2 = 0;
        this.y2 = 0;
        this.z2 = 0;
        this._floor = false;
        this.x = x;
        this.y = y;
        this.z = z;
        this._floor = floor;
        if (this._floor) {
            this.x2 = Math.floor(x / 2);
            this.y2 = Math.floor(y / 2);
            this.z2 = Math.floor(z / 2);
            return this;
        }
        this.x2 = x / 2;
        this.y2 = y / 2;
        this.z2 = z / 2;
    }
    floor(val) {
        if (val !== undefined) {
            this._floor = val;
            return this;
        }
        return this._floor;
    }
    /**
     * Compares this point's x, y, z data with the passed point and returns
     * true if they are the same and false if any is different.
     * @param {IgePoint3d} point The point to compare data with.
     * @return {boolean}
     */
    compare(point) {
        return point && this.x === point.x && this.y === point.y && this.z === point.z;
    }
    /**
     * Copies the x, y, z data from the passed point and overwrites this
     * point's data with those values.
     * @param {IgePoint3d} point The point to copy values from.
     * @returns {*}
     */
    copy(point) {
        this.x = point.x;
        this.y = point.y;
        this.z = point.z;
        return this;
    }
    /**
     * Converts the point's x, y, z to an isometric x, y 2d co-ordinate
     * and returns an object whose x, y values are the result.
     * @return IgePoint3d
     */
    toIso() {
        return new IgePoint3d(this.x - this.y, -this.z * 1.2247 + (this.x + this.y) * 0.5, 0);
    }
    /**
     * Converts this point's x, y, z data into isometric co-ordinate space
     * and overwrites the previous x, y, z values with the result.
     * @return {*}
     */
    thisToIso() {
        const val = this.toIso();
        this.x = val.x;
        this.y = val.y;
        return this;
    }
    /**
     * Converts this point's x, y, z data into 2d co-ordinate space
     * and returns an object whose x, y values are the result.
     * @return IgePoint3d
     */
    to2d() {
        return new IgePoint3d(this.y + this.x / 2, this.y - this.x / 2, 0);
    }
    /**
     * Converts this point's x, y, z data into 2d co-ordinate space
     * and overwrites the previous x, y, z values with the result.
     * @return {*}
     */
    thisTo2d() {
        const val = this.to2d();
        this.x = val.x;
        this.y = val.y;
        this.z = 0;
        return this;
    }
    /**
     * Adds this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param point
     * @return {*}
     */
    addPoint(point) {
        return new IgePoint3d(this.x + point.x, this.y + point.y, this.z + point.z);
    }
    /**
     * Adds this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    thisAddPoint(point) {
        this.x += point.x;
        this.y += point.y;
        this.z += point.z;
        return this;
    }
    /**
     * Minuses this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param point
     * @return {*}
     */
    minusPoint(point) {
        return new IgePoint3d(this.x - point.x, this.y - point.y, this.z - point.z);
    }
    /**
     * Minuses this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param point
     * @return {*}
     */
    thisMinusPoint(point) {
        this.x -= point.x;
        this.y -= point.y;
        this.z -= point.z;
        return this;
    }
    /**
     * Multiplies this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    multiply(x, y, z) {
        return new IgePoint3d(this.x * x, this.y * y, this.z * z);
    }
    /**
     * Multiplies this point's data by the point specified
     * and returns a new IgePoint3d whose values are the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    multiplyPoint(point) {
        return new IgePoint3d(this.x * point.x, this.y * point.y, this.z * point.z);
    }
    /**
     * Multiplies this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    thisMultiply(x, y, z) {
        this.x *= x;
        this.y *= y;
        this.z *= z;
        return this;
    }
    /**
     * Divides this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    divide(x, y, z) {
        return new IgePoint3d(this.x / x, this.y / y, this.z / z);
    }
    /**
     * Divides this point's data by the point specified
     * and returns a new IgePoint3d whose values are the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    dividePoint(point) {
        let newX = this.x, newY = this.y, newZ = this.z;
        if (point.x) {
            newX = this.x / point.x;
        }
        if (point.y) {
            newY = this.y / point.y;
        }
        if (point.z) {
            newZ = this.z / point.z;
        }
        return new IgePoint3d(newX, newY, newZ);
    }
    /**
     * Divides this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    thisDivide(x, y, z) {
        this.x /= x;
        this.y /= y;
        this.z /= z;
        return this;
    }
    /**
     * Returns a clone of this IgePoint3d's data as a new instance.
     * @return {*}
     */
    clone() {
        return new IgePoint3d(this.x, this.y, this.z);
    }
    /**
     * Interpolates the x, y, z values of this point towards the endPoint's
     * x, y, z values based on the passed time variables and returns a new
     * IgePoint3d whose values are the result.
     * @param {IgePoint2d} endPoint
     * @param {number} startTime
     * @param {number} currentTime
     * @param {number} endTime
     * @return {*}
     */
    interpolate(endPoint, startTime, currentTime, endTime) {
        const totalX = endPoint.x - this.x, totalY = endPoint.y - this.y, totalZ = endPoint.z - this.z, totalTime = endTime - startTime, deltaTime = totalTime - (currentTime - startTime), timeRatio = deltaTime / totalTime;
        return new IgePoint3d(endPoint.x - totalX * timeRatio, endPoint.y - totalY * timeRatio, endPoint.z - totalZ * timeRatio);
    }
    /**
     * Rotates the point by the given radians.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint3d} A new point with the rotated x, y.
     */
    rotate(radians) {
        const s = Math.sin(radians), c = Math.cos(radians), x = c * this.x - s * this.y, y = s * this.x - c * this.y;
        return new IgePoint3d(x, y, this.z);
    }
    /**
     * Rotates the point by the given radians and updates this point
     * to the new x, y values.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint3d} This point.
     */
    thisRotate(radians) {
        const s = Math.sin(radians), c = Math.cos(radians), { x, y } = this;
        this.x = c * x - s * y;
        this.y = s * x - c * y;
        return this;
    }
    /**
     * Returns a string representation of the point's x, y, z
     * converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number=} precision
     * @return {string}
     */
    toString(precision = 2) {
        return this.x.toFixed(precision) + "," + this.y.toFixed(precision) + "," + this.z.toFixed(precision);
    }
    tween(props, durationMs, options) {
        const newTween = new IgeTweenModule().targetObj(this).properties(props).duration(durationMs);
        if (options) {
            if (options.beforeTween) {
                newTween.beforeTween(options.beforeTween);
            }
            if (options.afterTween) {
                newTween.afterTween(options.afterTween);
            }
            if (options.easing) {
                newTween.easing(options.easing);
            }
            if (options.startTime) {
                newTween.startTime(options.startTime);
            }
        }
        return newTween;
    }
}
exports.IgePoint3d = IgePoint3d;
