import {IgeClass, IgeClassProps} from "./IgeClass";
import {IgePoint2d} from "./IgePoint2d";
import {IgeRect} from "./IgeRect";

/**
 * Creates a new 2d polygon made up of IgePoint2d instances.
 */
export class IgePoly2d extends IgeClass {
	_classId = 'IgePoly2d';
	_poly: IgePoint2d[];
	_scale: IgePoint2d;

	constructor(props: IgeClassProps) {
		super(props);
		this._poly = [];
		this._scale = new IgePoint2d(props, 1, 1);
	}

	scale(x?: number, y?: number) {
		if (x !== undefined && y !== undefined) {
			this._scale.x = x;
			this._scale.y = y;

			return this;
		}

		return this._scale;
	}

	/**
	 * Multiplies the points of the polygon by the supplied factor.
	 * @param {Number} factor The multiplication factor.
	 * @return {*}
	 */
	multiply(factor): IgePoly2d {
		if (factor !== undefined) {
			const polyPoints = this._poly;
			const pointCount = polyPoints.length;
			let pointIndex;

			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				polyPoints[pointIndex].x *= factor;
				polyPoints[pointIndex].y *= factor;
			}
		}

		return this;
	}

	/**
	 * Divides the points of the polygon by the supplied value.
	 * @param {Number} value The divide value.
	 * @return {*}
	 */
	divide(value?: number): IgePoly2d {
		if (value === undefined) return this;

		const polyPoints = this._poly;
		const pointCount = polyPoints.length;
		let pointIndex;

		for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
			polyPoints[pointIndex].x /= value;
			polyPoints[pointIndex].y /= value;
		}

		return this;
	}

	/**
	 * Adds a point to the polygon relative to the polygon center at 0, 0.
	 * @param x
	 * @param y
	 */
	addPoint(x: number, y: number): IgePoly2d {
		this._poly.push(new IgePoint2d({ige: this._ige, igeConfig: this._igeConfig}, x, y));
		return this;
	}

	/**
	 * Returns the length of the poly array.
	 * @return {Number}
	 */
	length(): number {
		return this._poly.length;
	}

	/**
	 * Check if a point is inside this polygon.
	 * @param {IgePoint2d} point
	 * @return {boolean}
	 */
	pointInPoly(point: IgePoint2d): boolean {
		const polyPoints = this._poly;
		const pointCount = polyPoints.length;
		let pointIndex;
		let oldPointIndex = pointCount - 1;
		let c = false;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (((polyPoints[pointIndex].y > point.y) !== (polyPoints[oldPointIndex].y > point.y)) &&
				(point.x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(point.y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
				c = !c;
			}
		}

		return c;
	}

	/**
	 * Check if the passed x and y are inside this polygon.
	 * @param {Number} x
	 * @param {Number} y
	 * @return {boolean}
	 */
	xyInside(x: number, y: number): boolean {
		const polyPoints = this._poly;
		const pointCount = polyPoints.length;
		let pointIndex;
		let oldPointIndex = pointCount - 1;
		let c = false;

		for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
			if (((polyPoints[pointIndex].y > y) !== (polyPoints[oldPointIndex].y > y)) &&
				(x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
				c = !c;
			}
		}

		return c;
	}

	aabb(): IgeRect {
		const xArr = [];
		const yArr = [];
		const arr = this._poly;
		const arrCount = arr.length;
		let arrIndex;

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			xArr.push(arr[arrIndex].x);
			yArr.push(arr[arrIndex].y);
		}

		// Get the extents of the newly transformed poly
		const minX = Math.min(...xArr);
		const minY = Math.min(...yArr);
		const maxX = Math.max(...xArr);
		const maxY = Math.max(...yArr);

		return new IgeRect({ige: this._ige, igeConfig: this._igeConfig}, minX, minY, maxX - minX, maxY - minY);
	}

	/**
	 * Returns a copy of this IgePoly2d object that is
	 * its own version, separate from the original.
	 * @return {IgePoly2d}
	 */
	clone(): IgePoly2d {
		const newPoly = new IgePoly2d({ige: this._ige, igeConfig: this._igeConfig});
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
	 * @return {Boolean} A boolean true if clockwise or false
	 * if not.
	 */
	clockWiseTriangle(): boolean {
		// Loop the polygon points and determine if they are counter-clockwise
		const arr = this._poly;

		const p1 = arr[0];
		const p2 = arr[1];
		const p3 = arr[2];

		const val = (p1.x * p2.y) + (p2.x * p3.y) + (p3.x * p1.y) - (p2.y * p3.x) - (p3.y * p1.x) - (p1.y * p2.x);

		return val > 0;
	}

	makeClockWiseTriangle() {
		// If our data is already clockwise exit
		if (!this.clockWiseTriangle()) {
			const p0 = this._poly[0],
				p1 = this._poly[1],
				p2 = this._poly[2];

			this._poly[2] = p1;
			this._poly[1] = p2;
		}
	}

	triangulate() {
		// Get the indices of each new triangle
		const poly = this._poly;
		const triangles = [];
		const indices = this.triangulationIndices();

		let i,
			point1,
			point2,
			point3,
			newPoly;

		// Generate new polygons from the index data
		for (i = 0; i < indices.length; i += 3) {
			point1 = poly[indices[i]];
			point2 = poly[indices[i + 1]];
			point3 = poly[indices[i + 2]];
			newPoly = new IgePoly2d({ige: this._ige, igeConfig: this._igeConfig});

			newPoly.addPoint(point1.x, point1.y);
			newPoly.addPoint(point2.x, point2.y);
			newPoly.addPoint(point3.x, point3.y);

			// Check the new poly and make sure it's clockwise
			newPoly.makeClockWiseTriangle();
			triangles.push(newPoly);
		}

		return triangles;
	}

	triangulationIndices() {
		const indices = [];
		const n = this._poly.length;
		const V = [];

		let v,
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

		if (n < 3) {
			return indices;
		}

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

		for (v = nv - 1; nv > 2;) {
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
	}

	_area() {
		const n = this._poly.length;

		let a = 0.0,
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
	}

	_snip(u, v, w, n, V) {
		const A = this._poly[V[u]];
		const B = this._poly[V[v]];
		const C = this._poly[V[w]];
		let p,
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
	}

	_insideTriangle(A, B, C, P) {
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

		return ((aCROSSbp >= 0.0) && (bCROSScp >= 0.0) && (cCROSSap >= 0.0));
	}

	/**
	 * Draws the polygon bounding lines to the passed context.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {boolean} fill
	 */
	render(ctx: CanvasRenderingContext2D, fill = false) {
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