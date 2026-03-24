import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeMatrix4 } from "../core/IgeMatrix4.js"
import { IgePoint3d } from "../core/IgePoint3d.js"
import type { IgeCamera } from "../core/IgeCamera.js"
import type { IgeViewport } from "../core/IgeViewport.js"
import { IgeFrustum } from "./IgeFrustum.js"
/**
 * Camera matrices for rendering.
 */
export interface IgeCameraMatrices {
    view: IgeMatrix4;
    projection: IgeMatrix4;
    viewProjection: IgeMatrix4;
    frustum: IgeFrustum;
    cameraPosition: IgePoint3d;
}
/**
 * Manages camera matrices and frustum culling for WebGL renderer.
 */
export declare class IgeWebGlCameraController extends IgeBaseClass {
    classId: string;
    protected _cameraMatricesCache: Map<string, IgeCameraMatrices>;
    /**
     * Update and get camera matrices for a viewport.
     */
    updateCamera(camera: IgeCamera, viewport: IgeViewport): IgeCameraMatrices;
    /**
     * Calculate view matrix from camera transform.
     */
    protected _calculateViewMatrix(camera: IgeCamera, viewMatrix: IgeMatrix4): void;
    /**
     * Calculate projection matrix based on camera settings.
     */
    protected _calculateProjectionMatrix(camera: IgeCamera, viewport: IgeViewport, projectionMatrix: IgeMatrix4): void;
    /**
     * Test if a point is visible by the camera.
     */
    isPointVisible(point: IgePoint3d, camera: IgeCamera, viewport: IgeViewport): boolean;
    /**
     * Test if a sphere is visible by the camera.
     */
    isSphereVisible(center: IgePoint3d, radius: number, camera: IgeCamera, viewport: IgeViewport): boolean;
    /**
     * Test if an axis-aligned bounding box is visible by the camera.
     */
    isBoxVisible(min: IgePoint3d, max: IgePoint3d, camera: IgeCamera, viewport: IgeViewport): boolean;
    /**
     * Get cached camera matrices (if they exist).
     */
    getCachedMatrices(cameraId: string): IgeCameraMatrices | undefined;
    /**
     * Clear camera matrices cache.
     */
    clearCache(): void;
    /**
     * Clear cache for a specific camera.
     */
    clearCameraCache(cameraId: string): void;
}
