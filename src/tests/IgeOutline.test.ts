import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeWebGlOutlinePass, OUTLINE_MAX_RADIUS, outlineFragment, outlineGroups, outlineOf, outlineRect } from "@/engine/webgl/IgeWebGlOutlinePass";

/** Column-major 4×4: a camera at z = `back` looking down -z, through a perspective or an orthographic lens. */
function mul (a: number[], b: number[]): number[] {
	const out = new Array(16).fill(0);
	for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
	return out;
}
const translateZ = (back: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -back, 1];
const perspective = (fovY: number, aspect: number, near: number, far: number) => {
	const f = 1 / Math.tan(fovY / 2);
	return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
};
const ortho = (halfHeight: number, aspect: number) => [1 / (halfHeight * aspect), 0, 0, 0, 0, 1 / halfHeight, 0, 0, 0, 0, -0.001, 0, 0, 0, 0, 1];
const VIEW = { x0: 0, y0: 0, x1: 800, y1: 600 };

describe("outlines", () => {
	it("an entity's outline: set, read, cleared; fully opaque and 2 px wide unless given", () => {
		const e = new IgeEntity();
		expect(e.outline()).toBeNull();
		e.outline({ r: 0.37, g: 0.89, b: 1 });
		expect(e.outline()).toEqual({ r: 0.37, g: 0.89, b: 1, a: 1, width: 2 });
		e.outline({ r: 1, g: 0, b: 0, a: 0.5 }, 4);
		expect(e.outline()).toEqual({ r: 1, g: 0, b: 0, a: 0.5, width: 4 });
		e.outline(null);
		expect(e.outline()).toBeNull();
	});

	it("goes round the entity's children too (the nearest outlined ancestor's), and nothing else", () => {
		// (Mounted by hand: no engine running here)
		const root = new IgeEntity(), parent = new IgeEntity(), child = new IgeEntity(), other = new IgeEntity();
		parent._parent = root;
		child._parent = parent;
		other._parent = root;
		parent.outline({ r: 0, g: 0, b: 1 }, 3);
		expect(outlineOf(child)).toBe(parent.outline());
		expect(outlineOf(parent)).toBe(parent.outline());
		expect(outlineOf(other)).toBeNull();
		expect(outlineOf(root)).toBeNull();
		// Cleared: gone from them all
		parent.outline(null);
		expect(outlineOf(child)).toBeNull();
	});

	it("one mask and line per outline: items sharing one are drawn round together", () => {
		const a = { r: 0, g: 0, b: 1, a: 1, width: 3 }, b = { r: 1, g: 0, b: 0, a: 1, width: 3 };
		const groups = outlineGroups([{ outline: a }, { outline: { ...a } }, { outline: b }, { outline: null }]);
		expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
	});

	it("draws only round where the outlined things are on screen (their bounds, padded for the line), kept in the view", () => {
		const persp = mul(perspective(Math.PI / 3, 800 / 600, 1, 5000), translateZ(0));
		const r = outlineRect([0, 0, -100, 10], persp, VIEW, 5)!;
		// Centred, a small box round the sphere, padded
		expect((r.x0 + r.x1) / 2).toBeCloseTo(400, 0);
		expect((r.y0 + r.y1) / 2).toBeCloseTo(300, 0);
		expect(r.x1 - r.x0).toBeGreaterThan(10);
		expect(r.x1 - r.x0).toBeLessThan(200);
		// Further off: smaller
		const far = outlineRect([0, 0, -400, 10], persp, VIEW, 5)!;
		expect(far.x1 - far.x0).toBeLessThan(r.x1 - r.x0);
		// The same number of pixels at any zoom: the pad is pixels, not world units
		const o1 = outlineRect([0, 0, -50, 10], mul(ortho(100, 800 / 600), translateZ(0)), VIEW, 0)!;
		const o2 = outlineRect([0, 0, -50, 10], mul(ortho(100, 800 / 600), translateZ(0)), VIEW, 8)!;
		expect((o2.x1 - o2.x0) - (o1.x1 - o1.x0)).toBe(16);
		// Off screen: nothing to draw; behind the camera: the whole view (to be safe)
		expect(outlineRect([5000, 0, -100, 10], persp, VIEW, 5)).toBeUndefined();
		expect(outlineRect([0, 0, 50, 10], persp, VIEW, 5)).toEqual(VIEW);
		// Kept inside a split-screen view
		const right = { x0: 400, y0: 0, x1: 800, y1: 600 };
		const big = outlineRect([0, 0, -20, 50], persp, right, 5)!;
		expect(big.x0).toBeGreaterThanOrEqual(400);
		expect(big.x1).toBeLessThanOrEqual(800);
	});

	it("the line's shader searches exactly its width (one program per width, capped)", () => {
		expect(outlineFragment(3)).toContain("#define R 3");
		expect(outlineFragment(0)).toContain("#define R 1");
		expect(outlineFragment(99)).toContain(`#define R ${OUTLINE_MAX_RADIUS}`);
		// GLSL ES 1.00 (WebGL 1 and 2): no version line, gl_FragColor
		expect(outlineFragment(3)).not.toContain("#version");
		expect(outlineFragment(3)).toContain("gl_FragColor");
	});

	it("drawn over the finished frame: after every view and the post-processing, under the UI layer; nothing outlined, nothing done", () => {
		const r = Object.create(IgeWebGlRenderer.prototype) as Record<string, any>;
		r._sceneData = new WeakMap();
		r._uiViews = new WeakMap();
		const order: string[] = [];
		r._canvasContext = new Proxy({}, { get: () => () => undefined });
		r._stateManager = { reset: () => undefined, setScissorTest: () => undefined };
		r._canvasElement = { width: 800, height: 600 };
		r._stats = {};
		r._clearColor = { r: 0, g: 0, b: 0, a: 1 };
		r._frameId = 0;
		r._skeletonRows = new Map();
		r._shadowCastingPointLights = [];
		r._postProcessor = () => ({ begin: () => true, end: () => order.push("post"), depthRange: () => undefined, bindTarget: () => undefined });
		r._collectRenderables = () => undefined;
		r._renderSharedShadowMap = () => undefined;
		r._renderViewport = () => order.push("view");
		r._renderUiLayer = () => order.push("ui");
		const draw = r._renderOutlines;
		r._renderOutlines = function (this: unknown) {
			order.push("outlines");
			return draw.call(this);
		};
		const viewport = { _scene: new IgeEntity(), camera: {} };
		r.renderSceneGraph({} as never, [viewport, viewport]);
		expect(order).toEqual(["view", "view", "post", "outlines", "ui"]);
		// Nothing outlined: no pass made at all
		expect(r._outlinePass).toBeUndefined();
	});

	it("a lost context: its handles forgotten (no calls on the dead context), made again on next use", () => {
		const dead = new Proxy({}, { get: () => { throw new Error("touched the lost context"); } }) as unknown as WebGLRenderingContext;
		const pass = new IgeWebGlOutlinePass(dead);
		pass._texture = {} as WebGLTexture;
		pass._framebuffer = {} as WebGLFramebuffer;
		pass._width = 800;
		pass.contextLost();
		expect(pass._framebuffer).toBeNull();
		expect(pass._texture).toBeNull();
		expect(pass._width).toBe(0);
	});
});
