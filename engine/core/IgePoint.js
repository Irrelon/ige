// TODO: Document
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

IgePoint.prototype.floor = function (val) {
	if (val !== undefined) {
		this._floor = val;
		return this;
	}

	return this._floor;
};

IgePoint.prototype.compare = function (point) {
	return this.x === point.x && this.y === point.y && this.z === point.z;
};

/**
 * Converts the point's x, y, z to an isometric x, y 2d co-ordinate.
 * @return {Object}
 */
IgePoint.prototype.toIso = function () {
	var sx = this.x - this.y,
		sy = (-this.z) * 1.2247 + (this.x + this.y) * 0.5;

	return {x: sx, y: sy};
};

IgePoint.prototype.thisToIso = function () {
	var val = this.toIso();
	this.x = val.x;
	this.y = val.y;
	this.z = 0;

	return this;
};

IgePoint.prototype.to2d = function () {
	var sx = this.y + this.x / 2,
		sy = this.y - this.x / 2;

	return {x: sx, y: sy};
};

IgePoint.prototype.thisTo2d = function () {
	var val = this.to2d();
	this.x = val.x;
	this.y = val.y;
	this.z = 0;

	return this;
};

IgePoint.prototype.multiply = function (x, y, z) {
	return {x: this.x * x, y: this.y * y, z: this.z * z};
};

IgePoint.prototype.thisMultiply = function (x, y, z) {
	var val = this.multiply(x, y, z);
	this.x = val.x;
	this.y = val.y;
	this.z = val.z;

	return this;
};

IgePoint.prototype.clone = function () {
	return new IgePoint(this.x, this.y, this.z);
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoint; }