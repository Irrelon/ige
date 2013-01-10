/**
 * Creates a new rectangle (x, y, width, height).
 */
var IgeRect = IgeClass.extend({
	classId: 'IgeRect',

	init: function (x, y, width, height) {
		// Set values to the passed parameters or
		// zero if they are undefined
		this.x = x = x !== undefined ? x : 0;
		this.y = y = y !== undefined ? y : 0;
		this.width = width = width !== undefined ? width : 0;
		this.height = height = height !== undefined ? height : 0;

		/*this.x2 = this.x / 2;
		this.y2 = this.y / 2;*/

		return this;
	},
	
	/**
	 * Combines the extents of the passed IgeRect with this rect
	 * to create a new rect whose bounds encapsulate both rects.
	 * @param {IgeRect} rect The rect to combine with this one.
	 * @return {IgeRect} The new rect encapsulating both rects.
	 */
	combineRect: function (rect) {
		var thisRectMaxX = this.x + this.width,
			thisRectMaxY = this.y + this.height,
			thatRectMaxX = rect.x + rect.width,
			thatRectMaxY = rect.y + rect.height,

			x = Math.min(this.x, rect.x),
			y = Math.min(this.y, rect.y),
			width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x),
			height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);

		return new IgeRect(x, y, width, height);
	},

	/**
	 * Combines the extents of the passed IgeRect with this rect
	 * and replaces this rect with one whose bounds encapsulate
	 * both rects.
	 * @param {IgeRect} rect The rect to combine with this one.
	 */
	thisCombineRect: function (rect) {
		var thisRectMaxX = this.x + this.width,
			thisRectMaxY = this.y + this.height,
			thatRectMaxX = rect.x + rect.width,
			thatRectMaxY = rect.y + rect.height;

		this.x = Math.min(this.x, rect.x);
		this.y = Math.min(this.y, rect.y);

		this.width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
		this.height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
	},
	
	minusPoint: function (point) {
		return new IgeRect(this.x - point.x, this.y - point.y, this.width, this.height);
	},

	/**
	 * Compares this rect's dimensions with the passed rect and returns
	 * true if they are the same and false if any is different.
	 * @param {IgeRect} rect
	 * @return {Boolean}
	 */
	compare: function (rect) {
		return rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
	},

	/**
	 * Returns boolean indicating if the passed x, y is
	 * inside the rectangle.
	 * @param x
	 * @param y
	 * @return {Boolean}
	 */
	xyInside: function (x, y) {
		return x >= this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed point is
	 * inside the rectangle.
	 * @param {IgePoint} point
	 * @return {Boolean}
	 */
	pointInside: function (point) {
		return x >= this.x && point.y > this.y && point.x <= this.x + this.width && point.y <= this.y + this.height;
	},

	/**
	 * Returns boolean indicating if the passed IgeRect is
	 * intersecting the rectangle.
	 * @param {IgeRect} rect
	 * @return {Boolean}
	 */
	rectIntersect: function (rect) {
		if (rect) {
			var sX1 = this.x,
				sY1 = this.y,
				sW = this.width,
				sH = this.height,

				dX1 = rect.x,
				dY1 = rect.y,
				dW = rect.width,
				dH = rect.height,

				sX2 = sX1 + sW,
				sY2 = sY1 + sH,
				dX2 = dX1 + dW,
				dY2 = dY1 + dH;

			if (sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1) {
				return true;
			}
		}

		return false;
	},

	/**
	 * Returns a clone of this object that is not a reference
	 * but retains the same values.
	 * @return {IgeRect}
	 */
	clone: function () {
		return new IgeRect(this.x, this.y, this.width, this.height);
	},

	/**
	 * Returns a string representation of the rect's x, y, width,
	 * height, converting floating point values into fixed using the
	 * passed precision parameter. If no precision is specified
	 * then the precision defaults to 2.
	 * @param {Number=} precision
	 * @return {String}
	 */
	toString: function (precision) {
		if (precision === undefined) { precision = 2; }
		return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.width.toFixed(precision) + ',' + this.height.toFixed(precision);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeRect; }