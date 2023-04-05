import { IgePoint3d } from "./IgePoint3d";
/**
 * Creates a new 2d point (x, y).
 */
export declare class IgePoint2d {
    classId: string;
    x: number;
    y: number;
    x2: number;
    y2: number;
    _floor: boolean;
    constructor(x?: number, y?: number, floor?: boolean);
    /**
     * Gets / sets the floor mode of this point. If set to true the point's
     * data will be mathematically floored when they are assigned.
     * @param {Boolean=} val True or false.
     * @return {*} Either `this` for chaining or current floor setting.
     */
    floor(val: boolean): this;
    floor(): boolean;
    /**
     * Compares this point's x, y data with the passed point and returns
     * true if they are the same and false if any is different.
     * @param {IgePoint2d} point The point to compare data with.
     * @return {Boolean}
     */
    compare(point: IgePoint2d): boolean;
    /**
     * Copies the x, y data from the passed point and overwrites this
     * point's data with those values.
     * @param {IgePoint2d} point The point to copy values from.
     * @returns {*}
     */
    copy(point: IgePoint2d): this;
    /**
     * Converts the point's x, y to an isometric x, y 2d co-ordinate
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    toIso(): {
        x: number;
        y: number;
    };
    /**
     * Converts this point's x, y data into isometric co-ordinate space
     * and overwrites the previous x, y values with the result.
     * @return {*}
     */
    thisToIso(): this;
    /**
     * Converts this point's x, y data into 2d co-ordinate space
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    to2d(): {
        x: number;
        y: number;
    };
    /**
     * Converts this point's x, y data into 2d co-ordinate space
     * and overwrites the previous x, y values with the result.
     * @return {*}
     */
    thisTo2d(): this;
    /**
     * Adds this point's data by the x, y, values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    addPoint(point: IgePoint2d): IgePoint2d;
    /**
     * Adds this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param point
     * @return {*}
     */
    thisAddPoint(point: IgePoint2d): this;
    /**
     * Minuses this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    minusPoint(point: IgePoint2d): IgePoint2d;
    /**
     * Minuses this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param point
     * @return {*}
     */
    thisMinusPoint(point: IgePoint2d): this;
    /**
     * Multiplies this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param x
     * @param y
     * @return {*}
     */
    multiply(x: number, y: number): IgePoint2d;
    /**
     * Multiplies this point's data by the point specified
     * and returns a new IgePoint2d whose values are the result.
     * @param point
     * @return {*}
     */
    multiplyPoint(point: IgePoint2d | IgePoint3d): IgePoint2d;
    /**
     * Multiplies this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    thisMultiply(x: number, y: number): this;
    /**
     * Divides this point's data by the x, y values specified
     * and returns a new IgePoint2d whose values are the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    divide(x: number, y: number): IgePoint2d;
    /**
     * Divides this point's data by the point specified
     * and returns a new IgePoint2d whose values are the result.
     * @param {IgePoint2d} point
     * @return {*}
     */
    dividePoint(point: IgePoint2d): IgePoint2d;
    /**
     * Divides this point's data by the x, y values specified and
     * overwrites the previous x, y values with the result.
     * @param {number} x
     * @param {number} y
     * @return {*}
     */
    thisDivide(x: number, y: number): this;
    /**
     * Returns a clone of this IgePoint2d's data as a new instance.
     * @return {*}
     */
    clone(): IgePoint2d;
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
    interpolate(endPoint: IgePoint2d, startTime: number, currentTime: number, endTime: number): IgePoint2d;
    /**
     * Rotates the point by the given radians.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint2d} A new point with the rotated x, y.
     */
    rotate(radians: number): IgePoint2d;
    /**
     * Rotates the point by the given radians and updates this point
     * to the new x, y values.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint2d} This point.
     */
    thisRotate(radians: number): this;
    /**
     * Returns a string representation of the point's x, y
     * converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number} [precision]
     * @return {String}
     */
    toString(precision?: number): string;
}
