import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeCamera } from "@/engine/core/IgeCamera";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeFrustum } from "@/engine/webgl/IgeFrustum";

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
export class IgeWebGlCameraController extends IgeBaseClass {
	classId = "IgeWebGlCameraController";

	// Cache for camera matrices
	protected _cameraMatricesCache: Map<string, IgeCameraMatrices> = new Map();

	/**
	 * Update and get camera matrices for a viewport.
	 */
	updateCamera(camera: IgeCamera, viewport: IgeViewport): IgeCameraMatrices {
		const cameraId = camera.id() || "unknown";

		// Check if we have cached matrices
		let matrices = this._cameraMatricesCache.get(cameraId);
		if (!matrices) {
			matrices = {
				view: new IgeMatrix4(),
				projection: new IgeMatrix4(),
				viewProjection: new IgeMatrix4(),
				frustum: new IgeFrustum(),
				cameraPosition: new IgePoint3d(0, 0, 0)
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

		// Store camera position for lighting calculations
		matrices.cameraPosition.x = camera._translate.x;
		matrices.cameraPosition.y = camera._translate.y;
		matrices.cameraPosition.z = camera._translate.z;

		return matrices;
	}

	/**
	 * Calculate view matrix from camera transform.
	 */
	protected _calculateViewMatrix(camera: IgeCamera, viewMatrix: IgeMatrix4): void {
		// Get camera world position
		const cameraPos = new IgePoint3d(
			camera._translate.x,
			camera._translate.y,
			camera._translate.z
		);

		const up = new IgePoint3d(0, 1, 0);

		// Check if camera has a specific look-at target
		const cameraTarget = (camera as any)._lookAt;

		if (cameraTarget) {
			// Use the camera's explicit target
			const target = new IgePoint3d(cameraTarget.x, cameraTarget.y, cameraTarget.z);
			viewMatrix.lookAt(cameraPos, target, up);
		} else {
			// Default: camera looks at the origin (common for orbiting cameras)
			// This works well for 3D scenes where content is centered at origin
			const target = new IgePoint3d(0, 0, 0);
			viewMatrix.lookAt(cameraPos, target, up);
		}
	}

	/**
	 * Calculate projection matrix based on camera settings.
	 */
	protected _calculateProjectionMatrix(
		camera: IgeCamera,
		viewport: IgeViewport,
		projectionMatrix: IgeMatrix4
	): void {
		// Get viewport dimensions
		const width = viewport._bounds2d.x;
		const height = viewport._bounds2d.y;
		const aspect = width / height;

		// Check camera projection type
		const projectionType = (camera as any)._projectionType || "perspective";

		if (projectionType === "perspective") {
			// Perspective projection
			const fov = (camera as any)._fov || 60; // Field of view in degrees
			const near = (camera as any)._near || 0.1;
			const far = (camera as any)._far || 1000;

			// Convert FOV to radians
			const fovRadians = (fov * Math.PI) / 180;

			projectionMatrix.perspective(fovRadians, aspect, near, far);
		} else {
			// Orthographic projection
			const orthoSize = (camera as any)._orthoSize || 10; // Height of view
			const near = (camera as any)._near || 0.1;
			const far = (camera as any)._far || 1000;

			// Calculate orthographic bounds
			const halfHeight = orthoSize / 2;
			const halfWidth = halfHeight * aspect;

			projectionMatrix.orthographic(
				-halfWidth,
				halfWidth,
				-halfHeight,
				halfHeight,
				near,
				far
			);
		}
	}

	/**
	 * Test if a point is visible by the camera.
	 */
	isPointVisible(point: IgePoint3d, camera: IgeCamera, viewport: IgeViewport): boolean {
		const matrices = this.updateCamera(camera, viewport);
		return matrices.frustum.containsPoint(point);
	}

	/**
	 * Test if a sphere is visible by the camera.
	 */
	isSphereVisible(
		center: IgePoint3d,
		radius: number,
		camera: IgeCamera,
		viewport: IgeViewport
	): boolean {
		const matrices = this.updateCamera(camera, viewport);
		return matrices.frustum.containsSphere(center, radius);
	}

	/**
	 * Test if an axis-aligned bounding box is visible by the camera.
	 */
	isBoxVisible(
		min: IgePoint3d,
		max: IgePoint3d,
		camera: IgeCamera,
		viewport: IgeViewport
	): boolean {
		const matrices = this.updateCamera(camera, viewport);
		return matrices.frustum.containsBox(min, max);
	}

	/**
	 * Get cached camera matrices (if they exist).
	 */
	getCachedMatrices(cameraId: string): IgeCameraMatrices | undefined {
		return this._cameraMatricesCache.get(cameraId);
	}

	/**
	 * Clear camera matrices cache.
	 */
	clearCache(): void {
		this._cameraMatricesCache.clear();
	}

	/**
	 * Clear cache for a specific camera.
	 */
	clearCameraCache(cameraId: string): void {
		this._cameraMatricesCache.delete(cameraId);
	}
}
