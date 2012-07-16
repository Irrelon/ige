var IgePoly2d = IgeClass.extend({
	init: function () {
		this._poly = [];
		this._scale = new IgePoint(1, 1, 1);
	},

	scale: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._scale.x = x;
			this._scale.y = y;

			return this;
		}

		return this._scale;
	},

	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0. Point
	 * co-ordinates must be in the range of -1 to 1.
	 * @param x
	 * @param y
	 */
	addPoint: function (x, y) {
		this._poly.push(new IgePoint(x, y, 0));
		return this;
	},

	/**
	 * Check if a point is inside this polygon.
	 * @param {IgePoint} point
	 * @return {Boolean}
	 */
	pointInPoly: function (point) {
		var polyPoints = this._poly,
			pointCount = polyPoints.length,
			pointIndex,
			oldPointIndex = pointCount - 1,
			c = 0;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (((polyPoints[pointIndex].y > point.y) !== (polyPoints[oldPointIndex].y > point.y)) &&
				(point.x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(point.y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
				c = !c;
			}
		}

		return c;
	},

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {HTMLCanvasContext} ctx
	 */
	render: function (ctx) {
		var polyPoints = this._poly,
			pointCount = polyPoints.length,
			scaleX = this._scale.x,
			scaleY = this._scale.y;

		ctx.beginPath();
		ctx.moveTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		for (i = 1; i < pointCount; i++) {
			ctx.lineTo(polyPoints[i].x * scaleX, polyPoints[i].y * scaleY);
		}
		ctx.lineTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		ctx.stroke();

		return this;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgePoly2d; }