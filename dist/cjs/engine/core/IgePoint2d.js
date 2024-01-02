"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgePoint2d = void 0;
/**
 * Creates a new 2d point (x, y).
 */
class IgePoint2d {
    constructor(x = 0, y = 0, floor = false) {
        this.classId = "IgePoint2d";
        this.x = 0;
        this.y = 0;
        this.x2 = 0;
        this.y2 = 0;
        this._floor = false;
        this.x = x;
        this.y = y;
        this._floor = floor;
        if (this._floor) {
            this.x2 = Math.floor(x / 2);
            this.y2 = Math.floor(y / 2);
            return this;
        }
        this.x2 = x / 2;
        this.y2 = y / 2;
    }
    floor(val) {
        if (val !== undefined) {
            this._floor = val;
            return this;
        }
        return this._floor;
    }
    /**
     * Compares this point's x, y data with the passed point and returns
     * true if they are the same and false if any is different.
     * @param {IgePoint2d} point The point to compare data with.
     * @return {Boolean}
     */
    compare(point) {
        return point && this.x === point.x && this.y === point.y;
    }
    /**
     * Copies the x, y data from the passed point and overwrites this
     * point's data with those values.
     * @param {IgePoint2d} point The point to copy values from.
     * @returns {*}
     */
    copy(point) {
        this.x = point.x;
        this.y = point.y;
        return this;
    }
    /**
     * Converts the point's x, y to an isometric x, y 2d co-ordinate
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    toIso() {
        return {
            x: this.x - this.y,
            y: (this.x + this.y) * 0.5
        };
    }
    /**
     * Converts this point's x, y data into isometric co-ordinate space
     * and overwrites the previous x, y values with the result.
     * @return {*}
     */
    thisToIso() {
        const val = this.toIso();
        this.x = val.x;
        this.y = val.y;
        return this;
    }
    /**
     * Converts this point's x, y data into 2d co-ordinate space
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    to2d() {
        return {
            x: this.y + this.x / 2,
            y: this.y - this.x / 2
        };
    }
    /**
     * Converts this point's x, y data into 2d co-ordinate space
     * and overwrites the previous x, y values with the result.
     * @return {*}
     */
    thisTo2d() {
        const val = this.to2d();
        this.x = val.x;
        this.y = val.y;
        return this;
    }
    /**
     * Adds this point's data by the x, y, values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    addPoint(point) {
        return new IgePoint2d(this.x + point.x, this.y + point.y);
    }
    /**
     * Adds this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param point
     * @return {*}
     */
    thisAddPoint(point) {
        this.x += point.x;
        this.y += point.y;
        return this;
    }
    /**
     * Minuses this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    minusPoint(point) {
        return new IgePoint2d(this.x - point.x, this.y - point.y);
    }
    /**
     * Minuses this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param point
     * @return {*}
     */
    thisMinusPoint(point) {
        this.x -= point.x;
        this.y -= point.y;
        return this;
    }
    /**
     * Multiplies this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param x
     * @param y
     * @return {*}
     */
    multiply(x, y) {
        return new IgePoint2d(this.x * x, this.y * y);
    }
    /**
     * Multiplies this point's data by the point specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    multiplyPoint(point) {
        return new IgePoint2d(this.x * point.x, this.y * point.y);
    }
    /**
     * Multiplies this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    thisMultiply(x, y) {
        this.x *= x;
        this.y *= y;
        return this;
    }
    /**
     * Divides this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    divide(x, y) {
        return new IgePoint2d(this.x / x, this.y / y);
    }
    /**
     * Divides this point's data by the point specified
     * and returns a new IgePoint2d whose values are the result.
     * @param {IgePoint2d} point
     * @return {*}
     */
    dividePoint(point) {
        let newX = this.x, newY = this.y;
        if (point.x) {
            newX = this.x / point.x;
        }
        if (point.y) {
            newY = this.y / point.y;
        }
        return new IgePoint2d(newX, newY);
    }
    /**
     * Divides this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    thisDivide(x, y) {
        this.x /= x;
        this.y /= y;
        return this;
    }
    /**
     * Returns a clone of this IgePoint2d's data as a new instance.
     * @return {*}
     */
    clone() {
        return new IgePoint2d(this.x, this.y);
    }
    /**
     * Interpolates the x, y values of this point towards the endPoint's
     * x, y values based on the passed time variables and returns a new
     * IgePoint2d whose values are the result.
     * @param {IgePoint2d} endPoint
     * @param {number} startTime
     * @param {number} currentTime
     * @param {number} endTime
     * @return {*}
     */
    interpolate(endPoint, startTime, currentTime, endTime) {
        const totalX = endPoint.x - this.x, totalY = endPoint.y - this.y, totalTime = endTime - startTime, deltaTime = totalTime - (currentTime - startTime), timeRatio = deltaTime / totalTime;
        return new IgePoint2d(endPoint.x - totalX * timeRatio, endPoint.y - totalY * timeRatio);
    }
    /**
     * Rotates the point by the given radians.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint2d} A new point with the rotated x, y.
     */
    rotate(radians) {
        const s = Math.sin(radians), c = Math.cos(radians), x = c * this.x - s * this.y, y = s * this.x - c * this.y;
        return new IgePoint2d(x, y);
    }
    /**
     * Rotates the point by the given radians and updates this point
     * to the new x, y values.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint2d} This point.
     */
    thisRotate(radians) {
        const s = Math.sin(radians), c = Math.cos(radians), { x, y } = this;
        this.x = c * x - s * y;
        this.y = s * x - c * y;
        return this;
    }
    /**
     * Returns a string representation of the point's x, y
     * converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number} [precision]
     * @return {String}
     */
    toString(precision = 2) {
        return this.x.toFixed(precision) + "," + this.y.toFixed(precision);
    }
}
exports.IgePoint2d = IgePoint2d;
