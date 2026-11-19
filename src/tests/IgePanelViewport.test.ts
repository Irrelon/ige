import { IgePanelViewport, igePanelRect, type IgePanelLayout } from "@/engine/core/IgePanelViewport";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/instance";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgePanelTargets } from "@/engine/webgl/IgePanelTarget";
import { igeSceneChange } from "@/engine/utils/sceneChange";

describe("igePanelRect", () => {
	it("places a panel by right and bottom in CSS pixels", () => {
		expect(igePanelRect({ right: 16, bottom: 16, width: 320, height: 180 }, 1280, 720)).toEqual({ x: 944, y: 524, width: 320, height: 180 });
	});

	it("takes fractions of the canvas, width for horizontal values and height for vertical ones", () => {
		expect(igePanelRect({ left: "10%", top: "50%", width: "25%", height: "20%" }, 1000, 600)).toEqual({ x: 100, y: 300, width: 250, height: 120 });
	});

	it("derives the missing side from the aspect", () => {
		expect(igePanelRect({ left: 0, top: 0, width: "30%", aspect: 2 }, 1000, 600)).toEqual({ x: 0, y: 0, width: 300, height: 150 });
		expect(igePanelRect({ left: 0, top: 0, height: 100, aspect: 2 }, 1000, 600)).toEqual({ x: 0, y: 0, width: 200, height: 100 });
	});

	it("fills between left and right, and top and bottom", () => {
		expect(igePanelRect({ left: 20, right: 30, top: 10, bottom: 10 }, 400, 300)).toEqual({ x: 20, y: 10, width: 350, height: 280 });
	});

	it("follows the canvas size and never leaves it", () => {
		const layout: IgePanelLayout = { right: 10, bottom: 10, width: "50%", aspect: 1 };
		expect(igePanelRect(layout, 400, 400)).toEqual({ x: 190, y: 190, width: 200, height: 200 });
		expect(igePanelRect(layout, 800, 200)).toEqual({ x: 390, y: 0, width: 400, height: 200 });
		expect(igePanelRect({ width: 5000, height: -3 }, 400, 300)).toEqual({ x: 0, y: 0, width: 400, height: 0 });
	});
});

describe("IgePanelViewport", () => {
	beforeAll(() => {
		// The panel's viewport wants an engine to exist (it's never mounted to it)
		(ige as any).engine = { _bounds2d: new IgePoint2d(800, 600), _tickDelta: 16, _currentTime: 0, _tickStart: 0 };
	});

	it("starts hidden and shows and hides", () => {
		const panel = new IgePanelViewport();
		expect(panel.visible()).toBe(false);
		const before = igeSceneChange.count;
		panel.show();
		expect(panel.visible()).toBe(true);
		expect(igeSceneChange.count).toBeGreaterThan(before);
		panel.hide();
		expect(panel.visible()).toBe(false);
	});

	it("cuts between its cameras by name or by camera, only marking a change when it switches", () => {
		const panel = new IgePanelViewport();
		const main = panel.camera;
		const side = panel.newCamera("side");
		expect(panel.camera).toBe(main);
		panel.cut("side");
		expect(panel.camera).toBe(side);
		expect(panel.viewport.camera).toBe(side);

		const count = igeSceneChange.count;
		panel.cut(side);
		expect(igeSceneChange.count).toBe(count);
		panel.cut(main);
		expect(panel.camera).toBe(main);
		expect(() => panel.cut("nope")).toThrow();
	});

	it("keeps lights of its own", () => {
		const a = new IgePanelViewport();
		const b = new IgePanelViewport();
		expect(a.lights).not.toBe(b.lights);
		expect(a.shadowId).not.toBe(b.shadowId);
	});

	it("places its viewport on the canvas, y measured from the bottom, and skips a panel with no scene or no area", () => {
		const panel = new IgePanelViewport({ right: 10, bottom: 20, width: 200, height: 100 });
		expect(panel._prepare(1000, 800, 16)).toBe(false);
		panel.scene({ _parent: undefined, update: jest.fn() } as any);
		expect(panel._prepare(1000, 800, 16)).toBe(true);
		const vp = panel.viewport;
		expect([vp._translate.x, vp._translate.y, vp._bounds2d.x, vp._bounds2d.y]).toEqual([790, 20, 200, 100]);
		panel.layout({ width: 0, height: 10 });
		expect(panel._prepare(1000, 800, 16)).toBe(false);
	});
});

