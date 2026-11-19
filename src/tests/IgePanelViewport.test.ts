import { IgePanelViewport, igePanelRect, type IgePanelLayout } from "@/engine/core/IgePanelViewport";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { ige } from "@/engine/instance";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
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
	function frame (shown: boolean[]) {
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
		r._skeletonRows = new Map();
		r._shadowCastingPointLights = [];
		r._postProcessor = () => ({ begin: () => true, end: () => order.push("post"), depthRange: () => undefined, bindTarget: () => undefined });
		r._collectRenderables = () => undefined;
		r._renderSharedShadowMap = () => undefined;
		r._renderOutlines = () => order.push("outlines");
		r._renderUiLayer = () => order.push("ui");
		r._renderOverlays = () => order.push("overlays");
		const lightsSeen: unknown[] = [];
		r._renderViewport = (vp: any) => {
			order.push(vp.name ?? "view");
			lightsSeen.push(r._lightManager);
		};
		const panels = shown.map((on, i) => {
			const panel = new IgePanelViewport({ left: 0, top: 0, width: 100, height: 100 });
			(panel.viewport as any).name = `panel${i}`;
			panel.scene(new IgeEntity() as any);
			(panel.viewport._scene as any).update = jest.fn();
			if (on) panel.show();
			r.addPanel(panel);
			return panel;
		});
		const mainLights = {};
		r._lightManager = mainLights;
		r.renderSceneGraph({} as never, [{ _scene: new IgeEntity(), camera: {} }]);
		return { r, order, panels, lightsSeen, mainLights };
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
});
