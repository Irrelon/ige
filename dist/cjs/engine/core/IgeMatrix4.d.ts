import { IgeBaseClass } from "./IgeBaseClass.js"
import type { IgePoint3d } from "./IgePoint3d.js"
/**
 * Creates a new 4x4 transformation matrix for 3D operations.
 * Matrix is stored in column-major format (WebGL standard).
 */
export declare class IgeMatrix4 extends IgeBaseClass {
    classId: string;
    matrix: Float32Array;
    /**
     * Sets this matrix to the identity matrix.
     */
    identity(): this;
    /**
     * Copies the values from another matrix into this matrix.
     */
    copy(matrix: IgeMatrix4): this;
    /**
     * Clones this matrix and returns a new instance.
     */
    clone(): IgeMatrix4;
    /**
     * Compares this matrix with another matrix.
     */
    compare(matrix: IgeMatrix4): boolean;
    /**
     * Applies translation to this matrix.
     */
    translateBy(x: number, y: number, z: number): this;
    /**
     * Sets this matrix as a translation matrix.
     */
    translateTo(x: number, y: number, z: number): this;
    /**
     * Applies rotation around X axis to this matrix.
     * @param angle Angle in radians
     */
    rotateXBy(angle: number): this;
    /**
     * Sets this matrix as a rotation matrix around X axis.
     * @param angle Angle in radians
     */
    rotateXTo(angle: number): this;
    /**
     * Applies rotation around Y axis to this matrix.
     * @param angle Angle in radians
     */
    rotateYBy(angle: number): this;
    /**
     * Sets this matrix as a rotation matrix around Y axis.
     * @param angle Angle in radians
     */
    rotateYTo(angle: number): this;
    /**
     * Applies rotation around Z axis to this matrix.
     * @param angle Angle in radians
     */
    rotateZBy(angle: number): this;
    /**
     * Sets this matrix as a rotation matrix around Z axis.
     * @param angle Angle in radians
     */
    rotateZTo(angle: number): this;
    /**
     * Applies rotation to this matrix using Euler angles (ZYX order).
     * @param x Rotation around X axis in radians
     * @param y Rotation around Y axis in radians
     * @param z Rotation around Z axis in radians
     */
    rotateBy(x: number, y: number, z: number): this;
    /**
     * Applies scale to this matrix.
     */
    scaleBy(x: number, y: number, z: number): this;
    /**
     * Sets this matrix as a scale matrix.
     */
    scaleTo(x: number, y: number, z: number): this;
    /**
     * Multiplies this matrix by another matrix.
     * Result = this * m
     *
     * Can also be called with two matrices: multiply(a, b)
     * Result = a * b (stored in this matrix)
     */
    multiply(m: IgeMatrix4, n?: IgeMatrix4): this;
    /**
     * Multiplies this matrix by a scalar value.
     */
    multiplyScalar(scalar: number): this;
    /**
     * Creates a perspective projection matrix.
     * @param fovRadians Field of view in radians
     * @param aspect Aspect ratio (width / height)
     * @param near Near clipping plane
     * @param far Far clipping plane
     */
    perspective(fovRadians: number, aspect: number, near: number, far: number): this;
    /**
     * Creates an orthographic projection matrix.
     * @param left Left bound
     * @param right Right bound
     * @param bottom Bottom bound
     * @param top Top bound
     * @param near Near clipping plane
     * @param far Far clipping plane
     */
    orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): this;
    /**
     * Creates a look-at view matrix.
     * @param eye Camera position (or eyeX if using individual coordinates)
     * @param target Target position to look at (or eyeY if using individual coordinates)
     * @param up Up vector (or eyeZ if using individual coordinates)
     * @param targetX Target X (when using individual coordinates)
     * @param targetY Target Y (when using individual coordinates)
     * @param targetZ Target Z (when using individual coordinates)
     * @param upX Up X (when using individual coordinates)
     * @param upY Up Y (when using individual coordinates)
     * @param upZ Up Z (when using individual coordinates)
     */
    lookAt(eye: IgePoint3d | number, target: IgePoint3d | number, up: IgePoint3d | number, targetX?: number, targetY?: number, targetZ?: number, upX?: number, upY?: number, upZ?: number): this;
    /**
     * Calculates the inverse of this matrix.
     */
    getInverse(): IgeMatrix4 | null;
    /**
     * Transforms a 3D point by this matrix.
     */
    transformPoint(point: IgePoint3d): IgePoint3d;
    /**
     * Transforms a 3D vector (direction) by this matrix, ignoring translation.
     */
    transformVector(point: IgePoint3d): IgePoint3d;
    /**
     * Returns a new matrix that is the transpose of this matrix.
     * In a column-major layout, transposing swaps rows and columns.
     */
    transpose(): IgeMatrix4;
    /**
     * Returns a string representation of the matrix.
     */
    toString(): string;
}
