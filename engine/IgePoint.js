var IgePoint = function (x, y, z) {
	// Set values to the passed parameters or
	// zero if they are undefined
	this.x = x !== undefined ? x : 0;
	this.y = y !== undefined ? y : 0;
	this.z = z !== undefined ? z : 0;
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoint; }