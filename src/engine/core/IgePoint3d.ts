import type { IgeTween, IgeTweenOptions, IgeTweenPropertyObject } from "@/export/exports";

let IgeTweenModule: typeof IgeTween;

import("./IgeTween.js").then((module) => {
	IgeTweenModule = module.IgeTween;
}).catch(() => {
	class IgeTweenFake {
		constructor () {
			throw new Error("Could not dynamically load IgeTween class!");
		}
	}

	IgeTweenModule = IgeTweenFake as unknown as typeof IgeTween;
});

/**
 * Creates a new 3d point (x, y, z).
 */
export class IgePoint3d {
	classId = "IgePoint3d";

	x = 0;
	y = 0;
	z = 0;
	x2 = 0;
	y2 = 0;
	z2 = 0;
	scale?: number;
	_floor = false;

	constructor (x = 0, y = 0, z = 0, floor = false) {
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

	/**
	 * Gets / sets the floor mode of this point. If set to true the point's
	 * data will be mathematically floored when they are assigned.
	 * @param {boolean=} val True or false.
	 * @return {*} Either `this` for chaining or current floor setting.
	 */
	floor (val: boolean): this;
	floor (): boolean;
	floor (val?: boolean) {
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
	compare (point: IgePoint3d): boolean {
		return point && this.x === point.x && this.y === point.y && this.z === point.z;
	}

	/**
	 * Copies the x, y, z data from the passed point and overwrites this
	 * point's data with those values.
	 * @param {IgePoint3d} point The point to copy values from.
	 * @returns {*}
	 */
	copy (point: IgePoint3d): this {
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
	toIso (): IgePoint3d {
		return new IgePoint3d(this.x - this.y, -this.z * 1.2247 + (this.x + this.y) * 0.5, 0);
	}

	/**
	 * Converts this point's x, y, z data into isometric co-ordinate space
	 * and overwrites the previous x, y, z values with the result.
	 * @return {*}
	 */
	thisToIso (): this {
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
	to2d (): IgePoint3d {
		return new IgePoint3d(this.y + this.x / 2, this.y - this.x / 2, 0);
	}

	/**
	 * Converts this point's x, y, z data into 2d co-ordinate space
	 * and overwrites the previous x, y, z values with the result.
	 * @return {*}
	 */
	thisTo2d (): IgePoint3d {
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
	addPoint (point: IgePoint3d): IgePoint3d {
		return new IgePoint3d(this.x + point.x, this.y + point.y, this.z + point.z);
	}

	/**
	 * Adds this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param {IgePoint3d} point
	 * @return {*}
	 */
	thisAddPoint (point: IgePoint3d): this {
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
	minusPoint (point: IgePoint3d): IgePoint3d {
		return new IgePoint3d(this.x - point.x, this.y - point.y, this.z - point.z);
	}

	/**
	 * Minuses this point's data by the x, y, z values specified and
	 * overwrites the previous x, y, z values with the result.
	 * @param point
	 * @return {*}
	 */
	thisMinusPoint (point: IgePoint3d): this {
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
	multiply (x: number, y: number, z: number): IgePoint3d {
		return new IgePoint3d(this.x * x, this.y * y, this.z * z);
	}

	/**
	 * Multiplies this point's data by the point specified
	 * and returns a new IgePoint3d whose values are the result.
	 * @param {IgePoint3d} point
	 * @return {*}
	 */
	multiplyPoint (point: IgePoint3d): IgePoint3d {
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
	thisMultiply (x: number, y: number, z: number): this {
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
	divide (x: number, y: number, z: number): IgePoint3d {
		return new IgePoint3d(this.x / x, this.y / y, this.z / z);
	}

	/**
	 * Divides this point's data by the point specified
	 * and returns a new IgePoint3d whose values are the result.
	 * @param {IgePoint3d} point
	 * @return {*}
	 */
	dividePoint (point: IgePoint3d): IgePoint3d {
		let newX = this.x,
			newY = this.y,
			newZ = this.z;

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
	thisDivide (x: number, y: number, z: number): this {
		this.x /= x;
		this.y /= y;
		this.z /= z;

		return this;
	}

	/**
	 * Returns a clone of this IgePoint3d's data as a new instance.
	 * @return {*}
	 */
	clone (): IgePoint3d {
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
	interpolate (endPoint: IgePoint3d, startTime: number, currentTime: number, endTime: number): IgePoint3d {
		const totalX = endPoint.x - this.x,
			totalY = endPoint.y - this.y,
			totalZ = endPoint.z - this.z,
			totalTime = endTime - startTime,
			deltaTime = totalTime - (currentTime - startTime),
			timeRatio = deltaTime / totalTime;

		return new IgePoint3d(
			endPoint.x - totalX * timeRatio,
			endPoint.y - totalY * timeRatio,
			endPoint.z - totalZ * timeRatio
		);
	}

	/**
	 * Rotates the point by the given radians.
	 * @param {number} radians Radians to rotate by.
	 * @return {IgePoint3d} A new point with the rotated x, y.
	 */
	rotate (radians: number): IgePoint3d {
		const s = Math.sin(radians),
			c = Math.cos(radians),
			x = c * this.x - s * this.y,
			y = s * this.x - c * this.y;

		return new IgePoint3d(x, y, this.z);
	}

	/**
	 * Rotates the point by the given radians and updates this point
	 * to the new x, y values.
	 * @param {number} radians Radians to rotate by.
	 * @return {IgePoint3d} This point.
	 */
	thisRotate (radians: number): this {
		const s = Math.sin(radians),
			c = Math.cos(radians),
			{ x, y } = this;

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
	toString (precision: number = 2) {
		return this.x.toFixed(precision) + "," + this.y.toFixed(precision) + "," + this.z.toFixed(precision);
	}

	tween (props?: IgeTweenPropertyObject, durationMs?: number, options?: IgeTweenOptions) {
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
