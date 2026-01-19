import { IgeBaseClass } from "./IgeBaseClass.js"
/**
 * Creates a new 4x4 transformation matrix for 3D operations.
 * Matrix is stored in column-major format (WebGL standard).
 */
export class IgeMatrix4 extends IgeBaseClass {
    classId = "IgeMatrix4";
    // Column-major 4x4 matrix: [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15]
    // Layout:
    // [ m0  m4  m8  m12 ]   [ 0  4   8  12 ]   [ scaleX   0        0       translateX ]
    // [ m1  m5  m9  m13 ] = [ 1  5   9  13 ] = [ 0        scaleY   0       translateY ]
    // [ m2  m6  m10 m14 ]   [ 2  6  10  14 ]   [ 0        0        scaleZ  translateZ ]
    // [ m3  m7  m11 m15 ]   [ 3  7  11  15 ]   [ 0        0        0       1          ]
    matrix = new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ]);
    /**
     * Sets this matrix to the identity matrix.
     */
    identity() {
        const m = this.matrix;
        m[0] = 1.0;
        m[4] = 0.0;
        m[8] = 0.0;
        m[12] = 0.0;
        m[1] = 0.0;
        m[5] = 1.0;
        m[9] = 0.0;
        m[13] = 0.0;
        m[2] = 0.0;
        m[6] = 0.0;
        m[10] = 1.0;
        m[14] = 0.0;
        m[3] = 0.0;
        m[7] = 0.0;
        m[11] = 0.0;
        m[15] = 1.0;
        return this;
    }
    /**
     * Copies the values from another matrix into this matrix.
     */
    copy(matrix) {
        const src = matrix.matrix;
        const dst = this.matrix;
        for (let i = 0; i < 16; i++) {
            dst[i] = src[i];
        }
        return this;
    }
    /**
     * Clones this matrix and returns a new instance.
     */
    clone() {
        const m = new IgeMatrix4();
        return m.copy(this);
    }
    /**
     * Compares this matrix with another matrix.
     */
    compare(matrix) {
        const a = this.matrix;
        const b = matrix.matrix;
        for (let i = 0; i < 16; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    /**
     * Applies translation to this matrix.
     */
    translateBy(x, y, z) {
        const m = new IgeMatrix4();
        m.translateTo(x, y, z);
        this.multiply(m);
        return this;
    }
    /**
     * Sets this matrix as a translation matrix.
     */
    translateTo(x, y, z) {
        const m = this.matrix;
        m[12] = x;
        m[13] = y;
        m[14] = z;
        return this;
    }
    /**
     * Applies rotation around X axis to this matrix.
     * @param angle Angle in radians
     */
    rotateXBy(angle) {
        const m = new IgeMatrix4();
        m.rotateXTo(angle);
        this.multiply(m);
        return this;
    }
    /**
     * Sets this matrix as a rotation matrix around X axis.
     * @param angle Angle in radians
     */
    rotateXTo(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = this.matrix;
        this.identity();
        m[5] = c;
        m[6] = s;
        m[9] = -s;
        m[10] = c;
        return this;
    }
    /**
     * Applies rotation around Y axis to this matrix.
     * @param angle Angle in radians
     */
    rotateYBy(angle) {
        const m = new IgeMatrix4();
        m.rotateYTo(angle);
        this.multiply(m);
        return this;
    }
    /**
     * Sets this matrix as a rotation matrix around Y axis.
     * @param angle Angle in radians
     */
    rotateYTo(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = this.matrix;
        this.identity();
        m[0] = c;
        m[2] = -s;
        m[8] = s;
        m[10] = c;
        return this;
    }
    /**
     * Applies rotation around Z axis to this matrix.
     * @param angle Angle in radians
     */
    rotateZBy(angle) {
        const m = new IgeMatrix4();
        m.rotateZTo(angle);
        this.multiply(m);
        return this;
    }
    /**
     * Sets this matrix as a rotation matrix around Z axis.
     * @param angle Angle in radians
     */
    rotateZTo(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m = this.matrix;
        this.identity();
        m[0] = c;
        m[1] = s;
        m[4] = -s;
        m[5] = c;
        return this;
    }
    /**
     * Applies rotation to this matrix using Euler angles (ZYX order).
     * @param x Rotation around X axis in radians
     * @param y Rotation around Y axis in radians
     * @param z Rotation around Z axis in radians
     */
    rotateBy(x, y, z) {
        // Apply rotations in ZYX order (standard for game engines)
        if (z !== 0)
            this.rotateZBy(z);
        if (y !== 0)
            this.rotateYBy(y);
        if (x !== 0)
            this.rotateXBy(x);
        return this;
    }
    /**
     * Applies scale to this matrix.
     */
    scaleBy(x, y, z) {
        const m = new IgeMatrix4();
        m.scaleTo(x, y, z);
        this.multiply(m);
        return this;
    }
    /**
     * Sets this matrix as a scale matrix.
     */
    scaleTo(x, y, z) {
        const m = this.matrix;
        m[0] = x;
        m[5] = y;
        m[10] = z;
        return this;
    }
    /**
     * Multiplies this matrix by another matrix.
     * Result = this * m
     */
    multiply(m) {
        const a = this.matrix;
        const b = m.matrix;
        // Store original values
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
        const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
        const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
        const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
        const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];
        // Perform multiplication
        a[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
        a[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
        a[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
        a[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
        a[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
        a[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
        a[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
        a[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
        a[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
        a[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
        a[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
        a[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
        a[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
        a[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
        a[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
        a[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
        return this;
    }
    /**
     * Multiplies this matrix by a scalar value.
     */
    multiplyScalar(scalar) {
        const m = this.matrix;
        for (let i = 0; i < 16; i++) {
            m[i] *= scalar;
        }
        return this;
    }
    /**
     * Creates a perspective projection matrix.
     * @param fovRadians Field of view in radians
     * @param aspect Aspect ratio (width / height)
     * @param near Near clipping plane
     * @param far Far clipping plane
     */
    perspective(fovRadians, aspect, near, far) {
        const f = 1.0 / Math.tan(fovRadians / 2);
        const rangeInv = 1.0 / (near - far);
        const m = this.matrix;
        this.identity();
        m[0] = f / aspect;
        m[5] = f;
        m[10] = (near + far) * rangeInv;
        m[11] = -1.0;
        m[14] = near * far * rangeInv * 2.0;
        m[15] = 0.0;
        return this;
    }
    /**
     * Creates an orthographic projection matrix.
     * @param left Left bound
     * @param right Right bound
     * @param bottom Bottom bound
     * @param top Top bound
     * @param near Near clipping plane
     * @param far Far clipping plane
     */
    orthographic(left, right, bottom, top, near, far) {
        const lr = 1.0 / (left - right);
        const bt = 1.0 / (bottom - top);
        const nf = 1.0 / (near - far);
        const m = this.matrix;
        this.identity();
        m[0] = -2.0 * lr;
        m[5] = -2.0 * bt;
        m[10] = 2.0 * nf;
        m[12] = (left + right) * lr;
        m[13] = (top + bottom) * bt;
        m[14] = (far + near) * nf;
        return this;
    }
    /**
     * Creates a look-at view matrix.
     * @param eye Camera position
     * @param target Target position to look at
     * @param up Up vector
     */
    lookAt(eye, target, up) {
        // Calculate forward vector (z-axis)
        let zx = eye.x - target.x;
        let zy = eye.y - target.y;
        let zz = eye.z - target.z;
        // Normalize z
        let len = Math.sqrt(zx * zx + zy * zy + zz * zz);
        if (len > 0) {
            len = 1.0 / len;
            zx *= len;
            zy *= len;
            zz *= len;
        }
        // Calculate right vector (x-axis) = up × forward
        let xx = up.y * zz - up.z * zy;
        let xy = up.z * zx - up.x * zz;
        let xz = up.x * zy - up.y * zx;
        // Normalize x
        len = Math.sqrt(xx * xx + xy * xy + xz * xz);
        if (len > 0) {
            len = 1.0 / len;
            xx *= len;
            xy *= len;
            xz *= len;
        }
        // Calculate actual up vector (y-axis) = forward × right
        const yx = zy * xz - zz * xy;
        const yy = zz * xx - zx * xz;
        const yz = zx * xy - zy * xx;
        const m = this.matrix;
        m[0] = xx;
        m[1] = xy;
        m[2] = xz;
        m[3] = 0.0;
        m[4] = yx;
        m[5] = yy;
        m[6] = yz;
        m[7] = 0.0;
        m[8] = zx;
        m[9] = zy;
        m[10] = zz;
        m[11] = 0.0;
        // Translation: negative dot products of eye with each axis
        m[12] = -(xx * eye.x + xy * eye.y + xz * eye.z); // -dot(right, eye)
        m[13] = -(yx * eye.x + yy * eye.y + yz * eye.z); // -dot(up, eye)
        m[14] = -(zx * eye.x + zy * eye.y + zz * eye.z); // -dot(forward, eye)
        m[15] = 1.0;
        return this;
    }
    /**
     * Calculates the inverse of this matrix.
     */
    getInverse() {
        const m = this.matrix;
        const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
        const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
        const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
        const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
        const b00 = a00 * a11 - a01 * a10;
        const b01 = a00 * a12 - a02 * a10;
        const b02 = a00 * a13 - a03 * a10;
        const b03 = a01 * a12 - a02 * a11;
        const b04 = a01 * a13 - a03 * a11;
        const b05 = a02 * a13 - a03 * a12;
        const b06 = a20 * a31 - a21 * a30;
        const b07 = a20 * a32 - a22 * a30;
        const b08 = a20 * a33 - a23 * a30;
        const b09 = a21 * a32 - a22 * a31;
        const b10 = a21 * a33 - a23 * a31;
        const b11 = a22 * a33 - a23 * a32;
        // Calculate determinant
        let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
        if (det === 0) {
            return null;
        }
        det = 1.0 / det;
        const result = new IgeMatrix4();
        const out = result.matrix;
        out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
        out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
        out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
        out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
        out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
        out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
        out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
        out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
        out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
        return result;
    }
    /**
     * Transforms a 3D point by this matrix.
     */
    transformPoint(point) {
        const m = this.matrix;
        const x = point.x;
        const y = point.y;
        const z = point.z;
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        const wInv = w !== 0 ? 1.0 / w : 1.0;
        point.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) * wInv;
        point.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) * wInv;
        point.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) * wInv;
        return point;
    }
    /**
     * Transforms a 3D vector (direction) by this matrix, ignoring translation.
     */
    transformVector(point) {
        const m = this.matrix;
        const x = point.x;
        const y = point.y;
        const z = point.z;
        point.x = m[0] * x + m[4] * y + m[8] * z;
        point.y = m[1] * x + m[5] * y + m[9] * z;
        point.z = m[2] * x + m[6] * y + m[10] * z;
        return point;
    }
    /**
     * Returns a string representation of the matrix.
     */
    toString() {
        const m = this.matrix;
        return `[
  ${m[0].toFixed(3)}, ${m[4].toFixed(3)}, ${m[8].toFixed(3)}, ${m[12].toFixed(3)}
  ${m[1].toFixed(3)}, ${m[5].toFixed(3)}, ${m[9].toFixed(3)}, ${m[13].toFixed(3)}
  ${m[2].toFixed(3)}, ${m[6].toFixed(3)}, ${m[10].toFixed(3)}, ${m[14].toFixed(3)}
  ${m[3].toFixed(3)}, ${m[7].toFixed(3)}, ${m[11].toFixed(3)}, ${m[15].toFixed(3)}
]`;
    }
}
