"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeWebGlCameraController = void 0;
const IgeBaseClass_1 = require("../core/IgeBaseClass.js");
const IgeMatrix4_1 = require("../core/IgeMatrix4.js");
const IgePoint3d_1 = require("../core/IgePoint3d.js");
const IgeFrustum_1 = require("./IgeFrustum.js");
/**
 * Manages camera matrices and frustum culling for WebGL renderer.
 */
class IgeWebGlCameraController extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super(...arguments);
        this.classId = "IgeWebGlCameraController";
        // Cache for camera matrices
        this._cameraMatricesCache = new Map();
    }
    /**
     * Update and get camera matrices for a viewport.
     */
    updateCamera(camera, viewport) {
        const cameraId = camera.id() || "unknown";
        // Check if we have cached matrices
        let matrices = this._cameraMatricesCache.get(cameraId);
        if (!matrices) {
            matrices = {
                view: new IgeMatrix4_1.IgeMatrix4(),
                projection: new IgeMatrix4_1.IgeMatrix4(),
                viewProjection: new IgeMatrix4_1.IgeMatrix4(),
                frustum: new IgeFrustum_1.IgeFrustum()
            };
            this._cameraMatricesCache.set(cameraId, matrices);
        }
        // Calculate view matrix from camera transform
        this._calculateViewMatrix(camera, matrices.view);
        // Calculate projection matrix
        this._calculateProjectionMatrix(camera, viewport, matrices.projection);
        // Calculate view-projection matrix
        matrices.viewProjection.copy(matrices.projection);
        matrices.viewProjection.multiply(matrices.view);
        // Extract frustum planes
        matrices.frustum.extractFromMatrix(matrices.viewProjection);
        return matrices;
    }
    /**
     * Calculate view matrix from camera transform.
     */
    _calculateViewMatrix(camera, viewMatrix) {
        // Get camera world position
        const cameraPos = new IgePoint3d_1.IgePoint3d(camera._translate.x, camera._translate.y, camera._translate.z);
        const up = new IgePoint3d_1.IgePoint3d(0, 1, 0);
        // Check if camera has a specific look-at target
        const cameraTarget = camera._lookAt;
        if (cameraTarget) {
            // Use the camera's explicit target
            const target = new IgePoint3d_1.IgePoint3d(cameraTarget.x, cameraTarget.y, cameraTarget.z);
            viewMatrix.lookAt(cameraPos, target, up);
        }
        else {
            // Default: camera looks at the origin (common for orbiting cameras)
            // This works well for 3D scenes where content is centered at origin
            const target = new IgePoint3d_1.IgePoint3d(0, 0, 0);
            viewMatrix.lookAt(cameraPos, target, up);
        }
    }
    /**
     * Calculate projection matrix based on camera settings.
     */
    _calculateProjectionMatrix(camera, viewport, projectionMatrix) {
        // Get viewport dimensions
        const width = viewport._bounds2d.x;
        const height = viewport._bounds2d.y;
        const aspect = width / height;
        // Check camera projection type
        const projectionType = camera._projectionType || "perspective";
        if (projectionType === "perspective") {
            // Perspective projection
            const fov = camera._fov || 60; // Field of view in degrees
            const near = camera._near || 0.1;
            const far = camera._far || 1000;
            // Convert FOV to radians
            const fovRadians = (fov * Math.PI) / 180;
            projectionMatrix.perspective(fovRadians, aspect, near, far);
        }
        else {
            // Orthographic projection
            const orthoSize = camera._orthoSize || 10; // Height of view
            const near = camera._near || 0.1;
            const far = camera._far || 1000;
            // Calculate orthographic bounds
            const halfHeight = orthoSize / 2;
            const halfWidth = halfHeight * aspect;
            projectionMatrix.orthographic(-halfWidth, halfWidth, -halfHeight, halfHeight, near, far);
        }
    }
    /**
     * Test if a point is visible by the camera.
     */
    isPointVisible(point, camera, viewport) {
        const matrices = this.updateCamera(camera, viewport);
        return matrices.frustum.containsPoint(point);
    }
    /**
     * Test if a sphere is visible by the camera.
     */
    isSphereVisible(center, radius, camera, viewport) {
        const matrices = this.updateCamera(camera, viewport);
        return matrices.frustum.containsSphere(center, radius);
    }
    /**
     * Test if an axis-aligned bounding box is visible by the camera.
     */
    isBoxVisible(min, max, camera, viewport) {
        const matrices = this.updateCamera(camera, viewport);
        return matrices.frustum.containsBox(min, max);
    }
    /**
     * Get cached camera matrices (if they exist).
     */
    getCachedMatrices(cameraId) {
        return this._cameraMatricesCache.get(cameraId);
    }
    /**
     * Clear camera matrices cache.
     */
    clearCache() {
        this._cameraMatricesCache.clear();
    }
    /**
     * Clear cache for a specific camera.
     */
    clearCameraCache(cameraId) {
        this._cameraMatricesCache.delete(cameraId);
    }
}
exports.IgeWebGlCameraController = IgeWebGlCameraController;
