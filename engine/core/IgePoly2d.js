/**
 * Creates a new 2d polygon made up of IgePoint instances.
 */
var IgePoly2d = IgeClass.extend({
	classId: 'IgePoly2d',

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
	 * Multiplies the points of the polygon by the supplied factor.
	 * @param {Number} factor The multiplication factor.
	 * @return {*}
	 */
	multiply: function (factor) {
		if (factor !== undefined) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x *= factor;
				polyPoints[pointIndex].y *= factor;
			}
		}

		return this;
	},

	/**
	 * Divides the points of the polygon by the supplied value.
	 * @param {Number} value The divide value.
	 * @return {*}
	 */
	divide: function (value) {
		if (value !== undefined) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x /= value;
				polyPoints[pointIndex].y /= value;
			}
		}

		return this;
	},

	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0.
	 * @param x
	 * @param y
	 */
	addPoint: function (x, y) {
		this._poly.push(new IgePoint(x, y, 0));
		return this;
	},

	/**
	 * Returns the length of the poly array.
	 * @return {Number}
	 */
	length: function () {
		return this._poly.length;
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
	 * Returns a copy of this IgePoly2d object that is
	 * it's own version, separate from the original.
	 * @return {IgePoly2d}
	 */
	clone: function () {
		var newPoly = new IgePoly2d(),
			arr = this._poly,
			arrCount = arr.length,
			i;

		for (i = 0; i < arrCount; i++) {
			newPoly.addPoint(arr[i].x, arr[i].y);
		}

		newPoly.scale(this._scale.x, this._scale.y);

		return newPoly;
	},

	/**
	 * Determines if the polygon is clockwise or not.
	 * @return {Boolean} A boolean true if clockwise or false
	 * if not.
	 */
	clockWiseTriangle: function () {
		// Loop the polygon points and determine if they are counter-clockwise
		var arr = this._poly,
			val,
			p1, p2, p3;

		p1 = arr[0];
		p2 = arr[1];
		p3 = arr[2];

		val = (p1.x * p2.y) + (p2.x * p3.y) + (p3.x * p1.y) - (p2.y * p3.x) - (p3.y * p1.x) - (p1.y * p2.x);

		return val > 0;
	},

	makeClockWiseTriangle: function () {
		// If our data is already clockwise exit
		if (!this.clockWiseTriangle()) {
			var p0 = this._poly[0],
				p1 = this._poly[1],
				p2 = this._poly[2];

			this._poly[2] = p1;
			this._poly[1] = p2;
		}
	},

	triangulate: function () {
		// Get the indices of each new triangle
		var poly = this._poly,
			triangles = [],
			indices = this.triangulationIndices(),
			i,
			point1,
			point2,
			point3,
			newPoly;

		// Generate new polygons from the index data
		for (i = 0; i < indices.length; i += 3) {
			point1 = poly[indices[i]];
			point2 = poly[indices[i + 1]];
			point3 = poly[indices[i + 2]];
			newPoly = new IgePoly2d();

			newPoly.addPoint(point1.x, point1.y);
			newPoly.addPoint(point2.x, point2.y);
			newPoly.addPoint(point3.x, point3.y);

			// Check the new poly and make sure it's clockwise
			newPoly.makeClockWiseTriangle();
			triangles.push(newPoly);
		}

		return triangles;
	},

	triangulationIndices: function () {
		var indices = [],
			n = this._poly.length,
			v = [],
			V = [],
			nv,
			count,
			m,
			u,
			w,
			a,
			b,
			c,
			s,
			t;
		
		if (n < 3) { return indices; }

		if (this._area() > 0) {
			for (v = 0; v < n; v++) {
				V[v] = v;
			}
		} else {
			for (v = 0; v < n; v++) {
				V[v] = (n - 1) - v;
			}
		}

		nv = n;
		count = 2 * nv;
		m = 0;

		for (v = nv - 1; nv > 2; ) {
			if ((count--) <= 0) {
				return indices;
			}

			u = v;
			if (nv <= u) {
				u = 0;
			}

			v = u + 1;

			if (nv <= v) {
				v = 0;
			}

			w = v + 1;

			if (nv <= w) {
				w = 0;
			}

			if (this._snip(u, v, w, nv, V)) {
				a = V[u];
				b = V[v];
				c = V[w];
				indices.push(a);
				indices.push(b);
				indices.push(c);
				m++;
				s = v;

				for (t = v + 1; t < nv; t++) {
					V[s] = V[t];
					s++;
				}

				nv--;
				count = 2 * nv;
			}
		}

		indices.reverse();
		return indices;
	},

	_area: function () {
		var n = this._poly.length,
			a = 0.0,
			q = 0,
			p,
			pval,
			qval;

		for (p = n - 1; q < n; p = q++) {
			pval = this._poly[p];
			qval = this._poly[q];
			a += pval.x * qval.y - qval.x * pval.y;
		}

		return (a * 0.5);
	},

	_snip: function (u, v, w, n, V) {
		var p,
			A = this._poly[V[u]],
			B = this._poly[V[v]],
			C = this._poly[V[w]],
			P;

		// Replaced Math.Epsilon with 0.00001
		if (0.00001 > (((B.x - A.x) * (C.y - A.y)) - ((B.y - A.y) * (C.x - A.x)))) {
			return false;
		}

		for (p = 0; p < n; p++) {
			if ((p == u) || (p == v) || (p == w)) {
				continue;
			}

			P = this._poly[V[p]];
			if (this._insideTriangle(A, B, C, P)) {
				return false;
			}
		}

		return true;
	},

	_insideTriangle: function (A, B, C, P) {
		var ax,
			ay,
			bx,
			by,
			cx,
			cy,
			apx,
			apy,
			bpx,
			bpy,
			cpx,
			cpy,
			cCROSSap,
			bCROSScp,
			aCROSSbp;

		ax = C.x - B.x; ay = C.y - B.y;
		bx = A.x - C.x; by = A.y - C.y;
		cx = B.x - A.x; cy = B.y - A.y;
		apx = P.x - A.x; apy = P.y - A.y;
		bpx = P.x - B.x; bpy = P.y - B.y;
		cpx = P.x - C.x; cpy = P.y - C.y;

		aCROSSbp = ax * bpy - ay * bpx;
		cCROSSap = cx * apy - cy * apx;
		bCROSScp = bx * cpy - by * cpx;

		return ((aCROSSbp >= 0.0) && (bCROSScp >= 0.0) && (cCROSSap >= 0.0));
	},

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 */
	render: function (ctx) {
		var polyPoints = this._poly,
			pointCount = polyPoints.length,
			scaleX = this._scale.x,
			scaleY = this._scale.y,
			i;

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