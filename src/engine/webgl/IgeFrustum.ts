import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";

/**
 * Represents a plane in 3D space (ax + by + cz + d = 0).
 */
export class IgePlane {
	a: number = 0;
	b: number = 0;
	c: number = 0;
	d: number = 0;

	/**
	 * Set plane coefficients.
	 */
	set(a: number, b: number, c: number, d: number): void {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
	}

	/**
	 * Normalize the plane.
	 */
	normalize(): void {
		const length = Math.sqrt(this.a * this.a + this.b * this.b + this.c * this.c);
		if (length > 0) {
			const invLength = 1.0 / length;
			this.a *= invLength;
			this.b *= invLength;
			this.c *= invLength;
			this.d *= invLength;
		}
	}

	/**
	 * Calculate signed distance from point to plane.
	 */
	distanceToPoint(point: IgePoint3d): number {
		return this.a * point.x + this.b * point.y + this.c * point.z + this.d;
	}
}

/**
 * View frustum for culling objects outside camera view.
 * Extracted from view-projection matrix.
 */
export class IgeFrustum extends IgeBaseClass {
	classId = "IgeFrustum";

	// Six frustum planes: left, right, bottom, top, near, far
	planes: IgePlane[] = [
		new IgePlane(), // Left
		new IgePlane(), // Right
		new IgePlane(), // Bottom
		new IgePlane(), // Top
		new IgePlane(), // Near
		new IgePlane()  // Far
	];

	/**
	 * Extract frustum planes from view-projection matrix.
	 */
	extractFromMatrix(viewProjectionMatrix: IgeMatrix4): void {
		const m = viewProjectionMatrix.matrix;

		// Left plane
		this.planes[0].set(
			m[3] + m[0],
			m[7] + m[4],
			m[11] + m[8],
			m[15] + m[12]
		);

		// Right plane
		this.planes[1].set(
			m[3] - m[0],
			m[7] - m[4],
			m[11] - m[8],
			m[15] - m[12]
		);

		// Bottom plane
		this.planes[2].set(
			m[3] + m[1],
			m[7] + m[5],
			m[11] + m[9],
			m[15] + m[13]
		);

		// Top plane
		this.planes[3].set(
			m[3] - m[1],
			m[7] - m[5],
			m[11] - m[9],
			m[15] - m[13]
		);

		// Near plane
		this.planes[4].set(
			m[3] + m[2],
			m[7] + m[6],
			m[11] + m[10],
			m[15] + m[14]
		);

		// Far plane
		this.planes[5].set(
			m[3] - m[2],
			m[7] - m[6],
			m[11] - m[10],
			m[15] - m[14]
		);

		// Normalize all planes
		for (const plane of this.planes) {
			plane.normalize();
		}
	}

	/**
	 * Test if a point is inside the frustum.
	 */
	containsPoint(point: IgePoint3d): boolean {
		for (const plane of this.planes) {
			if (plane.distanceToPoint(point) < 0) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Test if a sphere is inside or intersects the frustum.
	 * Returns false only if the sphere is completely outside.
	 */
	containsSphere(center: IgePoint3d, radius: number): boolean {
		for (const plane of this.planes) {
			const distance = plane.distanceToPoint(center);
			if (distance < -radius) {
				return false; // Sphere is completely outside this plane
			}
		}
		return true; // Sphere is inside or intersecting
	}

	/**
	 * Test if an axis-aligned bounding box is inside or intersects the frustum.
	 * Returns false only if the box is completely outside.
	 */
	containsBox(min: IgePoint3d, max: IgePoint3d): boolean {
		for (const plane of this.planes) {
			// Find the positive vertex (farthest along plane normal)
			const px = plane.a >= 0 ? max.x : min.x;
			const py = plane.b >= 0 ? max.y : min.y;
			const pz = plane.c >= 0 ? max.z : min.z;

			// If positive vertex is outside, box is completely outside
			if (plane.a * px + plane.b * py + plane.c * pz + plane.d < 0) {
				return false;
			}
		}
		return true;
	}
}
