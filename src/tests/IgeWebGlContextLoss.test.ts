import { IgeWebGlShadowManager } from "@/engine/webgl/IgeWebGlShadowManager";
import { IgeWebGl2GpuDevice } from "@/engine/gpu/IgeWebGl2GpuDevice";

/** A stand-in WebGL 2 context: every constant is 1, every create* hands back a new token, framebuffers are always complete. */
function mockGl (): WebGL2RenderingContext {
	let n = 0;
	return new Proxy({}, {
		get: (_t, prop: string) => {
			if (/^[A-Z0-9_]+$/.test(prop)) return 1;
			if (prop === "checkFramebufferStatus") return () => 1;
			if (prop === "getExtension") return () => ({});
			if (prop === "getParameter") return () => 4096;
			if (prop.startsWith("create")) return () => ({ token: ++n });
			return () => undefined;
		}
	}) as unknown as WebGL2RenderingContext;
}

describe("losing the WebGL context", () => {
	it("makes every shadow map again at its size and bias when the context comes back", () => {
		const gl = mockGl();
		const device = new IgeWebGl2GpuDevice(gl);
		const shadows = new IgeWebGlShadowManager(device);
		expect(shadows.createShadowMap("sun", { size: 2048, bias: 0.002 })).toBe(true);
		expect(shadows.createPointShadowMap("lamp", { size: 256, bias: 0.01, nearPlane: 2, farPlane: 900 })).toBe(true);
		const internals = shadows as unknown as { _shadowMaps: Map<string, { depth: object; size: number; bias: number }>; _pointShadowMaps: Map<string, { atlas: object; faceSize: number; bias: number; nearPlane: number; farPlane: number }> };
		const before = internals._shadowMaps.get("sun")!.depth, pointBefore = internals._pointShadowMaps.get("lamp")!.atlas;
		// The context goes and comes back: new textures, the same settings
		device.lost = true;
		device.restore();
		shadows.contextRestored();
		const sun = internals._shadowMaps.get("sun")!, lamp = internals._pointShadowMaps.get("lamp")!;
		expect(sun.size).toBe(2048);
		expect(sun.bias).toBe(0.002);
		expect(sun.depth).not.toBe(before);
		expect(lamp.faceSize).toBe(256);
		expect(lamp).toMatchObject({ bias: 0.01, nearPlane: 2, farPlane: 900 });
		expect(lamp.atlas).not.toBe(pointBefore);
	});
});
