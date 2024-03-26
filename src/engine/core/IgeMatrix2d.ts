import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { radiansToDegrees } from "@/engine/utils/maths";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgePoint } from "@/types/IgePoint";

/**
 * Creates a new transformation matrix.
 */
export class IgeMatrix2d extends IgeBaseClass {
	matrix = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

	_rotateOrigin = new IgePoint3d(0, 0, 0);
	_scaleOrigin = new IgePoint3d(0, 0, 0);

	transformCoord (point: IgePoint, obj: IgeObject) {
		const { x, y } = point;
		const tm = this.matrix;

		point.x = x * tm[0] + y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] + tm[5];

		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			obj.log("The matrix operation produced a NaN value!", "error");
			debugger;
		}
		/* DEXCLUDE */

		return point;
	}

	/**
	 * Transform a point by this matrix in inverse. The parameter point will be modified with the transformation values.
	 * @param {IgePoint3d} point.
	 * @param obj
	 * @return {IgePoint3d} The passed point.
	 */
	transformCoordInverse (point: IgePoint, obj: IgeEntity) {
		const { x, y } = point;
		const tm = this.matrix;

		point.x = x * tm[0] - y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] - tm[5];

		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			obj.log("The matrix operation produced a NaN value!", "error");
			debugger;
		}
		/* DEXCLUDE */

		return point;
	}

	transform (points: IgePoint[], obj: IgeObject) {
		const pointCount = points.length;

		for (let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
			this.transformCoord(points[pointIndex], obj);
		}

		return points;
	}

	/**
	 * Create a new rotation matrix and set it up for the specified angle in radians.
	 * @param {number} angle
	 * @return {IgeMatrix2d} A new matrix object.
	 */
	_newRotate (angle: number) {
		const m = new IgeMatrix2d();
		m.rotateTo(angle);

		return m;
	}

	rotateBy (angle: number) {
		const m = new IgeMatrix2d();

		m.translateBy(this._rotateOrigin.x, this._rotateOrigin.y);
		m.rotateTo(angle);
		m.translateBy(-this._rotateOrigin.x, -this._rotateOrigin.y);

		this.multiply(m);

		return this;
	}

	rotateTo (angle: number) {
		const tm = this.matrix;
		const c = Math.cos(angle);
		const s = Math.sin(angle);

		tm[0] = c;
		tm[1] = -s;
		tm[3] = s;
		tm[4] = c;

		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log("The matrix operation produced a NaN value!", "error");
			debugger;
		}
		/* DEXCLUDE */

		return this;
	}

	/**
	 * Gets the rotation from the matrix and returns it in
	 * radians.
	 * @return {number}
	 */
	rotationRadians () {
		return Math.asin(this.matrix[3]);
	}

	/**
	 * Gets the rotation from the matrix and returns it in
	 * degrees.
	 * @return {number}
	 */
	rotationDegrees () {
		return radiansToDegrees(Math.acos(this.matrix[0]));
	}

	/**
	 * Create a scale matrix.
	 * @param {number} x X scale magnitude.
	 * @param {number} y Y scale magnitude.
	 *
	 * @return {IgeMatrix2d} a matrix object.
	 *
	 * @static
	 */
	_newScale (x: number, y: number) {
		const m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		return m;
	}

	scaleBy (x: number, y: number) {
		const m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		this.multiply(m);

		return this;
	}

	scaleTo (x: number, y: number) {
		const tm = this.matrix;
		//this.identity();
		tm[0] = x;
		tm[4] = y;

		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log("The matrix operation produced a NaN value!", "error");
			debugger;
		}
		/* DEXCLUDE */

		return this;
	}

	/**
	 * Create a translation matrix.
	 * @param {number} x X translation magnitude.
	 * @param {number} y Y translation magnitude.
	 * @return {IgeMatrix2d} A new matrix object.
	 */
	_newTranslate (x: number, y: number) {
		const m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		return m;
	}

	translateBy (x: number, y: number) {
		const m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		this.multiply(m);

		return this;
	}

	/**
	 * Sets this matrix as a translation matrix.
	 * @param x
	 * @param y
	 */
	translateTo (x: number, y: number) {
		const tm = this.matrix;

		tm[2] = x;
		tm[5] = y;

		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log("The matrix operation produced a NaN value!", "error");
			debugger;
		}
		/* DEXCLUDE */

		return this;
	}

	/**
	 * Copy into this matrix the given matrix values.
	 * @param {IgeMatrix2d} matrix
	 * @return {Object} "this".
	 */
	copy (matrix: IgeMatrix2d) {
		const internalMatrix = matrix.matrix;

		const thisMatrix = this.matrix;
		thisMatrix[0] = internalMatrix[0];
		thisMatrix[1] = internalMatrix[1];
		thisMatrix[2] = internalMatrix[2];
		thisMatrix[3] = internalMatrix[3];
		thisMatrix[4] = internalMatrix[4];
		thisMatrix[5] = internalMatrix[5];
		thisMatrix[6] = internalMatrix[6];
		thisMatrix[7] = internalMatrix[7];
		thisMatrix[8] = internalMatrix[8];

		return this;
	}

	compare (matrix: IgeMatrix2d) {
		const thisMatrix = this.matrix,
			thatMatrix = matrix.matrix;

		for (let i = 0; i < 9; i++) {
			if (thisMatrix[i] !== thatMatrix[i]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Set this matrix to the identity matrix.
	 * @return {Object} "this".
	 */
	identity () {
		const m = this.matrix;
		m[0] = 1.0;
		m[1] = 0.0;
		m[2] = 0.0;

		m[3] = 0.0;
		m[4] = 1.0;
		m[5] = 0.0;

		m[6] = 0.0;
		m[7] = 0.0;
		m[8] = 1.0;

		return this;
	}

	/**
	 * Multiply this matrix by a given matrix.
	 * @param {IgeMatrix2d} m The IgeMatrix2d to multiply the
	 * current matrix by.
	 * @return {Object} "this".
	 */
	multiply (m: IgeMatrix2d) {
		const tm = this.matrix,
			mm = m.matrix,
			tm0 = tm[0],
			tm1 = tm[1],
			tm2 = tm[2],
			tm3 = tm[3],
			tm4 = tm[4],
			tm5 = tm[5],
			tm6 = tm[6],
			tm7 = tm[7],
			tm8 = tm[8],
			mm0 = mm[0],
			mm1 = mm[1],
			mm2 = mm[2],
			mm3 = mm[3],
			mm4 = mm[4],
			mm5 = mm[5],
			mm6 = mm[6],
			mm7 = mm[7],
			mm8 = mm[8];

		tm[0] = tm0 * mm0 + tm1 * mm3 + tm2 * mm6;
		tm[1] = tm0 * mm1 + tm1 * mm4 + tm2 * mm7;
		tm[2] = tm0 * mm2 + tm1 * mm5 + tm2 * mm8;
		tm[3] = tm3 * mm0 + tm4 * mm3 + tm5 * mm6;
		tm[4] = tm3 * mm1 + tm4 * mm4 + tm5 * mm7;
		tm[5] = tm3 * mm2 + tm4 * mm5 + tm5 * mm8;
		tm[6] = tm6 * mm0 + tm7 * mm3 + tm8 * mm6;
		tm[7] = tm6 * mm1 + tm7 * mm4 + tm8 * mm7;
		tm[8] = tm6 * mm2 + tm7 * mm5 + tm8 * mm8;

		return this;
	}

	/**
	 * Premultiply this matrix by a given matrix.
	 * @param {IgeMatrix2d} m The IgeMatrix2d to premultiply the
	 * current matrix by.
	 * @return {Object} "this".
	 */
	premultiply (m: IgeMatrix2d) {
		const m00 = m.matrix[0] * this.matrix[0] + m.matrix[1] * this.matrix[3] + m.matrix[2] * this.matrix[6];
		const m01 = m.matrix[0] * this.matrix[1] + m.matrix[1] * this.matrix[4] + m.matrix[2] * this.matrix[7];
		const m02 = m.matrix[0] * this.matrix[2] + m.matrix[1] * this.matrix[5] + m.matrix[2] * this.matrix[8];

		const m10 = m.matrix[3] * this.matrix[0] + m.matrix[4] * this.matrix[3] + m.matrix[5] * this.matrix[6];
		const m11 = m.matrix[3] * this.matrix[1] + m.matrix[4] * this.matrix[4] + m.matrix[5] * this.matrix[7];
		const m12 = m.matrix[3] * this.matrix[2] + m.matrix[4] * this.matrix[5] + m.matrix[5] * this.matrix[8];

		const m20 = m.matrix[6] * this.matrix[0] + m.matrix[7] * this.matrix[3] + m.matrix[8] * this.matrix[6];
		const m21 = m.matrix[6] * this.matrix[1] + m.matrix[7] * this.matrix[4] + m.matrix[8] * this.matrix[7];
		const m22 = m.matrix[6] * this.matrix[2] + m.matrix[7] * this.matrix[5] + m.matrix[8] * this.matrix[8];

		this.matrix[0] = m00;
		this.matrix[1] = m01;
		this.matrix[2] = m02;

		this.matrix[3] = m10;
		this.matrix[4] = m11;
		this.matrix[5] = m12;

		this.matrix[6] = m20;
		this.matrix[7] = m21;
		this.matrix[8] = m22;

		return this;
	}

	/**
	 * Creates a new inverse matrix from this matrix.
	 * @return {IgeMatrix2d} An inverse matrix.
	 */
	getInverse () {
		const tm = this.matrix;

		const m00 = tm[0],
			m01 = tm[1],
			m02 = tm[2],
			m10 = tm[3],
			m11 = tm[4],
			m12 = tm[5],
			m20 = tm[6],
			m21 = tm[7],
			m22 = tm[8],
			newMatrix = new IgeMatrix2d(),
			determinant = m00 * (m11 * m22 - m21 * m12) - m10 * (m01 * m22 - m21 * m02) + m20 * (m01 * m12 - m11 * m02);

		if (determinant === 0) {
			// TODO: This used to be `return null`, was it correct?
			return this;
		}

		const m = newMatrix.matrix;

		m[0] = m11 * m22 - m12 * m21;
		m[1] = m02 * m21 - m01 * m22;
		m[2] = m01 * m12 - m02 * m11;

		m[3] = m12 * m20 - m10 * m22;
		m[4] = m00 * m22 - m02 * m20;
		m[5] = m02 * m10 - m00 * m12;

		m[6] = m10 * m21 - m11 * m20;
		m[7] = m01 * m20 - m00 * m21;
		m[8] = m00 * m11 - m01 * m10;

		newMatrix.multiplyScalar(1 / determinant);

		return newMatrix;
	}

	/**
	 * Multiply this matrix by a scalar.
	 * @param {number} scalar Scalar value.
	 * @return this
	 */
	multiplyScalar (scalar: number) {
		let i;

		for (i = 0; i < 9; i++) {
			this.matrix[i] *= scalar;
		}

		return this;
	}

	/**
	 * Transforms the passed rendering context by the current matrix
	 * data using the setTransform() method so that the matrix data
	 * is set non-cumulative with the previous matrix data.
	 * @param {CanvasRenderingContext2D} ctx The rendering context to
	 * set the transform matrix for.
	 */
	transformRenderingContextSet (ctx: IgeCanvasRenderingContext2d) {
		const m = this.matrix;
		ctx.setTransform(m[0], m[3], m[1], m[4], Math.floor(m[2]), Math.floor(m[5]));
		return this;
	}

	/**
	 * Transforms the passed rendering context by the current matrix
	 * data using the transform() method so that the matrix data
	 * is set cumulative with the previous matrix data.
	 * @param {CanvasRenderingContext2D} ctx The rendering context to
	 * set the transform matrix for.
	 */
	transformRenderingContext (ctx: IgeCanvasRenderingContext2d) {
		const m = this.matrix;
		ctx.transform(m[0], m[3], m[1], m[4], Math.floor(m[2]), Math.floor(m[5]));
		return this;
	}
}
