// TODO: Document
/**
 * Creates a new 3d point (x, y, z).
 */
var IgePoint = function (x, y, z, floor) {
	if (floor === undefined) {
		this._floor = true;
	} else {
		this.floor(floor);
	}

	// Set values to the passed parameters or
	// zero if they are undefined
	this.x = x = x !== undefined ? x : 0;
	this.y = y = y !== undefined ? y : 0;
	this.z = z = z !== undefined ? z : 0;

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
};

/**
 * Gets / sets the floor mode of this point. If set to true the point's
 * data will be mathematically floored when they are assigned.
 * @param val
 * @return {*}
 */
IgePoint.prototype.floor = function (val) {
	if (val !== undefined) {
		this._floor = val;
		return this;
	}

	return this._floor;
};

/**
 * Compares this point's x, y, z data with the passed point and returns
 * true if they are the same and false if any is different.
 * @param point
 * @return {Boolean}
 */
IgePoint.prototype.compare = function (point) {
	return this.x === point.x && this.y === point.y && this.z === point.z;
};

/**
 * Converts the point's x, y, z to an isometric x, y 2d co-ordinate
 * and returns an object whose x, y values are the result.
 * @return {Object}
 */
IgePoint.prototype.toIso = function () {
	var sx = this.x - this.y,
		sy = (-this.z) * 1.2247 + (this.x + this.y) * 0.5;

	return {x: sx, y: sy};
};

/**
 * Converts this point's x, y, z data into isometric co-ordinate space
 * and overwrites the previous x, y, z values with the result.
 * @return {*}
 */
IgePoint.prototype.thisToIso = function () {
	var val = this.toIso();
	this.x = val.x;
	this.y = val.y;
	this.z = 0;

	return this;
};

/**
 * Converts this point's x, y, z data into 2d co-ordinate space
 * and returns an object whose x, y values are the result.
 * @return {Object}
 */
IgePoint.prototype.to2d = function () {
	var sx = this.y + this.x / 2,
		sy = this.y - this.x / 2;

	return {x: sx, y: sy};
};

/**
 * Converts this point's x, y, z data into 2d co-ordinate space
 * and overwrites the previous x, y, z values with the result.
 * @return {*}
 */
IgePoint.prototype.thisTo2d = function () {
	var val = this.to2d();
	this.x = val.x;
	this.y = val.y;
	this.z = 0;

	return this;
};

/**
 * Adds this point's data by the x, y, z, values specified
 * and returns a new IgePoint whose values are the result.
 * @param point
 * @return {*}
 */
IgePoint.prototype.addPoint = function (point) {
	return new IgePoint(this.x + point.x, this.y + point.y, this.z + point.z);
};

/**
 * Adds this point's data by the x, y, z values specified and
 * overwrites the previous x, y, z values with the result.
 * @param point
 * @return {*}
 */
IgePoint.prototype.thisAddPoint = function (point) {
	this.x += point.x;
	this.y += point.y;
	this.z += point.z;

	return this;
};

/**
 * Multiplies this point's data by the x, y, z, values specified
 * and returns a new IgePoint whose values are the result.
 * @param x
 * @param y
 * @param z
 * @return {*}
 */
IgePoint.prototype.multiply = function (x, y, z) {
	return new IgePoint(this.x * x, this.y * y, this.z * z);
};

/**
 * Multiplies this point's data by the x, y, z values specified and
 * overwrites the previous x, y, z values with the result.
 * @param x
 * @param y
 * @param z
 * @return {*}
 */
IgePoint.prototype.thisMultiply = function (x, y, z) {
	this.x *= x;
	this.y *= y;
	this.z *= z;

	return this;
};

/**
 * Divides this point's data by the x, y, z, values specified
 * and returns a new IgePoint whose values are the result.
 * @param x
 * @param y
 * @param z
 * @return {*}
 */
IgePoint.prototype.divide = function (x, y, z) {
	return new IgePoint(this.x / x, this.y / y, this.z / z);
};

/**
 * Divides this point's data by the x, y, z values specified and
 * overwrites the previous x, y, z values with the result.
 * @param x
 * @param y
 * @param z
 * @return {*}
 */
IgePoint.prototype.thisDivide = function (x, y, z) {
	this.x /= x;
	this.y /= y;
	this.z /= z;

	return this;
};

/**
 * Returns a clone of this IgePoint's data as a new instance.
 * @return {*}
 */
IgePoint.prototype.clone = function () {
	return new IgePoint(this.x, this.y, this.z);
};

IgePoint.prototype.interpolate = function (endPoint, startTime, currentTime, endTime) {
	var totalX = endValue.x - this.x,
		totalY = endValue.y - this.y,
		totalZ = endValue.z - this.z,
		totalTime = endTime - startTime,
		deltaTime = totalTime - (currentTime - startTime),
		timeRatio = deltaTime / totalTime;

	return new IgePoint(totalX * timeRatio + this.x, totalY * timeRatio + this.y, totalZ * timeRatio + this.z);
};

/**
 * Returns a string representation of the point's x, y, z
 * converting floating point values into fixed using the
 * passed precision parameter. If no precision is specified
 * then the precision defaults to 2.
 * @param {Number=} precision
 * @return {String}
 */
IgePoint.prototype.toString = function (precision) {
	if (precision === undefined) { precision = 2; }
	return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.z.toFixed(precision);
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoint; }