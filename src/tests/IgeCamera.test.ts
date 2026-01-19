import { IgeCamera } from "@/engine/core/IgeCamera";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeViewport } from "@/engine/core/IgeViewport";

// Helper function to create camera with mock viewport
function createCamera(): IgeCamera {
	// Create a mock viewport - IgeViewport creates a camera internally
	// but we can still test camera methods directly
	const mockViewport = {
		_bounds2d: { x: 800, y: 600 }
	} as IgeViewport;
	return new IgeCamera(mockViewport);
}

describe("IgeCamera", () => {
	describe("projection type", () => {
		it("defaults to perspective projection", () => {
			const camera = createCamera();
			expect(camera.projectionType()).toBe("perspective");
		});

		it("can switch to orthographic projection", () => {
			const camera = createCamera();
			camera.projectionType("orthographic");
			expect(camera.projectionType()).toBe("orthographic");
		});

		it("can switch back to perspective projection", () => {
			const camera = createCamera();
			camera.projectionType("orthographic");
			camera.projectionType("perspective");
			expect(camera.projectionType()).toBe("perspective");
		});

		it("returns this for method chaining when setting", () => {
			const camera = createCamera();
			const result = camera.projectionType("orthographic");
			expect(result).toBe(camera);
		});
	});

	describe("field of view", () => {
		it("defaults to 60 degrees", () => {
			const camera = createCamera();
			expect(camera.fov()).toBe(60);
		});

		it("can set custom fov", () => {
			const camera = createCamera();
			camera.fov(90);
			expect(camera.fov()).toBe(90);
		});

		it("returns this for method chaining when setting", () => {
			const camera = createCamera();
			const result = camera.fov(45);
			expect(result).toBe(camera);
		});
	});

	describe("clipping planes", () => {
		it("defaults near plane to 0.1", () => {
			const camera = createCamera();
			expect(camera.near()).toBe(0.1);
		});

		it("defaults far plane to 1000", () => {
			const camera = createCamera();
			expect(camera.far()).toBe(1000);
		});

		it("can set custom near plane", () => {
			const camera = createCamera();
			camera.near(1);
			expect(camera.near()).toBe(1);
		});

		it("can set custom far plane", () => {
			const camera = createCamera();
			camera.far(5000);
			expect(camera.far()).toBe(5000);
		});

		it("returns this for method chaining when setting near", () => {
			const camera = createCamera();
			const result = camera.near(0.5);
			expect(result).toBe(camera);
		});

		it("returns this for method chaining when setting far", () => {
			const camera = createCamera();
			const result = camera.far(2000);
			expect(result).toBe(camera);
		});
	});

	describe("orthographic size", () => {
		it("can set ortho size", () => {
			const camera = createCamera();
			camera.orthoSize(500);
			expect(camera.orthoSize()).toBe(500);
		});

		it("returns this for method chaining when setting", () => {
			const camera = createCamera();
			const result = camera.orthoSize(400);
			expect(result).toBe(camera);
		});
	});

	describe("lookAtPoint", () => {
		it("can set a look-at target point", () => {
			const camera = createCamera();
			const target = new IgePoint3d(10, 20, 30);
			camera.lookAtPoint(target);

			const result = camera.lookAtPoint() as IgePoint3d | undefined;
			expect(result).toBeDefined();
			expect(result?.x).toBe(10);
			expect(result?.y).toBe(20);
			expect(result?.z).toBe(30);
		});

		it("returns undefined when no look-at is set", () => {
			const camera = createCamera();
			const result = camera.lookAtPoint() as IgePoint3d | undefined;
			expect(result).toBeUndefined();
		});

		it("returns this for method chaining when setting", () => {
			const camera = createCamera();
			const target = new IgePoint3d(0, 0, 0);
			const result = camera.lookAtPoint(target) as IgeCamera;
			expect(result).toBe(camera);
		});
	});

	describe("presets", () => {
		it("can apply isometric preset", () => {
			const camera = createCamera();
			camera.preset("isometric", 500);

			expect(camera.projectionType()).toBe("orthographic");
			expect(camera._preset).toBe("isometric");

			// Camera should be positioned above and looking at origin
			expect(camera._translate.y).toBeGreaterThan(0);
		});

		it("can apply isometric45 preset", () => {
			const camera = createCamera();
			camera.preset("isometric45", 500);

			expect(camera.projectionType()).toBe("orthographic");
			expect(camera._preset).toBe("isometric45");

			// Camera should be positioned at 45 degrees
			expect(camera._translate.y).toBeGreaterThan(0);
			expect(camera._translate.x).toBeGreaterThan(0);
		});

		it("can apply topDown preset", () => {
			const camera = createCamera();
			camera.preset("topDown", 500);

			expect(camera.projectionType()).toBe("orthographic");
			expect(camera._preset).toBe("topDown");

			// Camera should be directly above
			expect(camera._translate.y).toBe(500);
			expect(camera._translate.x).toBeCloseTo(0, 2);
			expect(camera._translate.z).toBeCloseTo(0, 2);
		});

		it("can apply sideScroller preset", () => {
			const camera = createCamera();
			camera.preset("sideScroller", 500);

			expect(camera.projectionType()).toBe("orthographic");
			expect(camera._preset).toBe("sideScroller");

			// Camera should be looking from the side (z axis)
			expect(camera._translate.z).toBe(500);
		});

		it("returns preset name when getting", () => {
			const camera = createCamera();
			camera.preset("isometric", 500);
			expect(camera.preset()).toBe("isometric");
		});

		it("returns this for method chaining when setting preset", () => {
			const camera = createCamera();
			const result = camera.preset("topDown", 500);
			expect(result).toBe(camera);
		});

		it("warns for unknown presets", () => {
			const camera = createCamera();
			const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

			camera.preset("unknownPreset", 500);

			expect(consoleSpy).toHaveBeenCalledWith("Unknown camera preset: unknownPreset");
			consoleSpy.mockRestore();
		});
	});

	describe("camera positioning", () => {
		it("can translate camera position", () => {
			const camera = createCamera();
			camera.translateTo(100, 200, 300);

			expect(camera._translate.x).toBe(100);
			expect(camera._translate.y).toBe(200);
			expect(camera._translate.z).toBe(300);
		});

		it("preset distance affects camera position", () => {
			const camera1 = createCamera();
			camera1.preset("isometric", 100);

			const camera2 = createCamera();
			camera2.preset("isometric", 500);

			// Camera at distance 500 should be further from origin
			const dist1 = Math.sqrt(
				camera1._translate.x * camera1._translate.x +
				camera1._translate.y * camera1._translate.y +
				camera1._translate.z * camera1._translate.z
			);

			const dist2 = Math.sqrt(
				camera2._translate.x * camera2._translate.x +
				camera2._translate.y * camera2._translate.y +
				camera2._translate.z * camera2._translate.z
			);

			expect(dist2).toBeGreaterThan(dist1);
		});
	});

	describe("method chaining", () => {
		it("supports fluent API for camera setup", () => {
			const camera = createCamera();

			// All setters should return this for chaining
			// Note: Using separate calls since TypeScript overloads make chaining difficult
			camera.projectionType("perspective");
			camera.fov(75);
			camera.near(0.5);
			camera.far(2000);

			expect(camera.projectionType()).toBe("perspective");
			expect(camera.fov()).toBe(75);
			expect(camera.near()).toBe(0.5);
			expect(camera.far()).toBe(2000);
		});

		it("supports orthographic camera setup", () => {
			const camera = createCamera();

			camera.projectionType("orthographic");
			camera.orthoSize(800);
			camera.near(0.1);
			camera.far(500);

			expect(camera.projectionType()).toBe("orthographic");
			expect(camera.orthoSize()).toBe(800);
		});
	});
});
