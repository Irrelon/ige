import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeCamera } from "@/engine/core/IgeCamera";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { IgeAmbientLight, IgeDirectionalLight, IgePointLight } from "@/engine/webgl/IgeWebGlLight";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgeBehaviourType } from "@/enums";
import type { IgeMaterialData } from "@/types/IgeMaterialData";

// @ts-ignore
window.ige = ige;

/** Anisotropic filtering levels A steps through (each capped at what the GPU allows). */
const ANISO_STEPS = [1, 4, 16];

/** The spheres' materials: plastics, metals and greys, given as a game gives colours (sRGB, hex or 0 to 1). */
const SPHERES: { name: string; material: IgeMaterialData }[] = [
	{ name: "red plastic", material: { color: "#c0392b", metallic: 0, roughness: 0.35 } },
	{ name: "blue, rough", material: { color: "#2e86de", metallic: 0, roughness: 0.85 } },
	{ name: "mid grey", material: { color: "#808080", metallic: 0, roughness: 0.6 } },
	{ name: "white", material: { color: "#f2f2f2", metallic: 0, roughness: 0.5 } },
	{ name: "gold", material: { color: { r: 1, g: 0.78, b: 0.34, a: 1 }, metallic: 1, roughness: 0.3 } },
	{ name: "steel", material: { color: "#b8bcc2", metallic: 1, roughness: 0.55 } }
];

