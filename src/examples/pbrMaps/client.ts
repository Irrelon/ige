import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeCamera } from "@/engine/core/IgeCamera";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { IgeBehaviourType } from "@/enums";
import { IgeAmbientLight, IgeDirectionalLight, IgePointLight } from "@/engine/webgl/IgeWebGlLight";
import { igeGltfLoader, type IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import type { IgeMaterialData } from "@/types/IgeMaterialData";

// @ts-ignore
window.ige = ige;

/** The map fields of material data: what "maps off" takes away and "maps on" gives back. */
const MAP_FIELDS = [
	"normalTexture", "normalTextureId", "normalTextureBlob", "normalScale",
	"metallicRoughnessTexture", "metallicRoughnessTextureId", "metallicRoughnessTextureBlob",
	"aoTexture", "aoTextureId", "aoTextureBlob", "aoStrength"
] as const;

/**
 * PBR Maps Example
 *
 * The Khronos SciFi Helmet (a glTF with base colour, normal, metallic-roughness and occlusion maps)
 * turning slowly under a light.
 *
 * M: maps on / off. P: PBR lighting on / off. The normal map works under both lightings; the metallic-roughness
 * and occlusion maps act only with PBR lighting (renderer.pbr(true)).
 * URL options for stills: ?maps=0, ?pbr=1, ?close=1, ?far=1, ?spin=0 (hold the helmet at a set angle).
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	scene?: IgeScene2d;
	camera?: IgeCamera;
	viewport?: IgeViewport;
	renderer?: IgeWebGlRenderer;
	model?: IgeGltfModel;
	helmet?: IgeEntity;

	mapsOn = true;
	pbrOn = false;
	close = false;
	far = false;
	paused = false;
	spin = true;
	angle = 0.6;
	/** The maps taken off the model's materials while "maps off" (given back when they're on again). */
	stashed: Partial<IgeMaterialData>[] = [];

	constructor () {
		super();
		void this.init();
	}

	async init () {
		try {
			const params = new URLSearchParams(window.location.search);
			this.mapsOn = params.get("maps") !== "0";
			this.pbrOn = params.get("pbr") === "1";
			this.close = params.get("close") === "1";
			this.far = params.get("far") === "1";
			this.spin = params.get("spin") !== "0";

			this.renderer = new IgeWebGlRenderer();
			ige.engine.renderer(this.renderer);
			await this.renderer.setup();
			this.renderer.createFrontBuffer(true);
			await ige.engine.start();

			this.setupScene();
			this.setupLights();
			await this.loadHelmet();
			this.setupAnimation();
			this.setupKeys();
			this.apply();

			document.querySelectorAll(".igeLoading").forEach((e) => ((e as HTMLElement).style.display = "none"));
			this.setText("status", "Ready");
			setInterval(() => this.setText("fps", Math.round(ige.engine._fps).toString()), 200);
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
		this.camera.fov(40);
		this.camera.near(1);
		this.camera.far(3000);
		this.viewport.mount(ige.engine);
		this.placeCamera();
	}

	placeCamera () {
		if (!this.camera) return;
		if (this.far) {
			// Far away, where the maps' mipmaps matter: a texel is far smaller than a pixel
			this.camera.translateTo(0, 120, 1500);
			this.camera._lookAt = new IgePoint3d(0, 0, 0);
		} else if (this.close) {
			// Close on the visor and brow, where the normal map has the most to show
			this.camera.translateTo(40, 25, 150);
			this.camera._lookAt = new IgePoint3d(-5, 15, 0);
		} else {
			this.camera.translateTo(0, 40, 430);
			this.camera._lookAt = new IgePoint3d(0, 0, 0);
		}
	}

	setupLights () {
		const lightManager = this.renderer?.lightManager;
		if (!this.scene || !lightManager) return;

		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.45, 0.5, 0.6);
		ambient.groundColor(0.12, 0.1, 0.1);
		ambient.intensity(0.55);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);

		// A low key light from the side, so the surface detail catches it
		const key = new IgeDirectionalLight();
		key.lightColor(1, 0.93, 0.82);
		key.intensity(1.3);
		key.direction(-0.7, -0.35, -0.6);
		key.mount(this.scene);
		lightManager.addLight(key);

		const rim = new IgePointLight();
		rim.lightColor(0.5, 0.65, 1);
		rim.intensity(0.9);
		rim.range(900);
		rim.decay(2);
		rim.translateTo(-220, 120, -160);
		rim.mount(this.scene);
		lightManager.addLight(rim);
	}

	async loadHelmet () {
		if (!this.scene) return;
		this.setText("status", "Loading the helmet...");
		this.model = await igeGltfLoader.load("../../assets/models/SciFiHelmet.glb", "sciFiHelmet");
		// The material data the maps come from, to take them off and put them back
		this.stashed = getModelParts(this.model).map((part) => {
			const kept: Record<string, unknown> = {};
			for (const field of MAP_FIELDS) if (part.materialData[field] !== undefined) kept[field] = part.materialData[field];
			return kept as Partial<IgeMaterialData>;
		});
		this.helmet = new IgeEntity().id("helmet").model(this.model).translateTo(0, 0, 0).scaleTo(70, 70, 70).mount(this.scene);
		this.helmet.rotateTo(0, this.angle, 0);
	}

	setupAnimation () {
		if (!this.scene) return;
		this.scene.addBehaviour(IgeBehaviourType.preUpdate, "turnHelmet", () => {
			if (this.spin && !this.paused) this.angle += 0.004;
			this.helmet?.rotateTo(0, this.angle, 0);
		});
	}

	/** Maps on or off on every part of the model (the entity's draw picks it up next frame). */
	setMaps (on: boolean) {
		if (!this.model) return;
		getModelParts(this.model).forEach((part, i) => {
			const data = part.materialData as Record<string, unknown>;
			for (const field of MAP_FIELDS) {
				if (on && this.stashed[i]?.[field] !== undefined) data[field] = this.stashed[i][field];
				else delete data[field];
			}
		});
	}

	apply () {
		this.setMaps(this.mapsOn);
		this.renderer?.pbr(this.pbrOn);
		this.placeCamera();
		this.setText("mapsState", this.mapsOn ? "on" : "off");
		this.setText("pbrState", this.pbrOn ? "on" : "off");
	}

	setupKeys () {
		window.addEventListener("keydown", (event) => {
			switch (event.key.toLowerCase()) {
				case "m": this.mapsOn = !this.mapsOn; break;
				case "p": this.pbrOn = !this.pbrOn; break;
				case "c": this.close = !this.close; break;
				case " ": this.paused = !this.paused; return;
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
