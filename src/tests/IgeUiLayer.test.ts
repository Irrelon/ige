import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { igeTextBackend, igeTextTexture, releaseTextTexture, textTextureCount } from "@/engine/webgl/igeTextTexture";
import { compareUi, type IgeUiSettings, type IgeUiView, placeUi } from "@/engine/webgl/IgeUiLayout";
import { IgeUiLayer } from "@/engine/webgl/IgeUiLayer";
import { IgeUiTextLabel } from "@/engine/webgl/IgeUiTextLabel";
import { type IgeUiQuad, IgeWebGlUiPass } from "@/engine/webgl/IgeWebGlUiPass";

/** Column-major 4×4 helpers for building cameras. */
function mul (a: number[], b: number[]): number[] {
	const out = new Array(16).fill(0);
	for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
	return out;
}
function perspective (fovY: number, aspect: number, near: number, far: number): number[] {
	const f = 1 / Math.tan(fovY / 2);
	return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
}
function ortho (halfHeight: number, aspect: number): number[] {
	return [1 / (halfHeight * aspect), 0, 0, 0, 0, 1 / halfHeight, 0, 0, 0, 0, -0.001, 0, 0, 0, 0, 1];
}
/** A camera at z = `back` looking down -z. */
function translateZ (back: number): number[] {
	return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -back, 1];
}
function view (proj: number[], viewM: number[], width = 800, height = 600): IgeUiView {
	return { viewProj: new Float32Array(mul(proj, viewM)), yScale: proj[5], width, height };
}
/** A world matrix at (x, y, z), scaled `s`. */
function at (x: number, y: number, z: number, s = 1): Float32Array {
	return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, x, y, z, 1]);
}
const world = (extra: Partial<IgeUiSettings> = {}): IgeUiSettings => ({ layer: 0, space: "world", offsetX: 0, offsetY: 0, ...extra });

