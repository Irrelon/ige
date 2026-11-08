import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeCanvas2dRenderer } from "@/engine/core/IgeCanvas2dRenderer";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeFontEntity } from "@/engine/core/IgeFontEntity";
import { IgeFontSheet } from "@/engine/core/IgeFontSheet";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { igeFilterBrighten } from "@/engine/filters/igeFilterBrighten";
import { igeFilterGreyScale } from "@/engine/filters/igeFilterGreyScale";
import { igeFilterInvert } from "@/engine/filters/igeFilterInvert";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

// @ts-ignore
window.ige = ige;

/**
 * 2D on WebGL: the kind of scene a Canvas 2D IGE game builds, running on
 * IgeWebGlRenderer without changes to the game code beyond the renderer
 * and camera preset:
 * - camera.preset("screen2d"): x right, y down, one unit per pixel, the
 *   camera position is the centre of the view (as in Canvas 2D);
 * - smart textures (drawn with the Canvas 2D API from each entity's own
 *   data), redrawn every frame unless the entity is cached;
 * - image sprites, 2D rotation (rotate.z), scale and nested transforms;
 * - pointer events (pointerOver / pointerOut / pointerUp) on the orbiting
 *   stars: hover to highlight, click to add a point;
 * - ?split=1: two side-by-side views of the same scene, as in a 2D
 *   split-screen game, one panned and one zoomed with the camera's scale.
 * - Canvas 2D features on the right: IgeFontEntity text (native font, bound
 *   data and a bitmap font sheet), texture filters (applied at load, applied
 *   later, and an animated pre-filter) and a composite-cached group.
 * - ?canvas=1: the same scene on IgeCanvas2dRenderer, for comparison.
 */

/** A star whose colour and point count come from the entity's data. */
const starTexture: IgeSmartTexture = {
	render (ctx: IgeCanvasRenderingContext2d, entity: IgeEntity) {
		const points = entity.data("points") || 5;
		const outer = entity._bounds2d.x2;
		const inner = outer * 0.45;
		ctx.beginPath();
		for (let i = 0; i < points * 2; i++) {
			const r = i % 2 === 0 ? outer : inner;
			const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
			ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fillStyle = entity.data("fill") || "#ffd84d";
		ctx.fill();
		ctx.lineWidth = 3;
		ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
		ctx.stroke();
	}
};

/** A health bar that redraws from the entity's data every frame. */
const barTexture: IgeSmartTexture = {
	render (ctx: IgeCanvasRenderingContext2d, entity: IgeEntity) {
		const w = entity._bounds2d.x, h = entity._bounds2d.y;
		const value = Math.max(0, Math.min(1, entity.data("value") ?? 1));
		ctx.fillStyle = "#222";
		ctx.fillRect(-w / 2, -h / 2, w, h);
		ctx.fillStyle = value > 0.3 ? "#3fbf5f" : "#d23b2b";
		ctx.fillRect(-w / 2 + 2, -h / 2 + 2, (w - 4) * value, h - 4);
		ctx.fillStyle = "#fff";
		ctx.font = "bold 12px monospace";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`${Math.round(value * 100)}%`, 0, 0);
	}
};

