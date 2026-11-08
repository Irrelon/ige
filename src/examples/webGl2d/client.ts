import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
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
 * - image sprites, 2D rotation (rotate.z), scale and nested transforms.
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
		const renderer = new IgeWebGlRenderer();
		ige.engine.renderer(renderer);
		renderer.createFrontBuffer(true);
		await renderer.setup();
		renderer.setClearColor(0.08, 0.09, 0.12, 1);

		const fairy = new IgeTexture("fairy", "../../assets/textures/sprites/fairy.png");
		const star = new IgeTexture("star", starTexture);
		const bar = new IgeTexture("bar", barTexture);
		const label = new IgeTexture("label", labelTexture);
		await ige.textures.whenLoaded();

		await ige.engine.start();

		const scene = new IgeScene2d().id("scene");
		const viewport = new IgeViewport().id("viewport").autoSize(true).scene(scene).mount(ige.engine);

		// Canvas 2D style view: (0, 0) is the centre of the screen, y down
		viewport.camera.preset("screen2d");

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
			orbiters.push(new IgeEntity()
				.texture(star)
				.data("points", 5)
				.data("fill", colours[i])
				.width(50)
				.height(50)
				.translateTo(Math.cos(angle) * 170, Math.sin(angle) * 170, 0)
				.mount(system));
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

		const stats = document.getElementById("stats");
		let time = 0;
		ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "animate2d", (_engine: unknown, tickDelta: number) => {
			const dt = (tickDelta || 16) / 1000;
			time += dt;
			system.rotateBy(0, 0, dt * 0.4); // 2D rotation: z, clockwise on screen
			sun.rotateBy(0, 0, -dt * 0.8);
			for (const orbiter of orbiters) orbiter.rotateBy(0, 0, dt * 2);
			sun.scaleTo(1 + Math.sin(time * 2) * 0.08, 1 + Math.sin(time * 2) * 0.08, 1);
			bars.forEach((b, i) => b.data("value", (Math.sin(time * (0.6 + i * 0.3)) + 1) / 2));
			if (stats) stats.textContent = `fps ${ige.engine._fps} | draws ${renderer.stats().drawCalls}`;
		});
	}
}