/**
 * Linear Lighting Example
 *
 * A paved square seen at a grazing angle, a row of PBR spheres, the Khronos SciFi Helmet (glTF, sRGB colour and
 * emissive maps) and three coloured lights, to compare:
 *
 * - L: linear lighting on / off (renderer.linearLighting()): colour maps decoded from sRGB, colours converted to linear
 *   light, lit in linear light and encoded for the screen once.
 * - A: anisotropic filtering 1 (off), 4, 16 (renderer.anisotropy(), capped at the GPU's most): the paving stays sharp
 *   into the distance instead of blurring.
 * - P: post-processing (ACES tone mapping and a little bloom) on / off: linear light encoded in its composite, or at
 *   the end of each shader without it.
 * - V: the low, grazing view or the view from above.
 *
 * Stains on the paving (multiply-blended decals) and a small fire (additive particles) show the effect shaders under
 * linear lighting too.
 *
 * URL options for stills: ?linear=0|1, ?aniso=1|4|16, ?post=0|1, ?view=grazing|above, ?helmet=0, ?still=1 (the fire
 * held at one moment).
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	scene?: IgeScene2d;
	camera?: IgeCamera;
	viewport?: IgeViewport;
	renderer?: IgeWebGlRenderer;

	linear = true;
	aniso = 16;
	post = true;
	view: "grazing" | "above" = "grazing";
	still = false;

	constructor () {
		super();
		void this.init();
	}

	async init () {
		try {
			const params = new URLSearchParams(window.location.search);
			this.linear = params.get("linear") !== "0";
			this.aniso = Number(params.get("aniso") ?? 16) || 1;
			this.post = params.get("post") !== "0";
			this.view = params.get("view") === "above" ? "above" : "grazing";
			this.still = params.get("still") === "1";

			this.renderer = new IgeWebGlRenderer();
			ige.engine.renderer(this.renderer);
			await this.renderer.setup();
			this.renderer.createFrontBuffer(true);
			await ige.engine.start();

			this.setupScene();
			this.setupLights();
			this.setupGround();
			this.setupSpheres();
			this.setupEffects();
			if (params.get("helmet") !== "0") await this.loadHelmet();
			this.setupKeys();
			this.apply();

			document.querySelectorAll(".igeLoading").forEach((e) => ((e as HTMLElement).style.display = "none"));
			this.setText("status", "Ready");
			setInterval(() => this.updateReadout(), 250);
		} catch (error) {
			this.log(`Error initializing: ${error}`, "error");
			this.setText("status", `Error: ${error}`);
		}
	}

	setupScene () {
		this.scene = new IgeScene2d();
		this.scene.id("mainScene");
		this.viewport = new IgeViewport();
		this.viewport.id("mainViewport").autoSize(true).scene(this.scene);
		this.camera = this.viewport.camera;
		this.camera.projectionType("perspective");
		this.camera.fov(45);
		this.camera.near(1);
		this.camera.far(6000);
		this.viewport.mount(ige.engine);

		const renderer = this.renderer!;
		// The sky: the clear colour and the fog, given in sRGB like every colour a game sets
		const sky = { r: 0.62, g: 0.71, b: 0.82 };
		renderer.setClearColor(sky.r, sky.g, sky.b, 1);
		renderer.fog({ mode: "linear", color: sky, near: 1600, far: 4800 });
		renderer.pbr(true);
	}

	placeCamera () {
		if (!this.camera) return;
		if (this.view === "above") {
			this.camera.translateTo(0, 650, 1700);
			this.camera._lookAt = new IgePoint3d(0, 0, 700);
		} else {
			// Low over the paving, looking along it: the slabs are seen almost edge on far ahead, where trilinear
			// filtering blurs them and anisotropic filtering keeps their joints
			this.camera.translateTo(0, 34, 1250);
			this.camera._lookAt = new IgePoint3d(0, 0, -1200);
		}
	}

	setupLights () {
		const renderer = this.renderer!;
		const lightManager = renderer.lightManager;
		if (!this.scene || !lightManager) return;

		// Hemisphere ambient: blue sky from above, warm ground from below
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.55, 0.62, 0.75);
		ambient.groundColor(0.3, 0.25, 0.2);
		ambient.intensity(0.55);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);

		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.94, 0.84);
		sun.intensity(1.25);
		sun.direction(-0.45, -0.55, -0.7);
		sun.mount(this.scene);
		lightManager.addLight(sun);
		renderer.enableShadows(sun, 2048);

		// Two coloured lamps by the spheres: where their light overlaps it should add up to a soft white
		const lamp = (x: number, z: number, r: number, g: number, b: number) => {
			const light = new IgePointLight();
			light.lightColor(r, g, b);
			light.intensity(1.6);
			light.range(420);
			light.decay(2);
			light.translateTo(x, 70, z);
			light.mount(this.scene!);
			lightManager.addLight(light);
		};
		lamp(-170, 820, 1, 0.45, 0.2);
		lamp(170, 820, 0.2, 0.6, 1);
	}

	/** The paving: a texture drawn here (no image to license), repeated across a long strip so it reaches the horizon. */
	setupGround () {
		if (!this.scene) return;
		const texture = new IgeTexture("linearLightingPaving");
		texture._setImage(drawPaving() as any);
		const width = 1400, length = 7000, tile = 70;
		new IgeEntity()
			.id("ground")
			.geometry(IgePrimitiveGeometry.createPlane(width, length, "linearLightingGround"))
			.texture(texture)
			.material({ color: { r: 1, g: 1, b: 1, a: 1 }, metallic: 0, roughness: 0.92, uvScale: { u: width / tile, v: length / tile } })
			.rotateTo(-Math.PI / 2, 0, 0)
			.translateTo(0, 0, -1800)
			.mount(this.scene);
	}

	setupSpheres () {
		if (!this.scene) return;
		const geometry = IgePrimitiveGeometry.createSphere(38, 48, 32, "linearLightingSphere");
		SPHERES.forEach((s, i) => {
			new IgeEntity()
				.id(`sphere_${i}`)
				.geometry(geometry)
				.material({ ...s.material })
				.translateTo(-275 + i * 110, 38, 760)
				.mount(this.scene!);
		});
	}

	/** Stains on the paving (multiplied over it, so they take its lighting) and a small fire, seeded so a still is the same every time. */
	setupEffects () {
		if (!this.scene) return;
		const stains = new IgeDecalSystem3d({ maxDecals: 16 }).id("stains").mount(this.scene) as IgeDecalSystem3d;
		stains.add(-150, 1000, { size: 60, rotation: 0.4, cell: 0, color: { r: 0.45, g: 0.05, b: 0.04 } });
		stains.add(-60, 1080, { size: 45, rotation: 1.9, cell: 1, color: { r: 0.12, g: 0.25, b: 0.55 } });
		stains.add(40, 980, { size: 70, rotation: 2.8, cell: 2, color: { r: 0.2, g: 0.18, b: 0.15 } });

		const fire = new IgeParticleSystem3d({
			maxParticles: 400, blending: "additive", rate: 70, lifetime: [0.4, 0.9], speed: [20, 50],
			direction: { x: 0, y: 1, z: 0 }, spread: 0.4, gravity: { x: 0, y: 50, z: 0 }, size: [16, 4], emitterRadius: 7,
			startColor: { r: 1, g: 0.72, b: 0.28, a: 0.9 }, endColor: { r: 0.85, g: 0.12, b: 0.02, a: 0 }
		}).id("fire").translateTo(150, 4, 1010).mount(this.scene) as IgeParticleSystem3d;
		fire.seed(7).driven(true).start();
		// A second and a half in, in frame-sized steps (one big step would age its particles out as they're made); held
		// there for stills, else moved on with the frame's time
		for (let i = 0; i < 90; i++) fire.simulate(1 / 60);
		if (!this.still) this.scene.addBehaviour(IgeBehaviourType.preUpdate, "fire", (_e: unknown, tickDelta: number) => fire.simulate(Math.min(tickDelta || 16, 50) / 1000));
	}

	async loadHelmet () {
		if (!this.scene) return;
		this.setText("status", "Loading the helmet...");
		const model = await igeGltfLoader.load("../../assets/models/SciFiHelmet.glb", "sciFiHelmet");
		// Above and behind the spheres: its base colour and emissive maps are sRGB, its normal, metallic-roughness and
		// occlusion maps data (as the glTF loader knows from the slots they fill)
		new IgeEntity().id("helmet").model(model).translateTo(0, 125, 560).scaleTo(50, 50, 50).rotateTo(0, 0.5, 0).mount(this.scene);
	}

	apply () {
		const renderer = this.renderer;
		if (!renderer) return;
		renderer.linearLighting(this.linear);
		renderer.anisotropy(this.aniso);
		renderer.postProcess({ enabled: this.post, toneMapping: "aces", exposure: 1, bloom: 0.12, bloomThreshold: 0.9 });
		this.placeCamera();
		this.updateReadout();
	}

	updateReadout () {
		const renderer = this.renderer;
		if (!renderer) return;
		const memory = renderer.stats().gpuMemory;
		const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
		this.setText("linearState", this.linear ? "on" : "off");
		this.setText("anisoState", renderer.anisotropy() === 1 ? `off (GPU's most ${renderer.maxAnisotropy()})` : `${renderer.anisotropy()}x (GPU's most ${renderer.maxAnisotropy()})`);
		this.setText("postState", this.post ? "on (ACES)" : "off");
		this.setText("viewState", this.view);
		this.setText("memory", `${mb(memory.colorMaps)} colour, ${mb(memory.normalMaps)} normal, ${mb(memory.otherMaps)} other (${mb(memory.textures)} MB)`);
		this.setText("fps", Math.round(ige.engine._fps).toString());
	}

	setupKeys () {
		window.addEventListener("keydown", (event) => {
			switch (event.key.toLowerCase()) {
				case "l": this.linear = !this.linear; break;
				case "a": this.aniso = ANISO_STEPS[(ANISO_STEPS.indexOf(this.aniso) + 1) % ANISO_STEPS.length] ?? 1; break;
				case "p": this.post = !this.post; break;
				case "v": this.view = this.view === "grazing" ? "above" : "grazing"; break;
				default: return;
			}
			this.apply();
		});
	}

	setText (id: string, text: string) {
		const el = document.getElementById(id);
		if (el) el.textContent = text;
	}
}