describe("the UI layer: where elements go", () => {
	const persp = view(perspective(Math.PI / 3, 800 / 600, 1, 5000), translateZ(0));

	it("a world element sits over its point, centred, at its world size as the camera sees it (smaller further away)", () => {
		const near = placeUi(world(), at(0, 0, -100), 40, 10, 1, 1, persp)!;
		const far = placeUi(world(), at(0, 0, -200), 40, 10, 1, 1, persp)!;
		// Straight ahead: the middle of the view
		expect(near.x + near.width / 2).toBeCloseTo(400, 3);
		expect(near.y + near.height / 2).toBeCloseTo(300, 3);
		expect(far.height).toBeCloseTo(near.height / 2, 3);
		expect(near.width / near.height).toBeCloseTo(4, 5);
		// The far one is drawn first
		expect(far.depth).toBeGreaterThan(near.depth);
		// Its world scale counts
		expect(placeUi(world(), at(0, 0, -100, 2), 40, 10, 1, 1, persp)!.height).toBeCloseTo(near.height * 2, 3);
	});

	it("with a screen size it's that many pixels tall at any distance and zoom, nudged by its offset", () => {
		const sized = world({ screenSize: 24, offsetX: 5, offsetY: -30 });
		for (const z of [-50, -400, -2000]) {
			const r = placeUi(sized, at(0, 0, z), 40, 10, 1, 1, persp)!;
			expect(r.height).toBeCloseTo(24, 5);
			expect(r.width).toBeCloseTo(96, 5);
			expect(r.x + r.width / 2).toBeCloseTo(405, 3);
			expect(r.y + r.height / 2).toBeCloseTo(270, 3);
		}
		const zoomedIn = view(ortho(50, 800 / 600), translateZ(0)), zoomedOut = view(ortho(500, 800 / 600), translateZ(0));
		expect(placeUi(sized, at(0, 0, -10), 40, 10, 1, 1, zoomedIn)!.height).toBeCloseTo(24, 5);
		expect(placeUi(sized, at(0, 0, -10), 40, 10, 1, 1, zoomedOut)!.height).toBeCloseTo(24, 5);
		// Without one, an orthographic view shows it at its world size × pixels per unit
		expect(placeUi(world(), at(0, 0, -10), 40, 10, 1, 1, zoomedIn)!.height).toBeCloseTo(10 * (600 / 100), 3);
		// ...never shorter than its least screen size, keeping its shape
		const least = placeUi(world({ minScreenSize: 30 }), at(0, 0, -10), 40, 10, 1, 1, zoomedOut)!;
		expect(least.height).toBeCloseTo(30, 5);
		expect(least.width).toBeCloseTo(120, 5);
		expect(placeUi(world({ minScreenSize: 30 }), at(0, 0, -10), 40, 10, 1, 1, zoomedIn)!.height).toBeCloseTo(60, 3);
	});

	it("isn't drawn behind the camera or off the screen", () => {
		expect(placeUi(world(), at(0, 0, 100), 40, 10, 1, 1, persp)).toBeUndefined();
		expect(placeUi(world(), at(5000, 0, -100), 40, 10, 1, 1, persp)).toBeUndefined();
		expect(placeUi(world({ screenSize: 20 }), at(0, 0, -100), 40, 10, 1, 1, { ...persp, width: 0, height: 0 })).toBeUndefined();
	});

	it("a screen element is placed in the viewport in pixels, from its edges or its middle", () => {
		const screen = (place: Partial<IgeUiSettings>): IgeUiSettings => ({ layer: 0, space: "screen", offsetX: 0, offsetY: 0, ...place });
		const any = at(0, 0, 0);
		expect(placeUi(screen({ left: 16, top: 8 }), any, 200, 50, 1, 1, persp)).toMatchObject({ x: 16, y: 8, width: 200, height: 50 });
		expect(placeUi(screen({ right: 16, bottom: 8 }), any, 200, 50, 1, 1, persp)).toMatchObject({ x: 800 - 16 - 200, y: 600 - 8 - 50 });
		// Unset axes centre it; center / middle move it from there
		expect(placeUi(screen({}), any, 200, 50, 1, 1, persp)).toMatchObject({ x: 300, y: 275 });
		expect(placeUi(screen({ center: 40, middle: -10 }), any, 200, 50, 1, 1, persp)).toMatchObject({ x: 340, y: 265 });
		// Scaled
		expect(placeUi(screen({ left: 0, top: 0 }), any, 200, 50, 0.5, 2, persp)).toMatchObject({ width: 100, height: 100 });
	});

	it("draws in layer order; within a layer the world far to near, then the screen in scene order", () => {
		const items = [
			{ id: "screenB", layer: 0, space: "screen" as const, depth: 0, order: 4 },
			{ id: "nearWorld", layer: 0, space: "world" as const, depth: 10, order: 1 },
			{ id: "top", layer: 2, space: "world" as const, depth: 50, order: 0 },
			{ id: "screenA", layer: 0, space: "screen" as const, depth: 0, order: 2 },
			{ id: "farWorld", layer: 0, space: "world" as const, depth: 90, order: 3 },
			{ id: "under", layer: -1, space: "screen" as const, depth: 0, order: 5 }
		];
		expect(items.sort(compareUi).map((i) => i.id)).toEqual(["under", "farWorld", "nearWorld", "screenA", "screenB", "top"]);
	});
});

/** A WebGL context that records what's called. */
function fakeGl () {
	const calls: string[] = [];
	const constants: Record<string, number> = { DEPTH_TEST: 2929, BLEND: 3042, SCISSOR_TEST: 3089, CULL_FACE: 2884, TRIANGLES: 4, VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, ARRAY_BUFFER: 5, DYNAMIC_DRAW: 6, FLOAT: 7, TEXTURE0: 8, TEXTURE_2D: 9, SRC_ALPHA: 10, ONE_MINUS_SRC_ALPHA: 11, LEQUAL: 12 };
	const gl = new Proxy(constants, {
		get (target, name: string) {
			if (name in target) return target[name];
			if (name === "bindVertexArray") return () => calls.push("bindVertexArray");
			return (...args: unknown[]) => {
				calls.push(`${name}(${args.map((a) => (typeof a === "number" ? a : typeof a === "object" && a ? (a as { id?: string }).id ?? "obj" : String(a))).join(",")})`);
				if (name.startsWith("create")) return {};
				if (name === "getShaderParameter" || name === "getProgramParameter") return true;
				if (name === "getAttribLocation") return 0;
				return undefined;
			};
		}
	});
	return { gl: gl as unknown as WebGL2RenderingContext, calls };
}

const textures: Record<string, WebGLTexture> = {};
function quad (texture: string, layer: number, order: number, extra: Partial<IgeUiQuad> = {}): IgeUiQuad {
	textures[texture] ??= { id: texture } as unknown as WebGLTexture;
	return { x: 10, y: 10, width: 20, height: 10, depth: 0, layer, space: "screen", order, texture: textures[texture], u0: 0, v0: 0, u1: 1, v1: 1, r: 1, g: 1, b: 1, a: 1, ...extra };
}

