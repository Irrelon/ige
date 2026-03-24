import { IgeBaseClass } from "../core/IgeBaseClass.js"
import type { IgeMatrix4 } from "../core/IgeMatrix4.js";
import type { IgePoint3d } from "../core/IgePoint3d.js"
/**
 * Represents a plane in 3D space (ax + by + cz + d = 0).
 */
export declare class IgePlane {
    a: number;
    b: number;
    c: number;
    d: number;
    /**
     * Set plane coefficients.
     */
    set(a: number, b: number, c: number, d: number): void;
    /**
     * Normalize the plane.
     */
    normalize(): void;
    /**
     * Calculate signed distance from point to plane.
     */
    distanceToPoint(point: IgePoint3d): number;
}
/**
 * View frustum for culling objects outside camera view.
 * Extracted from view-projection matrix.
 */
export declare class IgeFrustum extends IgeBaseClass {
    classId: string;
    planes: IgePlane[];
    /**
     * Extract frustum planes from view-projection matrix.
     */
    extractFromMatrix(viewProjectionMatrix: IgeMatrix4): void;
    /**
     * Test if a point is inside the frustum.
     */
    containsPoint(point: IgePoint3d): boolean;
    /**
     * Test if a sphere is inside or intersects the frustum.
     * Returns false only if the sphere is completely outside.
     */
    containsSphere(center: IgePoint3d, radius: number): boolean;
    /**
     * Test if an axis-aligned bounding box is inside or intersects the frustum.
     * Returns false only if the box is completely outside.
     */
    containsBox(min: IgePoint3d, max: IgePoint3d): boolean;
}