describe("IgePanelViewport: the renderer", () => {
	/** A renderer with no canvas that records the order of a frame's passes. */
	function frame (shown: boolean[], opts: { views?: boolean; device?: any; fogs?: Array<any> } = {}) {
		const r = Object.create(IgeWebGlRenderer.prototype) as any;
		const order: string[] = [];
		r._sceneData = new WeakMap();
		r._uiViews = new WeakMap();
		r._panels = [];
		r._canvasContext = new Proxy({}, { get: () => () => undefined });
		r._stateManager = { reset: () => undefined, setScissorTest: () => undefined };
		r._canvasElement = { width: 800, height: 600 };
		r._bounds2d = new IgePoint2d(800, 600);
		r._stats = {};
		r._clearColor = { r: 0, g: 0, b: 0, a: 1 };
		r._frameId = 0;
		r._devicePixelRatio = 1;
		r._fog = { mode: "linear", color: { r: 1, g: 1, b: 1 }, near: 1, far: 2, density: 0.1 };
		r._device = opts.device;
		r._skeletonRows = new Map();
		r._shadowCastingPointLights = [];
		r._postProcessor = () => ({ begin: () => true, end: () => order.push("post"), depthRange: () => undefined, bindTarget: () => undefined });
		r._collectRenderables = () => undefined;
		r._renderSharedShadowMap = () => undefined;
		r._renderOutlines = () => order.push("outlines");
		r._renderUiLayer = () => order.push("ui");
		r._renderOverlays = () => order.push("overlays");
		const lightsSeen: unknown[] = [];
		const fogsSeen: any[] = [];
		const targetsSeen: any[] = [];
		r._renderViewport = (vp: any) => {
			order.push(vp.name ?? "view");
			lightsSeen.push(r._lightManager);
			fogsSeen.push(r._fog);
			targetsSeen.push(r._panelTarget);
		};
		const panels = shown.map((on, i) => {
			const panel = new IgePanelViewport({ left: 0, top: 0, width: 100, height: 100 });
			(panel.viewport as any).name = `panel${i}`;
			panel.scene(new IgeEntity() as any);
			(panel.viewport._scene as any).update = jest.fn();
			if (on) panel.show();
			if (opts.fogs?.[i]) panel.fog(opts.fogs[i]);
			r.addPanel(panel);
			return panel;
		});
		const mainLights = {};
		r._lightManager = mainLights;
		const mainFog = r._fog;
		r.renderSceneGraph({} as never, opts.views === false ? [] : [{ _scene: new IgeEntity(), camera: {} }]);
		return { r, order, panels, lightsSeen, mainLights, fogsSeen, targetsSeen, mainFog };
	}

	beforeAll(() => {
		(ige as any).engine = { _bounds2d: new IgePoint2d(800, 600), _tickDelta: 16, _currentTime: 0, _tickStart: 0 };
	});

	it("draws shown panels after the views, their post-processing, outlines and UI layer, in the order added, and before the overlays", () => {
		const { order } = frame([true, true]);
		expect(order).toEqual(["view", "post", "outlines", "ui", "panel0", "panel1", "overlays"]);
	});

	it("does nothing at all for a hidden panel", () => {
		const { order, panels } = frame([false, true, false]);
		expect(order).toEqual(["view", "post", "outlines", "ui", "panel1", "overlays"]);
		expect((panels[0].viewport._scene as any).update).not.toHaveBeenCalled();
		expect((panels[1].viewport._scene as any).update).toHaveBeenCalled();
	});

	it("draws each panel with its own lights and puts the main view's back after", () => {
		const { r, lightsSeen, panels, mainLights } = frame([true, true]);
		expect(lightsSeen).toEqual([mainLights, panels[0].lights, panels[1].lights]);
		expect(r._lightManager).toBe(mainLights);
		expect(r._inPanel).toBe(false);
	});

	it("takes a panel away", () => {
		const { r, panels } = frame([true]);
		r.removePanel(panels[0]);
		expect(r.panels()).toEqual([]);
	});
	it("swaps in each panel's own fog for its pass (none when it has none) and puts the renderer's back", () => {
		const own = { mode: "exp2", density: 0.5 };
		const { r, fogsSeen, mainFog } = frame([true, true], { fogs: [own, null] });
		expect(fogsSeen[0]).toBe(mainFog);
		expect(fogsSeen[1]).toMatchObject({ mode: "exp2", density: 0.5 });
		expect(fogsSeen[2].mode).toBe("none");
		expect(r._fog).toBe(mainFog);
	});

	it("draws shown panels with no main viewport, and nothing without them", () => {
		const shown = frame([true, false], { views: false });
		expect(shown.order).toEqual(["post", "outlines", "ui", "panel0", "overlays"]);
		const none = frame([false], { views: false });
		expect(none.order).toEqual(["post"]);
		expect(frame([], { views: false }).order).toEqual(["post"]);
	});

	it("draws each shown panel into its own target, composites it, and frees it when the panel is removed", () => {
		const device = fakeDevice();
		const { r, panels, targetsSeen } = frame([true, false, true], { device });
		expect(targetsSeen[0]).toBeFalsy();
		expect(targetsSeen[1]).toBeTruthy();
		expect(targetsSeen[2]).toBeTruthy();
		expect(targetsSeen[1]).not.toBe(targetsSeen[2]);
		expect(targetsSeen[1].width).toBe(100);
		expect(r._panelTargets.count).toBe(2);
		expect(device.copies).toBe(2);
		expect(r._panelTarget).toBeNull();
		const live = device.live();
		r.removePanel(panels[0]);
		expect(r._panelTargets.count).toBe(1);
		expect(device.live()).toBeLessThan(live);
	});

	it("hands a panel's effect its pixels and rectangle instead of the plain copy", () => {
		const device = fakeDevice();
		const apply = jest.fn();
		const r = frame([true], { device }).r;
		const panel = r.panels()[0];
		panel.effect = { depth: true, apply };
		r._visiblePanels = [panel];
		r._renderPanels();
		expect(apply).toHaveBeenCalledTimes(1);
		const [dev, rect, source] = apply.mock.calls[0];
		expect(dev).toBe(device);
		expect(rect).toEqual({ x: 0, y: 500, width: 100, height: 100 });
		expect(source.color).toBeTruthy();
		expect(source.depth).toBeTruthy();
		expect([source.width, source.height]).toEqual([100, 100]);
	});

	it("makes the target again after a context loss", () => {
		const device = fakeDevice();
		const { r } = frame([true], { device });
		const first = r._panelTargets.get(r.panels()[0]);
		r._panelTargets.contextLost();
		expect(r._panelTargets.count).toBe(0);
		r._visiblePanels = [r.panels()[0]];
		r._renderPanels();
		expect(r._panelTargets.get(r.panels()[0])).not.toBe(first);
	});
});

