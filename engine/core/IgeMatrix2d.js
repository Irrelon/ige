// TODO: Clean up the variable declarations in this file so they all run on the same var call at the top of the method.
/**
 * Creates a new transformation matrix.
 */
var IgeMatrix2d = function() {
	this.matrix = [
		1.0,0.0,0.0,
		0.0,1.0,0.0,
		0.0,0.0,1.0
	];

	this._rotateOrigin = new IgePoint(0, 0, 0);
	this._scaleOrigin = new IgePoint(0, 0, 0);
};

IgeMatrix2d.prototype = {
	matrix:	null,

	/**
	 * Transform a point by this matrix. The parameter point will be modified with the transformation values.
	 * @param {IgePoint} point
	 * @return {IgePoint} The passed point.
	 */
	transformCoord: function(point) {
		var x = point.x,
			y = point.y,
			tm = this.matrix;

		point.x = x * tm[0] + y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] + tm[5];
		
		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			ige.log('The matrix operation produced a NaN value!', 'error');
		}
		/* DEXCLUDE */

		return point;
	},

	/**
	 * Transform a point by this matrix in inverse. The parameter point will be modified with the transformation values.
	 * @param {IgePoint} point.
	 * @return {IgePoint} The passed point.
	 */
	transformCoordInverse: function(point) {
		var x = point.x,
			y = point.y,
			tm = this.matrix;

		point.x = x * tm[0] - y * tm[1] + tm[2];
		point.y = x * tm[3] + y * tm[4] - tm[5];
		
		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log('The matrix operation produced a NaN value!', 'error');
		}
		/* DEXCLUDE */

		return point;
	},

	transform: function (points) {
		var pointIndex,
			pointCount = points.length;

		for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
			this.transformCoord(points[pointIndex]);
		}

		return points;
	},

	/**
	 * Create a new rotation matrix and set it up for the specified angle in radians.
	 * @param {Number} angle
	 * @return {IgeMatrix2d} A new matrix object.
	 */
	_newRotate: function(angle) {
		var m = new IgeMatrix2d();
		m.rotateTo(angle);
		return m;
	},

	rotateBy: function(angle) {
		var m = new IgeMatrix2d();

		m.translateBy(this._rotateOrigin.x, this._rotateOrigin.y);
		m.rotateTo(angle);
		m.translateBy(-this._rotateOrigin.x, -this._rotateOrigin.y);

		this.multiply(m);

		return this;
	},

	rotateTo: function (angle) {
		var tm = this.matrix,
			c = Math.cos(angle),
			s = Math.sin(angle);

		tm[0] = c;
		tm[1] = -s;
		tm[3] = s;
		tm[4] = c;
		
		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			console.log('The matrix operation produced a NaN value!', 'error');
		}
		/* DEXCLUDE */

		return this;
	},

	/**
	 * Gets the rotation from the matrix and returns it in
	 * radians.
	 * @return {Number}
	 */
	rotationRadians: function () {
		return Math.asin(this.matrix[3]);
	},

	/**
	 * Gets the rotation from the matrix and returns it in
	 * degrees.
	 * @return {Number}
	 */
	rotationDegrees: function () {
		return Math.degrees(Math.acos(this.matrix[0]));
	},

	/**
	 * Create a scale matrix.
	 * @param {Number} x X scale magnitude.
	 * @param {Number} y Y scale magnitude.
	 *
	 * @return {IgeMatrix2d} a matrix object.
	 *
	 * @static
	 */
	_newScale: function(x, y) {
		var m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		return m;
	},

	scaleBy: function(x, y) {
		var m = new IgeMatrix2d();

		m.matrix[0] = x;
		m.matrix[4] = y;

		this.multiply(m);

		return this;
	},

	scaleTo: function(x, y) {
		var tm = this.matrix;
		//this.identity();
		tm[0] = x;
		tm[4] = y;
		
		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log('The matrix operation produced a NaN value!', 'error');
		}
		/* DEXCLUDE */

		return this;
	},

	/**
	 * Create a translation matrix.
	 * @param {Number} x X translation magnitude.
	 * @param {Number} y Y translation magnitude.
	 * @return {IgeMatrix2d} A new matrix object.
	 */
	_newTranslate: function (x, y) {
		var m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		return m;
	},

	translateBy: function (x, y) {
		var m = new IgeMatrix2d();

		m.matrix[2] = x;
		m.matrix[5] = y;

		this.multiply(m);

		return this;
	},

	/**
	 * Sets this matrix as a translation matrix.
	 * @param x
	 * @param y
	 */
	translateTo: function (x, y) {
		var tm = this.matrix;
		
		tm[2] = x;
		tm[5] = y;
		
		/* DEXCLUDE */
		if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
			this.log('The matrix operation produced a NaN value!', 'error');
		}
		/* DEXCLUDE */

		return this;
	},

	/**
	 * Copy into this matrix the given matrix values.
	 * @param {IgeMatrix2d} matrix 
	 * @return {Object} "this".
	 */
	copy: function (matrix) {
		matrix = matrix.matrix;

		var tmatrix = this.matrix;
		tmatrix[0] = matrix[0];
		tmatrix[1] = matrix[1];
		tmatrix[2] = matrix[2];
		tmatrix[3] = matrix[3];
		tmatrix[4] = matrix[4];
		tmatrix[5] = matrix[5];
		tmatrix[6] = matrix[6];
		tmatrix[7] = matrix[7];
		tmatrix[8] = matrix[8];

		return this;
	},

	/**
	 * Set this matrix to the identity matrix.
	 * @return {Object} "this".
	 */
	identity: function() {

		var m = this.matrix;
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
	},

	/**
	 * Multiply this matrix by a given matrix.
	 * @param {IgeMatrix2d} m The IgeMatrix2d to multiply the
	 * current matrix by.
	 * @return {Object} "this".
	 */
	multiply: function (m) {
		var tm = this.matrix,
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

		tm[0] = tm0*mm0 + tm1*mm3 + tm2*mm6;
		tm[1] = tm0*mm1 + tm1*mm4 + tm2*mm7;
		tm[2] = tm0*mm2 + tm1*mm5 + tm2*mm8;
		tm[3] = tm3*mm0 + tm4*mm3 + tm5*mm6;
		tm[4] = tm3*mm1 + tm4*mm4 + tm5*mm7;
		tm[5] = tm3*mm2 + tm4*mm5 + tm5*mm8;
		tm[6] = tm6*mm0 + tm7*mm3 + tm8*mm6;
		tm[7] = tm6*mm1 + tm7*mm4 + tm8*mm7;
		tm[8] = tm6*mm2 + tm7*mm5 + tm8*mm8;

		return this;
	},

	/**
	 * Premultiply this matrix by a given matrix.
	 * @param {IgeMatrix2d} m The IgeMatrix2d to premultiply the
	 * current matrix by.
	 * @return {Object} "this".
	 */
	premultiply: function(m) {

		var m00 = m.matrix[0]*this.matrix[0] + m.matrix[1]*this.matrix[3] + m.matrix[2]*this.matrix[6];
		var m01 = m.matrix[0]*this.matrix[1] + m.matrix[1]*this.matrix[4] + m.matrix[2]*this.matrix[7];
		var m02 = m.matrix[0]*this.matrix[2] + m.matrix[1]*this.matrix[5] + m.matrix[2]*this.matrix[8];

		var m10 = m.matrix[3]*this.matrix[0] + m.matrix[4]*this.matrix[3] + m.matrix[5]*this.matrix[6];
		var m11 = m.matrix[3]*this.matrix[1] + m.matrix[4]*this.matrix[4] + m.matrix[5]*this.matrix[7];
		var m12 = m.matrix[3]*this.matrix[2] + m.matrix[4]*this.matrix[5] + m.matrix[5]*this.matrix[8];

		var m20 = m.matrix[6]*this.matrix[0] + m.matrix[7]*this.matrix[3] + m.matrix[8]*this.matrix[6];
		var m21 = m.matrix[6]*this.matrix[1] + m.matrix[7]*this.matrix[4] + m.matrix[8]*this.matrix[7];
		var m22 = m.matrix[6]*this.matrix[2] + m.matrix[7]*this.matrix[5] + m.matrix[8]*this.matrix[8];

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
	},

	/**
	 * Creates a new inverse matrix from this matrix.
	 * @return {IgeMatrix2d} An inverse matrix.
	 */
	getInverse: function() {
		var tm = this.matrix;

		var m00 = tm[0],
			m01 = tm[1],
			m02 = tm[2],
			m10 = tm[3],
			m11 = tm[4],
			m12 = tm[5],
			m20 = tm[6],
			m21 = tm[7],
			m22 = tm[8],

			newMatrix = new IgeMatrix2d(),
			determinant = m00* (m11*m22 - m21*m12) - m10*(m01*m22 - m21*m02) + m20 * (m01*m12 - m11*m02);

		if  (determinant===0) {
			return null;
		}

		var m = newMatrix.matrix;

		m[0] = m11*m22-m12*m21;
		m[1] = m02*m21-m01*m22;
		m[2] = m01*m12-m02*m11;

		m[3] = m12*m20-m10*m22;
		m[4] = m00*m22-m02*m20;
		m[5] = m02*m10-m00*m12;

		m[6] = m10*m21-m11*m20;
		m[7] = m01*m20-m00*m21;
		m[8] = m00*m11-m01*m10;

		newMatrix.multiplyScalar (1/determinant);

		return newMatrix;
	},

	/**
	 * Multiply this matrix by a scalar.
	 * @param scalar {number} Scalar value.
	 * @return this
	 */
	multiplyScalar: function (scalar) {
		var i;

		for (i=0; i<9; i++) {
			this.matrix[i]*=scalar;
		}

		return this;
	},

	/**
	 * Transforms the passed rendering context by the current matrix
	 * data using the setTransform() method so that the matrix data
	 * is set non-cumulative with the previous matrix data.
	 * @param {CanvasRenderingContext2d} ctx The rendering context to
	 * set the transform matrix for.
	 */
	transformRenderingContextSet: function(ctx) {
		var m = this.matrix;
		ctx.setTransform (m[0], m[3], m[1], m[4], m[2], m[5]);
		return this;
	},

	/**
	 * Transforms the passed rendering context by the current matrix
	 * data using the transform() method so that the matrix data
	 * is set cumulative with the previous matrix data.
	 * @param {CanvasRenderingContext2d} ctx The rendering context to
	 * set the transform matrix for.
	 */
	transformRenderingContext: function(ctx) {
		var m = this.matrix;
		ctx.transform (m[0], m[3], m[1], m[4], m[2], m[5]);
		return this;
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMatrix2d; }