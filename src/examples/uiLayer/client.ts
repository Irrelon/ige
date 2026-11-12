import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import type { IgeTextStyle } from "@/engine/webgl/igeTextTexture";
import { IgeUiTextLabel } from "@/engine/webgl/IgeUiTextLabel";
import type { IgeCanInit } from "@/types/IgeCanInit";

// @ts-ignore
window.ige = ige;

/** A HUD-like style: cyan words on a see-through plate with a coloured bar. */
const tag = (bar: string): IgeTextStyle => ({
	font: "500 26px ui-monospace, monospace",
	letterSpacing: "3px",
	color: "rgba(95, 227, 255, 0.95)",
	background: "rgba(4, 14, 24, 0.6)",
	borderColor: "rgba(95, 227, 255, 0.35)",
	borderWidth: 2,
	height: 42,
	padding: 14,
	bar: { color: bar, width: 6 },
	offsetX: 2,
	resolution: 2
});

/**
 * The WebGL renderer's UI layer (guides/ui-layer.md): labels over moving
 * cubes that stay on top of everything (a wall passes in front of them and
 * never hides their labels), one the same size on screen at any distance and
 * one at its world size, and a panel pinned to the screen's top left.
 * Press 1 to fade the labels, 2 to put them back in the scene (so the wall
 * covers them) and back.
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const renderer = new IgeWebGlRenderer();
		ige.engine.renderer(renderer);
		await renderer.setup();
		renderer.createFrontBuffer(true);
		await ige.engine.start();

		const scene = new IgeScene2d().id("scene");
		const viewport = new IgeViewport().id("view").autoSize(true).scene(scene).mount(ige.engine);
		const camera = viewport.camera;
		camera.projectionType("perspective");
		camera.fov(55);
		camera.near(1);
		camera.far(5000);
		camera.translateTo(0, 160, 520);
		camera.rotateTo(-0.28, 0, 0);

		const lights = renderer.lightManager!;
		const ambient = new IgeAmbientLight();
		ambient.intensity(0.6);
		ambient.mount(scene);
		lights.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.intensity(1.1);
		sun.direction(-0.4, -0.8, -0.5);
		sun.mount(scene);
		lights.addLight(sun);

		// Cubes circling the middle, each with a label over it
		const cube = IgePrimitiveGeometry.createCube(50, "ui_cube");
		const colours = ["#ff6b6b", "#ffb347", "#6cf29a", "#5fe3ff", "#c58bff"];
		const names = ["HAULER", "MINER", "PATROL", "TUG", "COURIER"];
		const labels: IgeUiTextLabel[] = [];
		colours.forEach((colour, i) => {
			const e = new IgeEntity().id(`cube${i}`);
			e._geometryData = { ...cube, id: `ui_cube_${i}` };
			const rgb = parseInt(colour.slice(1), 16);
			e.material({ color: { r: (rgb >> 16) / 255, g: ((rgb >> 8) & 255) / 255, b: (rgb & 255) / 255, a: 1 } });
			e.mount(scene);
			// A label 18 pixels tall wherever the cube is, just above it (the last one at its world size instead)
			const label = new IgeUiTextLabel({ text: names[i], style: tag(colour), height: 16 }).translateTo(0, 55, 0).mount(e) as IgeUiTextLabel;
			if (i < colours.length - 1) label.uiScreenSize(18).uiOffset(0, -6);
			labels.push(label);
			let a = (i / colours.length) * Math.PI * 2;
			e.addBehaviour(IgeBehaviourType.preUpdate, "circle", () => {
				a += 0.004 + i * 0.0007;
				e.translateTo(Math.cos(a) * (180 + i * 40), 25, Math.sin(a) * (180 + i * 40));
				e.rotateTo(0, a * 2, 0);
			});
		});

		// A wall sweeping through: it covers the cubes, never their labels
		const wall = new IgeEntity().id("wall");
		wall._geometryData = { ...IgePrimitiveGeometry.createCube(1, "ui_wall"), id: "ui_wall" };
		wall.material({ color: { r: 0.25, g: 0.3, b: 0.38, a: 1 } });
		wall.scaleTo(30, 160, 360).mount(scene);
		let w = 0;
		wall.addBehaviour(IgeBehaviourType.preUpdate, "sweep", () => {
			w += 0.006;
			wall.translateTo(Math.sin(w) * 320, 80, 40);
		});

		// A panel pinned to the screen's top left (screen pixels), in a layer above the labels
		new IgeUiTextLabel({ text: "UI LAYER · 1 FADE · 2 SCENE / UI", style: tag("#ffffff"), height: 34, layer: 1 })
			.uiScreen({ left: 16, top: 16 })
			.mount(scene);

		let faded = false, inScene = false;
		window.addEventListener("keydown", (e) => {
			if (e.key === "1") {
				faded = !faded;
				for (const l of labels) l.opacity(faded ? 0.35 : 1);
			}
			if (e.key === "2") {
				inScene = !inScene;
				for (const l of labels) l.uiLayer(inScene ? false : 0);
			}
		});
	}
}