/** A text label: the Canvas 2D way to draw text. */
const labelTexture: IgeSmartTexture = {
	render (ctx: IgeCanvasRenderingContext2d, entity: IgeEntity) {
		ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
		ctx.font = "bold 18px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(entity.data("text") || "", 0, 0);
	}
};

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const params = new URLSearchParams(window.location.search);
		const webGl = params.get("canvas") !== "1";
		const renderer = webGl ? new IgeWebGlRenderer() : new IgeCanvas2dRenderer();
		ige.engine.renderer(renderer);
		renderer.createFrontBuffer(true);
		await renderer.setup();
		if (renderer instanceof IgeWebGlRenderer) renderer.setClearColor(0.08, 0.09, 0.12, 1);

		const fairyUrl = "../../assets/textures/sprites/fairy.png";
		const fairy = new IgeTexture("fairy", fairyUrl);
		const star = new IgeTexture("star", starTexture);
		const bar = new IgeTexture("bar", barTexture);
		const label = new IgeTexture("label", labelTexture);
		const fairyGrey = new IgeTexture("fairyGrey", fairyUrl);
		const fairyLater = new IgeTexture("fairyLater", fairyUrl);
		const fairyPulse = new IgeTexture("fairyPulse", fairyUrl);
		const fontSheet = new IgeFontSheet("verdana", "../../assets/textures/fonts/verdana_12pt.png");
		await ige.textures.whenLoaded();

		await ige.engine.start();

		const scene = new IgeScene2d().id("scene");
		const split = params.get("split") === "1";
		const views: IgeViewport[] = [];
		// Canvas 2D style view: (0, 0) is the centre of the screen, y down
		const view2d = (viewport: IgeViewport) => {
			if (webGl) viewport.camera.preset("screen2d");
			return viewport;
		};

		if (!split) {
			views.push(view2d(new IgeViewport().id("viewport").autoSize(true).scene(scene).mount(ige.engine)));
		} else {
			// Two views side by side (WebGL viewport y is measured from the bottom)
			for (let i = 0; i < 2; i++) {
				views.push(view2d(new IgeViewport().id(`viewport_${i}`).autoSize(false).scene(scene).mount(ige.engine)));
			}
			views[0].camera.translateTo(0, -120, 0); // left: panned up to the sprites
			views[1].camera.scaleTo(1.6, 1.6, 1.6); // right: zoomed in on the stars
			views[1].camera.translateTo(0, 40, 0);

			const layout = () => {
				const halfW = Math.floor(ige.engine._bounds2d.x / 2);
				views.forEach((viewport, i) => {
					viewport._bounds2d.x = halfW - 2;
					viewport._bounds2d.y = ige.engine._bounds2d.y;
					viewport._translate.x = i * (halfW + 2);
					viewport._translate.y = 0;
				});
			};
			layout();
			window.addEventListener("resize", layout);
		}

		// A row of labelled image sprites along the top (y is negative = up)
		for (let i = 0; i < 5; i++) {
			const sprite = new IgeEntity()
				.texture(fairy)
				.width(80)
				.height(80)
				.translateTo(-320 + i * 160, -220, 0)
				.mount(scene);
			new IgeEntity()
				.texture(label)
				.data("text", `fairy ${i + 1}`)
				.width(120)
				.height(24)
				.translateTo(0, 56, 0)
				.cache(true) // static text: drawn once
				.mount(sprite);
		}

		// A spinning "solar system": stars orbit a parent that rotates in 2D
		const system = new IgeEntity().translateTo(0, 40, 0).mount(scene);
		const sun = new IgeEntity()
			.texture(star)
			.data("points", 8)
			.data("fill", "#ffb43a")
			.width(120)
			.height(120)
			.mount(system);
		const colours = ["#5fd4ff", "#ff6fae", "#9dff6f", "#c58cff"];
		const orbiters: IgeEntity[] = [];
		for (let i = 0; i < colours.length; i++) {
			const angle = (i / colours.length) * Math.PI * 2;
			const orbiter = new IgeEntity()
				.texture(star)
				.data("points", 5)
				.data("fill", colours[i])
				.width(50)
				.height(50)
				.translateTo(Math.cos(angle) * 170, Math.sin(angle) * 170, 0)
				.mount(system);

			// Pointer events work as with the Canvas 2D renderer
			orbiter.pointerOver(() => orbiter.data("fill", "#ffffff"));
			orbiter.pointerOut(() => orbiter.data("fill", colours[i]));
			orbiter.pointerUp(() => orbiter.data("points", Math.min(12, orbiter.data("points") + 1)));
			orbiters.push(orbiter);
		}

		// Health bars whose value changes every frame (smart textures redraw)
		const bars: IgeEntity[] = [];
		for (let i = 0; i < 3; i++) {
			bars.push(new IgeEntity()
				.texture(bar)
				.width(220)
				.height(22)
				.translateTo(-260 + i * 260, 270, 0)
				.mount(scene));
		}

		// ------------------------------------------------------------
		// Canvas 2D features (right-hand column)
		const column = 640;
		new IgeEntity().texture(label).data("text", "Canvas 2D features").width(260).height(28)
			.translateTo(column, -280, 0).cache(true).mount(scene);

		// Text: a native font, text bound to data, and a bitmap font sheet
		new IgeFontEntity().nativeFont("bold 22px Verdana").color("#ffffff").text("IgeFontEntity text")
			.width(280).height(32).translateTo(column, -235, 0).mount(scene);
		const score = { value: 0 };
		new IgeFontEntity().nativeFont("18px Verdana").color("#9dff6f").bindData(score, "value", "Bound score: ")
			.width(280).height(28).translateTo(column, -200, 0).mount(scene);
		new IgeFontEntity().texture(fontSheet).text("Bitmap font sheet")
			.width(280).height(40).translateTo(column, -160, 0).mount(scene);

		// Filters: applied at load, applied after the texture was first
		// drawn, and a pre-filter that redraws the texture every frame
		fairyGrey.applyFilter(igeFilterGreyScale, {});
		fairyPulse.preFilter(igeFilterBrighten, { value: 0 });
		const filtered = [fairyGrey, fairyLater, fairyPulse];
		filtered.forEach((texture, i) => {
			new IgeEntity().texture(texture).width(70).height(70)
				.translateTo(column - 90 + i * 90, -90, 0).mount(scene);
		});
		new IgeEntity().texture(label).data("text", "grey | invert at 2s | pulse").width(300).height(24)
			.translateTo(column, -40, 0).cache(true).mount(scene);
		setTimeout(() => fairyLater.applyFilter(igeFilterInvert, {}), 2000);

		// A composite-cached group: Canvas 2D draws its children once into
		// one canvas; the WebGL renderer draws them as they are
		const group = new IgeEntity().width(300).height(110).translateTo(column, 50, 0).compositeCache(true).mount(scene);
		for (let i = 0; i < 4; i++) {
			new IgeEntity().texture(fairy).width(56).height(56)
				.translateTo(-105 + i * 70, -15, 0).rotateTo(0, 0, (i - 1.5) * 0.3).mount(group);
		}
		new IgeEntity().texture(label).data("text", "compositeCache group").width(260).height(24)
			.translateTo(0, 35, 0).mount(group);

		const stats = document.getElementById("stats");
		let time = 0;
		setInterval(() => { score.value += 10; }, 500);
		ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "animate2d", (_engine: unknown, tickDelta: number) => {
			const dt = (tickDelta || 16) / 1000;
			time += dt;
			system.rotateBy(0, 0, dt * 0.4); // 2D rotation: z, clockwise on screen
			sun.rotateBy(0, 0, -dt * 0.8);
			for (const orbiter of orbiters) orbiter.rotateBy(0, 0, dt * 2);
			sun.scaleTo(1 + Math.sin(time * 2) * 0.08, 1 + Math.sin(time * 2) * 0.08, 1);
			bars.forEach((b, i) => b.data("value", (Math.sin(time * (0.6 + i * 0.3)) + 1) / 2));
			fairyPulse.data("igeFilterBrighten.value", Math.round(Math.sin(time * 3) * 90));
			const draws = renderer instanceof IgeWebGlRenderer ? ` | draws ${renderer.stats().drawCalls}` : "";
			if (stats) stats.textContent = `${webGl ? "WebGL" : "Canvas 2D"} | fps ${ige.engine._fps} | views ${views.length}${draws}`;
		});
	}
}