/** A device that counts what's made and freed and what's drawn (no GPU). */
function fakeDevice (maxSamples = 4) {
	let made = 0;
	let freed = 0;
	const d: any = {
		limits: { maxSamples },
		copies: 0,
		live: () => made - freed,
		surface: () => ({ kind: "surface", width: 800, height: 600 }),
		createTexture: (desc: any) => (made++, { kind: "texture", ...desc }),
		destroyTexture: () => void freed++,
		createShaderModule: () => ({}),
		destroyShaderModule: () => undefined,
		createRenderPipeline: () => ({}),
		resolveTexture: () => undefined,
		invalidate: () => undefined,
		release: () => undefined,
		beginRenderPass: () => ({
			setViewport: () => undefined, setScissorRect: () => undefined, setPipeline: () => undefined, setTexture: () => undefined,
			draw: () => void d.copies++, end: () => undefined
		})
	};
	return d;
}

describe("IgePanelTargets", () => {
	it("makes a target at the panel's size, keeps it, makes it again when the size changes, and frees it", () => {
		const device = fakeDevice();
		const targets = new IgePanelTargets(device);
		const panel = {};
		const a = targets.ensure(panel, 320, 180, false);
		expect([a.width, a.height, a.multisampled]).toEqual([320, 180, true]);
		expect(targets.ensure(panel, 320, 180, false)).toBe(a);
		const made = device.live();
		const b = targets.ensure(panel, 640, 360, false);
		expect(b).not.toBe(a);
		expect(b.renderColor.width).toBe(640);
		expect(device.live()).toBe(made);
		targets.free(panel);
		expect(device.live()).toBe(0);
		expect(targets.count).toBe(0);
	});

	it("draws straight into the readable textures when the GPU has no multisampling, and makes depth only when asked", () => {
		const device = fakeDevice(0);
		const targets = new IgePanelTargets(device);
		const t = targets.ensure({}, 64, 64, false);
		expect(t.multisampled).toBe(false);
		expect(t.renderColor).toBe(t.color);
		expect(t.depth).toBeNull();
		const p = {};
		const u = targets.ensure(p, 64, 64, true);
		expect(u.depth).toBe(u.renderDepth);
		expect(targets.ensure(p, 64, 64, false).depth).toBeNull();
	});
});
