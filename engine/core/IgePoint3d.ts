/**
 * Creates a new 3d point (x, y, z).
 */
import {IgeClass} from "./IgeClass";

export class IgePoint3d extends IgeClass {
	_classId = 'IgePoint3d';
	x: number;
	y: number;
	z: number;
	x2: number;
	y2: number;
	z2: number;
	_floor: boolean;

	constructor({ige, igeConfig}, x = 0, y = 0, z = 0, floor = false) {
		super({ige, igeConfig});

		this.x = x;
		this.y = y;
		this.z = z;

		this._floor = floor;

		if (this._floor) {
			this.x2 = Math.floor(x / 2);
			this.y2 = Math.floor(y / 2);
			this.z2 = Math.floor(z / 2);
		} else {
			this.x2 = x / 2;
			this.y2 = y / 2;
			this.z2 = z / 2;
		}

		return this;
	}

	/**
	 * Gets / sets the floor mode of this point. If set to true the point's
	 * data will be mathematically floored when they are assigned.
	 * @param val
	 * @return {*}
	 */
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
	 * @return {Boolean}
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
	 * @return {Object}
	 */
	toIso() {
		const sx = this.x - this.y;
		const sy = (-this.z) * 1.2247 + (this.x + this.y) * 0.5;

		return {x: sx, y: sy};
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
	 * @return {Object}
	 */
	to2d() {
		const sx = this.y + this.x / 2;
		const sy = this.y - this.x / 2;

		return {x: sx, y: sy};
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
	 * @param point
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
		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, this.x - point.x, this.y - point.y, this.z - point.z);
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
		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, this.x * x, this.y * y, this.z * z);
	}

	/**
	 * Multiplies this point's data by the point specified
	 * and returns a new IgePoint3d whose values are the result.
	 * @param {IgePoint3d} point
	 * @return {*}
	 */
	multiplyPoint(point) {
		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, this.x * point.x, this.y * point.y, this.z * point.z);
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
		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, this.x / x, this.y / y, this.z / z);
	}

	/**
	 * Divides this point's data by the point specified
	 * and returns a new IgePoint3d whose values are the result.
	 * @param {IgePoint3d} point
	 * @return {*}
	 */
	dividePoint(point) {
		let newX = this.x;
		let newY = this.y;
		let newZ = this.z;

		if (point.x) {
			newX = this.x / point.x;
		}
		if (point.y) {
			newY = this.y / point.y;
		}
		if (point.z) {
			newZ = this.z / point.z;
		}

		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, newX, newY, newZ);
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
		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, this.x, this.y, this.z);
	}

	/**
	 * Interpolates the x, y, z values of this point towards the endPoint's
	 * x, y, z values based on the passed time variables and returns a new
	 * IgePoint3d whose values are the result.
	 * @param endPoint
	 * @param startTime
	 * @param currentTime
	 * @param endTime
	 * @return {*}
	 */
	interpolate(endPoint, startTime, currentTime, endTime) {
		const totalX = endPoint.x - this.x;
		const totalY = endPoint.y - this.y;
		const totalZ = endPoint.z - this.z;
		const totalTime = endTime - startTime;
		const deltaTime = totalTime - (currentTime - startTime);
		const timeRatio = deltaTime / totalTime;

		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, endPoint.x - (totalX * timeRatio), endPoint.y - (totalY * timeRatio), endPoint.z - (totalZ * timeRatio));
	}

	/**
	 * Rotates the point by the given radians.
	 * @param {Number} radians Radians to rotate by.
	 * @return {IgePoint3d} A new point with the rotated x, y.
	 */
	rotate(radians) {
		const s = Math.sin(radians);
		const c = Math.cos(radians);
		const x = c * this.x - s * this.y;
		const y = s * this.x - c * this.y;

		return new IgePoint3d({ige: this._ige, igeConfig: this._igeConfig}, x, y, this.z);
	}

	/**
	 * Rotates the point by the given radians and updates this point
	 * to the new x, y values.
	 * @param {Number} radians Radians to rotate by.
	 * @return {IgePoint3d} This point.
	 */
	thisRotate(radians) {
		const s = Math.sin(radians);
		const c = Math.cos(radians);
		const x = this.x;
		const y = this.y;

		this.x = c * x - s * y;
		this.y = s * x - c * y;

		return this;
	}

	/**
	 * Returns a string representation of the point's x, y, z
	 * converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString(precision) {
		if (precision === undefined) {
			precision = 2;
		}

		return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.z.toFixed(precision);
	}
}