describe("the UI layer: drawing", () => {
	it("draws with the depth test off, on top, one draw per run of quads sharing a texture, in layer order", () => {
		const { gl, calls } = fakeGl();
		const pass = new IgeWebGlUiPass(gl);
		const drawn = pass.draw([quad("b", 1, 0), quad("a", 0, 1), quad("a", 0, 2), quad("c", 0, 3)], 0, 0, 800, 600, 2, null);
		expect(drawn).toBe(3);
		const firstDraw = calls.findIndex((c) => c.startsWith("drawArrays"));
		expect(calls.indexOf("disable(2929)")).toBeGreaterThanOrEqual(0);
		expect(calls.indexOf("disable(2929)")).toBeLessThan(firstDraw);
		expect(calls.indexOf("depthMask(false)")).toBeLessThan(firstDraw);
		// Layer 0's "a" pair in one draw, then "c", then layer 1's "b" on top
		const binds = calls.filter((c) => c.startsWith("bindTexture"));
		expect(binds).toEqual(["bindTexture(9,a)", "bindTexture(9,c)", "bindTexture(9,b)"]);
		expect(calls.filter((c) => c.startsWith("drawArrays"))).toEqual(["drawArrays(4,0,12)", "drawArrays(4,12,6)", "drawArrays(4,18,6)"]);
		// Viewport and scissor in device pixels
		expect(calls).toContain("viewport(0,0,1600,1200)");
		// A turned quad's corners turn about its middle (a quarter turn: its top left goes to the top right)
		const turned = new IgeWebGlUiPass(fakeGl().gl);
		turned.draw([quad("a", 0, 0, { x: 0, y: 0, width: 20, height: 10, rotation: Math.PI / 2 })], 0, 0, 800, 600, 1, null);
		const v = turned._data;
		expect(v[0]).toBeCloseTo(15, 5);
		expect(v[1]).toBeCloseTo(-5, 5);
		expect(calls).toContain("scissor(0,0,1600,1200)");
	});
});

describe("the UI layer: the renderer", () => {
	/** A renderer with no canvas: just enough to walk a scene and run a frame's passes. */
	function bareRenderer (): IgeWebGlRenderer {
		const r = Object.create(IgeWebGlRenderer.prototype) as Record<string, any>;
		r._sceneData = new WeakMap();
		r._uiViews = new WeakMap();
		r._uiQuads = [];
		return r as IgeWebGlRenderer;
	}

	it("UI elements (and everything under them) go to the UI layer, not the scene's passes (no shadows, no depth)", () => {
		const r = bareRenderer() as any;
		// (Mounted by hand: there's no engine running to mount with)
		const attach = <T extends IgeEntity>(child: T, parent: IgeEntity): T => {
			parent._children.push(child);
			child._parent = parent;
			return child;
		};
		const scene = new IgeEntity();
		const sprite = attach(new IgeEntity(), scene);
		const label = attach(new IgeEntity().uiLayer(3), scene);
		const child = attach(new IgeEntity(), label);
		const layer = attach(new IgeUiLayer(1), scene);
		const inLayer = attach(new IgeEntity(), layer);
		const own = attach(new IgeEntity().uiLayer(5), layer);
		for (const e of [sprite, label, child, inLayer, own]) e._texture = {} as never;
		// (No engine running here to time transforms by)
		for (const e of [sprite, label, child, layer, inLayer, own]) e.updateTransform = () => e;
		const data = { frameId: 0, models: [], sprites: [], particles: [], decals: [], ui: [], uiSettings: [] };
		r._collectRenderables(scene, data);
		expect(data.sprites).toEqual([sprite]);
		expect(data.ui).toEqual([label, child, inLayer, own]);
		expect((data.uiSettings as IgeUiSettings[]).map((s) => s.layer)).toEqual([3, 3, 1, 5]);
		// Back in the scene
		label.uiLayer(false);
		const again = { frameId: 0, models: [], sprites: [], particles: [], decals: [], ui: [], uiSettings: [] };
		r._collectRenderables(scene, again);
		expect(again.sprites).toEqual([sprite, label, child]);
	});

	it("the UI layer draws last in a frame: after every view and the post-processing", () => {
		const r = bareRenderer() as any;
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
		const viewport = { _scene: new IgeEntity(), camera: {} };
		r.renderSceneGraph({} as never, [viewport, viewport]);
		expect(order).toEqual(["view", "view", "post", "ui"]);
	});
});

