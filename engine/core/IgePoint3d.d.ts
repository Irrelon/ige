import { IgeTween, IgeTweenOptions, IgeTweenPropertyObject } from "./IgeTween";
/**
 * Creates a new 3d point (x, y, z).
 */
export declare class IgePoint3d {
    classId: string;
    x: number;
    y: number;
    z: number;
    x2: number;
    y2: number;
    z2: number;
    scale?: number;
    _floor: boolean;
    constructor(x?: number, y?: number, z?: number, floor?: boolean);
    /**
     * Gets / sets the floor mode of this point. If set to true the point's
     * data will be mathematically floored when they are assigned.
     * @param {boolean=} val True or false.
     * @return {*} Either `this` for chaining or current floor setting.
     */
    floor(val: boolean): this;
    floor(): boolean;
    /**
     * Compares this point's x, y, z data with the passed point and returns
     * true if they are the same and false if any is different.
     * @param {IgePoint3d} point The point to compare data with.
     * @return {boolean}
     */
    compare(point: IgePoint3d): boolean;
    /**
     * Copies the x, y, z data from the passed point and overwrites this
     * point's data with those values.
     * @param {IgePoint3d} point The point to copy values from.
     * @returns {*}
     */
    copy(point: IgePoint3d): this;
    /**
     * Converts the point's x, y, z to an isometric x, y 2d co-ordinate
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    toIso(): {
        x: number;
        y: number;
    };
    /**
     * Converts this point's x, y, z data into isometric co-ordinate space
     * and overwrites the previous x, y, z values with the result.
     * @return {*}
     */
    thisToIso(): this;
    /**
     * Converts this point's x, y, z data into 2d co-ordinate space
     * and returns an object whose x, y values are the result.
     * @return {Object}
     */
    to2d(): IgePoint3d;
    /**
     * Converts this point's x, y, z data into 2d co-ordinate space
     * and overwrites the previous x, y, z values with the result.
     * @return {*}
     */
    thisTo2d(): this;
    /**
     * Adds this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param point
     * @return {*}
     */
    addPoint(point: IgePoint3d): IgePoint3d;
    /**
     * Adds this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    thisAddPoint(point: IgePoint3d): this;
    /**
     * Minuses this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param point
     * @return {*}
     */
    minusPoint(point: IgePoint3d): IgePoint3d;
    /**
     * Minuses this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param point
     * @return {*}
     */
    thisMinusPoint(point: IgePoint3d): this;
    /**
     * Multiplies this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    multiply(x: number, y: number, z: number): IgePoint3d;
    /**
     * Multiplies this point's data by the point specified
     * and returns a new IgePoint3d whose values are the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    multiplyPoint(point: IgePoint3d): IgePoint3d;
    /**
     * Multiplies this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    thisMultiply(x: number, y: number, z: number): this;
    /**
     * Divides this point's data by the x, y, z, values specified
     * and returns a new IgePoint3d whose values are the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    divide(x: number, y: number, z: number): IgePoint3d;
    /**
     * Divides this point's data by the point specified
     * and returns a new IgePoint3d whose values are the result.
     * @param {IgePoint3d} point
     * @return {*}
     */
    dividePoint(point: IgePoint3d): IgePoint3d;
    /**
     * Divides this point's data by the x, y, z values specified and
     * overwrites the previous x, y, z values with the result.
     * @param x
     * @param y
     * @param z
     * @return {*}
     */
    thisDivide(x: number, y: number, z: number): this;
    /**
     * Returns a clone of this IgePoint3d's data as a new instance.
     * @return {*}
     */
    clone(): IgePoint3d;
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
    interpolate(endPoint: IgePoint3d, startTime: number, currentTime: number, endTime: number): IgePoint3d;
    /**
     * Rotates the point by the given radians.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint3d} A new point with the rotated x, y.
     */
    rotate(radians: number): IgePoint3d;
    /**
     * Rotates the point by the given radians and updates this point
     * to the new x, y values.
     * @param {number} radians Radians to rotate by.
     * @return {IgePoint3d} This point.
     */
    thisRotate(radians: number): this;
    /**
     * Returns a string representation of the point's x, y, z
     * converting floating point values into fixed using the
     * passed precision parameter. If no precision is specified
     * then the precision defaults to 2.
     * @param {number=} precision
     * @return {string}
     */
    toString(precision?: number): string;
    tween(props?: IgeTweenPropertyObject, durationMs?: number, options?: IgeTweenOptions): IgeTween;
}