/**
 * Paving slabs in a running bond, each a slightly different warm grey or sandstone, with thin pale joints and a
 * little grain: fine lines both ways, the detail trilinear filtering loses at a grazing angle. Seeded, so every run is
 * the same picture. 512 x 512, a power of two, so it repeats and gets mipmaps.
 */
function drawPaving (): HTMLCanvasElement {
	const size = 512, rows = 8, cols = 4;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	let seed = 20261125;
	const random = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	// The joints
	ctx.fillStyle = "#d9d2c3";
	ctx.fillRect(0, 0, size, size);
	const h = size / rows, w = size / cols, joint = 5;
	const tones = [[176, 158, 132], [150, 140, 128], [196, 170, 128], [128, 120, 112], [170, 120, 96]];
	for (let row = 0; row < rows; row++) {
		const shift = row % 2 ? w / 2 : 0;
		for (let col = -1; col < cols; col++) {
			const [r, g, b] = tones[Math.floor(random() * tones.length)];
			const v = 0.88 + random() * 0.24;
			ctx.fillStyle = `rgb(${Math.round(r * v)}, ${Math.round(g * v)}, ${Math.round(b * v)})`;
			ctx.fillRect(col * w + shift + joint / 2, row * h + joint / 2, w - joint, h - joint);
		}
	}
	// Grain: small dark and light flecks
	for (let i = 0; i < 9000; i++) {
		const dark = random() < 0.5;
		ctx.fillStyle = dark ? "rgba(40, 32, 24, 0.22)" : "rgba(255, 250, 240, 0.18)";
		ctx.fillRect(Math.floor(random() * size), Math.floor(random() * size), 1 + Math.floor(random() * 2), 1 + Math.floor(random() * 2));
	}
	return canvas;
}