describe("text textures", () => {
	/** A canvas that measures each character as 10 pixels wide and records what's drawn. */
	function fakeCanvas () {
		const drawn: string[] = [];
		const ctx: Record<string, unknown> = {
			measureText: (t: string) => ({ width: t.length * 10 }),
			fillRect: (...a: number[]) => drawn.push(`fillRect ${ctx.fillStyle} ${a.join(",")}`),
			strokeRect: (...a: number[]) => drawn.push(`strokeRect ${ctx.strokeStyle} ${a.join(",")}`),
			fillText: (t: string, x: number, y: number) => drawn.push(`fillText ${ctx.fillStyle} ${t} ${x},${y}`),
			setTransform: () => undefined
		};
		return { canvas: { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement, drawn };
	}

	const made: { id: string; destroyed: boolean }[] = [];
	let lastDrawn: string[] = [];
	beforeAll(() => {
		igeTextBackend.canvas = () => {
			const c = fakeCanvas();
			lastDrawn = c.drawn;
			return c.canvas;
		};
		igeTextBackend.texture = (id) => {
			const t = { id, destroyed: false, destroy () { this.destroyed = true; } };
			made.push(t);
			return t as never;
		};
	});

	it("are drawn once per words and style, shared, and destroyed when the last one lets go", () => {
		const before = textTextureCount();
		const a = igeTextTexture("MARKET", { font: "400 28px mono", height: 44, padding: 16, bar: { color: "#ffb347", width: 6 }, background: "rgba(4,14,24,0.55)", borderColor: "rgba(95,227,255,0.35)", borderWidth: 2, offsetX: 2, offsetY: 1 });
		const b = igeTextTexture("MARKET", { font: "400 28px mono", height: 44, padding: 16, bar: { color: "#ffb347", width: 6 }, background: "rgba(4,14,24,0.55)", borderColor: "rgba(95,227,255,0.35)", borderWidth: 2, offsetX: 2, offsetY: 1 });
		const other = igeTextTexture("MARKET", { font: "400 28px mono" });
		expect(b).toBe(a);
		expect(other).not.toBe(a);
		expect(textTextureCount()).toBe(before + 2);
		// Sized by its words: 6 letters × 10 + the bar + padding each side; 44 tall
		expect(a.width).toBe(60 + 6 + 32);
		expect(a.height).toBe(44);
		expect(a.aspect).toBeCloseTo(98 / 44, 6);
		releaseTextTexture(a);
		expect((a.texture as unknown as { destroyed: boolean }).destroyed).toBe(false);
		releaseTextTexture(b);
		expect((a.texture as unknown as { destroyed: boolean }).destroyed).toBe(true);
		expect(textTextureCount()).toBe(before + 1);
		releaseTextTexture(other);
		expect(textTextureCount()).toBe(before);
	});

	it("draw the plate, its edge, the bar and the words", () => {
		const t = igeTextTexture("BAY", { background: "#000", borderColor: "#0ff", borderWidth: 2, bar: { color: "#f00", width: 6 }, padding: 10, height: 40, color: "#0ff", offsetX: 2, offsetY: 1 });
		expect(lastDrawn).toEqual(["fillRect #000 0,0,56,40", "strokeRect #0ff 1,1,54,38", "fillRect #f00 0,0,6,40", "fillText #0ff BAY 33,21"]);
		releaseTextTexture(t);
	});

	it("a label sizes itself by its words, shares its texture, and lets it go when its words change or it's destroyed", () => {
		const before = textTextureCount();
		const one = new IgeUiTextLabel({ text: "LIFT", height: 10 });
		const two = new IgeUiTextLabel({ text: "LIFT", height: 10 });
		expect(one._texture).toBe(two._texture);
		expect(one.uiLayer()).toBe(0);
		expect(one.height()).toBe(10);
		expect(one.width()).toBeCloseTo(10 * one._labelTexture!.aspect, 6);
		expect(textTextureCount()).toBe(before + 1);
		one.text("LIFT → CONCOURSE");
		expect(textTextureCount()).toBe(before + 2);
		two.destroy();
		expect(textTextureCount()).toBe(before + 1);
		one.destroy();
		expect(textTextureCount()).toBe(before);
		// Taking its settings from a container
		expect(new IgeUiTextLabel({ text: "x", layer: false }).uiLayer()).toBeUndefined();
	});
});
