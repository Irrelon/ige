import { IgePoint2d } from "./IgePoint2d";
import { IgeRect } from "./IgeRect";

/**
 * Creates a new 2d polygon made up of IgePoint2d instances.
 */
export class IgePoly2d {
	constructor () {
		this.classId = "IgePoly2d";
		this._poly = [];
		this._scale = new IgePoint2d(1, 1);
	}
	scale (x, y) {
		if (x !== undefined && y !== undefined) {
			this._scale.x = x;
			this._scale.y = y;
			return this;
		}
		return this._scale;
	}
	/**
	 * Multiplies the points of the polygon by the supplied factor.
	 * @param {number} factor The multiplication factor.
	 * @return {*}
	 */
	multiply (factor) {
		// TODO: Look at IgeRect and normalise this function name
		if (factor !== undefined) {
			const polyPoints = this._poly;
			const pointCount = polyPoints.length;
			for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x *= factor;
				polyPoints[pointIndex].y *= factor;
			}
		}
		return this;
	}
	/**
	 * Divides the points of the polygon by the supplied value.
	 * @param {number} value The divide value.
	 * @return {*}
	 */
	divide (value) {
		if (value !== undefined) {
			const polyPoints = this._poly;
			const pointCount = polyPoints.length;
			for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x /= value;
				polyPoints[pointIndex].y /= value;
			}
		}
		return this;
	}
	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0.
	 * @param {number} x
	 * @param {number} y
	 */
	addPoint (x, y) {
		this._poly.push(new IgePoint2d(x, y));
		return this;
	}
	/**
	 * Returns the length of the poly array.
	 * @return {number}
	 */
	length () {
		return this._poly.length;
	}
	/**
	 * Check if a point is inside this polygon.
	 * @deprecated Please use pointInside() instead.
	 */
	pointInPoly () {
		throw new Error("Deprecated, please use pointInside() instead.");
	}
	/**
	 * Check if a point is inside this polygon.
	 * @param {IgePoint2d | IgePoint3d} point
	 * @return {boolean}
	 */
	pointInside (point) {
		return this.xyInside(point.x, point.y);
	}
	/**
	 * Check if the passed x and y are inside this polygon.
	 * @param {number} x
	 * @param {number} y
	 * @return {boolean}
	 */
	xyInside (x, y) {
		const polyPoints = this._poly;
		const pointCount = polyPoints.length;
		let oldPointIndex = pointCount - 1;
		let c = false;
		for (let pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (
				polyPoints[pointIndex].y > y !== polyPoints[oldPointIndex].y > y &&
				x <
					((polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) * (y - polyPoints[pointIndex].y)) /
						(polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
						polyPoints[pointIndex].x
			) {
				c = !c;
			}
		}
		return c;
	}
	/**
	 * Calculates and returns the axis-aligned bounding-box for this polygon.
	 */
	aabb () {
		const xArr = [];
		const yArr = [];
		const arr = this._poly;
		const arrCount = arr.length;
		for (let arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			xArr.push(arr[arrIndex].x);
			yArr.push(arr[arrIndex].y);
		}
		// Get the extents of the newly transformed poly
		const minX = Math.min(...xArr);
		const minY = Math.min(...yArr);
		const maxX = Math.max(...xArr);
		const maxY = Math.max(...yArr);
		return new IgeRect(minX, minY, maxX - minX, maxY - minY);
	}
	/**
	 * Returns a copy of this IgePoly2d object that is its own version,
	 * separate from the original.
	 * @return {IgePoly2d}
	 */
	clone () {
		const newPoly = new IgePoly2d();
		const arr = this._poly;
		const arrCount = arr.length;
		for (let i = 0; i < arrCount; i++) {
			newPoly.addPoint(arr[i].x, arr[i].y);
		}
		newPoly.scale(this._scale.x, this._scale.y);
		return newPoly;
	}
	/**
	 * Determines if the polygon is clockwise or not.
	 * @return {boolean} A boolean true if clockwise or false if not.
	 */
	clockWiseTriangle () {
		// Loop the polygon points and determine if they are counter-clockwise
		const arr = this._poly;
		const p1 = arr[0];
		const p2 = arr[1];
		const p3 = arr[2];
		const val = p1.x * p2.y + p2.x * p3.y + p3.x * p1.y - p2.y * p3.x - p3.y * p1.x - p1.y * p2.x;
		return val > 0;
	}
	/**
	 * Modifies the points of this triangle so that the points are clock-wise.
	 */
	makeClockWiseTriangle () {
		// If our data is already clockwise exit
		if (!this.clockWiseTriangle()) {
			const p1 = this._poly[1];
			const p2 = this._poly[2];
			this._poly[2] = p1;
			this._poly[1] = p2;
		}
	}
	/**
	 * Converts this polygon into many triangles so that there are no convex
	 * parts to the polygon.
	 */
	triangulate () {
		// Get the indices of each new triangle
		const poly = this._poly;
		const triangles = [];
		const indices = this.triangulationIndices();
		// Generate new polygons from the index data
		for (let i = 0; i < indices.length; i += 3) {
			const point1 = poly[indices[i]];
			const point2 = poly[indices[i + 1]];
			const point3 = poly[indices[i + 2]];
			const newPoly = new IgePoly2d();
			newPoly.addPoint(point1.x, point1.y);
			newPoly.addPoint(point2.x, point2.y);
			newPoly.addPoint(point3.x, point3.y);
			// Check the new poly and make sure it's clockwise
			newPoly.makeClockWiseTriangle();
			triangles.push(newPoly);
		}
		return triangles;
	}
	triangulationIndices () {
		const indices = [];
		const n = this._poly.length;
		const V = [];
		if (n < 3) {
			return indices;
		}
		if (this._area() > 0) {
			for (let v = 0; v < n; v++) {
				V[v] = v;
			}
		} else {
			for (let v = 0; v < n; v++) {
				V[v] = n - 1 - v;
			}
		}
		let nv = n;
		let count = 2 * nv;
		for (let v = nv - 1; nv > 2; ) {
			if (count-- <= 0) {
				return indices;
			}
			let u = v;
			if (nv <= u) {
				u = 0;
			}
			v = u + 1;
			if (nv <= v) {
				v = 0;
			}
			let w = v + 1;
			if (nv <= w) {
				w = 0;
			}
			if (this._snip(u, v, w, nv, V)) {
				const a = V[u];
				const b = V[v];
				const c = V[w];
				indices.push(a);
				indices.push(b);
				indices.push(c);
				let s = v;
				for (let t = v + 1; t < nv; t++) {
					V[s] = V[t];
					s++;
				}
				nv--;
				count = 2 * nv;
			}
		}
		indices.reverse();
		return indices;
	}
	_area () {
		const n = this._poly.length;
		let a = 0.0;
		let q = 0;
		for (let p = n - 1; q < n; p = q++) {
			const pval = this._poly[p];
			const qval = this._poly[q];
			a += pval.x * qval.y - qval.x * pval.y;
		}
		return a * 0.5;
	}
	_snip (u, v, w, n, V) {
		const A = this._poly[V[u]];
		const B = this._poly[V[v]];
		const C = this._poly[V[w]];
		// Replaced Math.Epsilon with 0.00001
		if (0.00001 > (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x)) {
			return false;
		}
		for (let p = 0; p < n; p++) {
			// eslint-disable-next-line eqeqeq
			if (p == u || p == v || p == w) {
				continue;
			}
			const P = this._poly[V[p]];
			if (this._insideTriangle(A, B, C, P)) {
				return false;
			}
		}
		return true;
	}
	/**
	 * Determines if the point P is inside the triangle defined by points
	 * A, B and C.
	 * @param {IgePoint2d} A
	 * @param {IgePoint2d} B
	 * @param {IgePoint2d} C
	 * @param {IgePoint2d} P
	 */
	_insideTriangle (A, B, C, P) {
		const ax = C.x - B.x;
		const ay = C.y - B.y;
		const bx = A.x - C.x;
		const by = A.y - C.y;
		const cx = B.x - A.x;
		const cy = B.y - A.y;
		const apx = P.x - A.x;
		const apy = P.y - A.y;
		const bpx = P.x - B.x;
		const bpy = P.y - B.y;
		const cpx = P.x - C.x;
		const cpy = P.y - C.y;
		const aCROSSbp = ax * bpy - ay * bpx;
		const cCROSSap = cx * apy - cy * apx;
		const bCROSScp = bx * cpy - by * cpx;
		return aCROSSbp >= 0.0 && bCROSScp >= 0.0 && cCROSSap >= 0.0;
	}
	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param fill
	 */
	render (ctx, fill = false) {
		const polyPoints = this._poly;
		const pointCount = polyPoints.length;
		const scaleX = this._scale.x;
		const scaleY = this._scale.y;
		ctx.beginPath();
		ctx.moveTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		for (let i = 1; i < pointCount; i++) {
			ctx.lineTo(polyPoints[i].x * scaleX, polyPoints[i].y * scaleY);
		}
		ctx.lineTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
		if (fill) {
			ctx.fill();
		}
		ctx.stroke();
		return this;
	}
}
