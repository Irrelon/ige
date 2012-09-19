/**
 * Creates a new rectangle (x, y, width, height).
 */
var IgeRect = function (x, y, width, height) {
	if (floor === undefined) {
		this._floor = true;
	} else {
		this.floor(floor);
	}

	// Set values to the passed parameters or
	// zero if they are undefined
	this.x = x = x !== undefined ? x : 0;
	this.y = y = y !== undefined ? y : 0;
	this.width = width = width !== undefined ? width : 0;
	this.height = height = height !== undefined ? height : 0;

	return this;
};

/**
 * Returns a string representation of the rect's x, y, width,
 * height, converting floating point values into fixed using the
 * passed precision parameter. If no precision is specified
 * then the precision defaults to 2.
 * @param {Number=} precision
 * @return {String}
 */
IgePoint.prototype.toString = function (precision) {
	if (precision === undefined) { precision = 2; }
	return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.width.toFixed(precision) + ',' + this.height.toFixed(precision);
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeRect; }