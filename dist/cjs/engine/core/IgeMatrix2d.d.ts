import { IgeBaseClass } from "./IgeBaseClass.js"
import type { IgeEntity } from "./IgeEntity.js";
import type { IgeObject } from "./IgeObject.js"
import { IgePoint3d } from "./IgePoint3d.js";
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgePoint } from "../../types/IgePoint.js"
/**
 * Creates a new transformation matrix.
 */
export declare class IgeMatrix2d extends IgeBaseClass {
    matrix: number[];
    _rotateOrigin: IgePoint3d;
    _scaleOrigin: IgePoint3d;
    transformCoord(point: IgePoint, obj: IgeObject): IgePoint;
    /**
     * Transform a point by this matrix in inverse. The parameter point will be modified with the transformation values.
     * @param {IgePoint3d} point.
     * @param obj
     * @return {IgePoint3d} The passed point.
     */
    transformCoordInverse(point: IgePoint, obj: IgeEntity): IgePoint;
    transform(points: IgePoint[], obj: IgeObject): IgePoint[];
    /**
     * Create a new rotation matrix and set it up for the specified angle in radians.
     * @param {number} angle
     * @return {IgeMatrix2d} A new matrix object.
     */
    _newRotate(angle: number): IgeMatrix2d;
    rotateBy(angle: number): this;
    rotateTo(angle: number): this;
    /**
     * Gets the rotation from the matrix and returns it in
     * radians.
     * @return {number}
     */
    rotationRadians(): number;
    /**
     * Gets the rotation from the matrix and returns it in
     * degrees.
     * @return {number}
     */
    rotationDegrees(): number;
    /**
     * Create a scale matrix.
     * @param {number} x X scale magnitude.
     * @param {number} y Y scale magnitude.
     *
     * @return {IgeMatrix2d} a matrix object.
     *
     * @static
     */
    _newScale(x: number, y: number): IgeMatrix2d;
    scaleBy(x: number, y: number): this;
    scaleTo(x: number, y: number): this;
    /**
     * Create a translation matrix.
     * @param {number} x X translation magnitude.
     * @param {number} y Y translation magnitude.
     * @return {IgeMatrix2d} A new matrix object.
     */
    _newTranslate(x: number, y: number): IgeMatrix2d;
    translateBy(x: number, y: number): this;
    /**
     * Sets this matrix as a translation matrix.
     * @param x
     * @param y
     */
    translateTo(x: number, y: number): this;
    /**
     * Copy into this matrix the given matrix values.
     * @param {IgeMatrix2d} matrix
     * @return {Object} "this".
     */
    copy(matrix: IgeMatrix2d): this;
    compare(matrix: IgeMatrix2d): boolean;
    /**
     * Set this matrix to the identity matrix.
     * @return {Object} "this".
     */
    identity(): this;
    /**
     * Multiply this matrix by a given matrix.
     * @param {IgeMatrix2d} m The IgeMatrix2d to multiply the
     * current matrix by.
     * @return {Object} "this".
     */
    multiply(m: IgeMatrix2d): this;
    /**
     * Premultiply this matrix by a given matrix.
     * @param {IgeMatrix2d} m The IgeMatrix2d to premultiply the
     * current matrix by.
     * @return {Object} "this".
     */
    premultiply(m: IgeMatrix2d): this;
    /**
     * Creates a new inverse matrix from this matrix.
     * @return {IgeMatrix2d} An inverse matrix.
     */
    getInverse(): IgeMatrix2d;
    /**
     * Multiply this matrix by a scalar.
     * @param {number} scalar Scalar value.
     * @return this
     */
    multiplyScalar(scalar: number): this;
    /**
     * Transforms the passed rendering context by the current matrix
     * data using the setTransform() method so that the matrix data
     * is set non-cumulative with the previous matrix data.
     * @param {CanvasRenderingContext2D} ctx The rendering context to
     * set the transform matrix for.
     */
    transformRenderingContextSet(ctx: IgeCanvasRenderingContext2d): this;
    /**
     * Transforms the passed rendering context by the current matrix
     * data using the transform() method so that the matrix data
     * is set cumulative with the previous matrix data.
     * @param {CanvasRenderingContext2D} ctx The rendering context to
     * set the transform matrix for.
     */
    transformRenderingContext(ctx: IgeCanvasRenderingContext2d): this;
}
