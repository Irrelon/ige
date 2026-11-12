import { IgeWebGlResourceManager } from "@/engine/webgl/IgeWebGlResourceManager";
import { IgeWebGlShadowManager } from "@/engine/webgl/IgeWebGlShadowManager";

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
		const shadows = new IgeWebGlShadowManager(gl, new IgeWebGlResourceManager(gl, 2), 2);
		expect(shadows.createShadowMap("sun", { size: 2048, bias: 0.002 })).toBe(true);
		expect(shadows.createPointShadowMap("lamp", { size: 256, bias: 0.01, nearPlane: 2, farPlane: 900 })).toBe(true);
		const internals = shadows as unknown as { _shadowMaps: Map<string, { depthTexture: object; size: number; bias: number }>; _pointShadowMaps: Map<string, { atlasTexture: object; faceSize: number; bias: number; nearPlane: number; farPlane: number }> };
		const before = internals._shadowMaps.get("sun")!.depthTexture, pointBefore = internals._pointShadowMaps.get("lamp")!.atlasTexture;
		// The context goes and comes back: new GPU objects, the same settings
		shadows.contextRestored(new IgeWebGlResourceManager(gl, 2));
		const sun = internals._shadowMaps.get("sun")!, lamp = internals._pointShadowMaps.get("lamp")!;
		expect(sun.size).toBe(2048);
		expect(sun.bias).toBe(0.002);
		expect(sun.depthTexture).not.toBe(before);
		expect(lamp.faceSize).toBe(256);
		expect(lamp).toMatchObject({ bias: 0.01, nearPlane: 2, farPlane: 900 });
		expect(lamp.atlasTexture).not.toBe(pointBefore);
	});
});
