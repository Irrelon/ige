import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgePanelViewport } from "@/engine/core/IgePanelViewport";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeBehaviourType } from "@/enums";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { igeEffectTime } from "@/engine/webgl/IgeEffectTime";
import { igePhaseSolid } from "@/engine/webgl/IgePhase";
import { igeProceduralSkeleton } from "@/engine/webgl/IgeProceduralSkeleton";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";

/**
 * Phase effects (entity.phase()) and lensing (renderer.lens()), as Starflight's Act Three uses them:
 *  - a planet over a starfield that flickers in and out of phase on a 25 s rhythm, solid for the 9 s that straddle the
 *    cycle's start (the landing window), with its flicker rising as the window closes;
 *  - a blocky figure on a procedural skeleton, partly out of phase and flickering solid, next to a solid twin;
 *  - the star collapsing (K): it shrinks and brightens, its lens grows and bends the stars behind it, a flash, then a
 *    dark rift ringed by lensed light;
 *  - a scrub slider: everything on screen is a function of one time value (igeEffectTime()), so dragging it back
 *    gives the same picture.
 * Address options: ?view=planet|figure|star, ?t=seconds (hold that time), ?collapse=seconds (the collapse's own clock,
 * held), ?amount=0..1 (hold the planet's amount), ?post=0, ?pause=1, ?split=1 (two views side by side: the chosen one
 * and the star, each placing the lens with its own camera), ?fx=none|phase|lens|all (which effects run, to compare cost).
 */
const params = new URLSearchParams(location.search);
const views = ["planet", "figure", "star"] as const;
type View = typeof views[number];

const CYCLE = 25;
const SOLID_WINDOW = 8;
const PLANET = { x: 0, y: 0, z: -9000, radius: 3000 };
const STAR = { x: 7500, y: 2200, z: -17000, radius: 520 };
const FIGURE_AT = { x: -1100, y: -520, z: -3000 };

const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** The planet's phase at time t: solid from 0 to 8 s of each 25 s cycle, ghost-like (flickering more as it nears the window) otherwise. */
export function planetPhase (t: number): { amount: number; flicker: number; solidWindow: boolean } {
	const u = ((t % CYCLE) + CYCLE) % CYCLE;
	const solidWindow = u < SOLID_WINDOW;
	// Ghost at 0.88 from 9 s; fades solid over the last second before the cycle starts; slips out over 8 to 9 s
	const out = smooth(SOLID_WINDOW, SOLID_WINDOW + 1, u) * (1 - smooth(CYCLE - 1.5, CYCLE, u));
	const flicker = 0.25 + 0.75 * smooth(17, CYCLE - 1, u) * (1 - smooth(CYCLE - 1, CYCLE, u));
	return { amount: 0.88 * out, flicker: out > 0 ? flicker : 0, solidWindow };
}

/** mulberry32 */
function random (seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const at = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
/** A bone's model-space matrix: a rotation about x of `a` radians (and about z of `b`) at the pivot (x, y, z). */
function pose (x: number, y: number, z: number, a: number, b = 0): number[] {
	const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
	// Rz(b) * Rx(a), column-major
	return [cb, sb, 0, 0, -sb * ca, cb * ca, sa, 0, sb * sa, -cb * sa, ca, 0, x, y, z, 1];
}

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer = new IgeWebGlRenderer();
	scene = new IgeScene2d();
	viewport = new IgeViewport();
	viewport2?: IgeViewport;
	/** ?panel=1: a picture-in-picture view of the star (lens and phase effects in a panel's own target). */
	panel?: IgePanelViewport;
	view: View = (views as readonly string[]).includes(params.get("view") ?? "") ? params.get("view") as View : "planet";
	/** The one time value everything is a function of. */
	t = Number(params.get("t") ?? 0);
	heldT = params.has("t");
	paused = params.get("pause") === "1";
	post = params.get("post") !== "0";
	/** Seconds since the collapse began (null: not started). */
	collapse: number | null = params.has("collapse") ? Number(params.get("collapse")) : null;
	collapseHeld = params.has("collapse");
	heldAmount = params.has("amount") ? Number(params.get("amount")) : null;
	/** Which effects run: "all", "phase", "lens" or "none" (?fx=, for measuring what they cost). */
	fx = params.get("fx") ?? "all";
	planet!: IgeEntity;
	star!: IgeEntity;
	figure!: IgeEntity;
	twin!: IgeEntity;
	figures: { entity: IgeEntity; bias: number }[] = [];
	fps = 0;

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const renderer = this.renderer;
		renderer.maxPixelRatio(1.5);
		ige.engine.renderer(renderer);
		await renderer.setup();
		renderer.createFrontBuffer(true);
		await ige.engine.start();

		this.scene.id("space");
		this.viewport.id("view").autoSize(true).scene(this.scene).mount(ige.engine);
		const split = params.get("split") === "1";
		const views = [this.viewport];
		if (split) {
			this.viewport.autoSize(false);
			this.viewport2 = new IgeViewport().id("view2").autoSize(false).scene(this.scene).mount(ige.engine);
			views.push(this.viewport2);
			const layout = () => {
				const half = Math.floor(ige.engine._bounds2d.x / 2);
				views.forEach((viewport, i) => {
					viewport._bounds2d.x = half - 2;
					viewport._bounds2d.y = ige.engine._bounds2d.y;
					viewport._translate.x = i * (half + 2);
					viewport._translate.y = 0;
				});
			};
			layout();
			addEventListener("resize", layout);
		}
		for (const viewport of views) {
			viewport.camera.projectionType("perspective");
			viewport.camera.near(20);
			viewport.camera.far(200000);
		}

		renderer.setClearColor(0.004, 0.005, 0.012, 1);
		this.lights();
		this.stars();
		this.makePlanet();
		this.makeStar();
		this.makeFigures();
		this.graphics();
		if (params.get("panel") === "1") {
			this.panel = new IgePanelViewport({ right: 16, bottom: 16, width: "36%", aspect: 16 / 9 }).scene(this.scene);
			this.panel.viewport.camera.projectionType("perspective");
			this.panel.viewport.camera.near(20);
			this.panel.viewport.camera.far(200000);
			renderer.addPanel(this.panel);
			this.panel.show();
		}

		this.scene.addBehaviour(IgeBehaviourType.preUpdate, "frame", (_e: unknown, tickDelta: number) => this.tick(tickDelta));
		addEventListener("keydown", (e) => this.key(e.key));
		const scrub = document.getElementById("scrub") as HTMLInputElement;
		scrub.addEventListener("input", () => { this.paused = true; this.t = Number(scrub.value); });
		setInterval(() => this.hud(), 200);
		(window as unknown as { demo: unknown }).demo = this;
	}

	lights () {
		const renderer = this.renderer;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.3, 0.35, 0.5);
		ambient.groundColor(0.1, 0.1, 0.14);
		ambient.intensity(0.5);
		ambient.mount(this.scene);
		renderer.lightManager?.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.92, 0.78);
		sun.intensity(1.3);
		sun.direction(-0.55, -0.25, -0.8);
		sun.mount(this.scene);
		renderer.lightManager?.addLight(sun);
		renderer.lightManager?.refresh();
	}

	graphics () {
		// ?linear=1: linear lighting (rims and tints are converted to linear light)
		if (params.get("linear") === "1") this.renderer.linearLighting(true);
		// HDR post-processing with bloom, as Starflight runs it
		this.renderer.postProcess({ enabled: this.post, hdr: true, toneMapping: "none", bloom: 0.55, bloomThreshold: 1.0, vignette: 0.25 });
	}

	/** Eight hundred tiny emissive blocks on a shell round the scene. */
	stars () {
		const rand = random(77), boxes: Parameters<typeof IgePrimitiveGeometry.createBoxes>[0] = [];
		for (let i = 0; i < 900; i++) {
			const u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - u * u), d = 70000 + rand() * 20000;
			const size = 70 + rand() * rand() * 260, warm = rand();
			boxes.push({ x: Math.cos(a) * r * d, y: u * d, z: Math.sin(a) * r * d, w: size, h: size, d: size, color: { r: 0.8 + 0.2 * warm, g: 0.85, b: 1 - 0.3 * warm, a: 1 } });
		}
		const field = new IgeEntity();
		field._geometryData = IgePrimitiveGeometry.createBoxes(boxes, "starfield");
		field.material({ color: { r: 0, g: 0, b: 0, a: 1 }, emissiveColor: { r: 1, g: 1, b: 1 }, emissiveIntensity: -1.4 });
		field._noShadowCast = true;
		field.mount(this.scene);
	}

	/** A sphere coloured by noise on its normals: oceans, land, ice caps. */
	makePlanet () {
		const sphere = IgePrimitiveGeometry.createSphere(1, 96, 64, "aurel");
		const v = sphere.vertices!, n = sphere.normals!, colors = new Float32Array((v.length / 3) * 4);
		for (let i = 0; i < v.length / 3; i++) {
			const x = n[i * 3], y = n[i * 3 + 1], z = n[i * 3 + 2];
			const h = Math.sin(x * 5 + Math.sin(z * 4)) * Math.cos(y * 6 - x * 2) + 0.5 * Math.sin(z * 11 + y * 7) + 0.3 * Math.sin(x * 19 - z * 13);
			const land = h > 0.05;
			const ice = Math.abs(y) > 0.86;
			const c = ice ? [0.9, 0.93, 0.98] : land ? [0.42 + 0.2 * Math.sin(h * 5), 0.5 + 0.1 * h, 0.28] : [0.1, 0.25, 0.5 + 0.1 * h];
			colors.set([c[0], c[1], c[2], 1], i * 4);
		}
		sphere.colors = colors;
		this.planet = new IgeEntity();
		this.planet._geometryData = sphere;
		this.planet.material({ color: { r: 1, g: 1, b: 1, a: 1 }, roughness: 0.85 });
		this.planet.translateTo(PLANET.x, PLANET.y, PLANET.z).scaleTo(PLANET.radius, PLANET.radius, PLANET.radius).mount(this.scene);
		this.planet.phase({ amount: 0, flicker: 0, edgeColor: { r: 0.4, g: 0.85, b: 1 }, edgeStrength: 1.8 });
	}

	makeStar () {
		this.star = new IgeEntity();
		this.star._geometryData = IgePrimitiveGeometry.createSphere(1, 48, 32, "star");
		this.star._noShadowCast = true;
		this.star.translateTo(STAR.x, STAR.y, STAR.z).mount(this.scene);
		this.starLook(0);
	}

	/** The star's look at `c` seconds into the collapse: swollen and warm, then shrinking, whitening and brightening to the flash. */
	starLook (c: number | null) {
		const k = c === null ? 0 : smooth(0, 4, c);
		const radius = c !== null && c >= 4.3 ? 0 : STAR.radius * (1 - 0.65 * k);
		const glow = 1.6 + 14 * k * k;
		this.star.scaleTo(Math.max(radius, 0.001), Math.max(radius, 0.001), Math.max(radius, 0.001));
		if (radius > 0) this.star.show(); else this.star.hide();
		this.star.material({ color: { r: 0, g: 0, b: 0, a: 1 }, emissiveColor: { r: 1, g: 0.78 + 0.2 * k, b: 0.45 + 0.5 * k }, emissiveIntensity: glow });
	}

	/** The lens and the flash at `c` seconds into the collapse (a pure function of c). */
	collapseAt (c: number | null) {
		const flash = document.getElementById("flash")!;
		this.starLook(c);
		if (c === null) {
			this.renderer.lens("star", null);
			flash.style.opacity = "0";
			return;
		}
		const grow = smooth(0, 4, c), rift = smooth(4.3, 7, c);
		this.renderer.lens("star", {
			x: STAR.x, y: STAR.y, z: STAR.z,
			radius: 1400 + 1800 * grow + 400 * rift,
			strength: 0.5 * grow + 0.7 * rift,
			ring: 1.1 * smooth(2.5, 4, c) * (c < 4.3 ? 1 : 0.4 + 0.6 * rift),
			ringWidth: 0.02, ringR: 1, ringG: 0.82, ringB: 0.55,
			core: 0.1 * rift, ripple: 0.4 * rift
		});
		flash.style.opacity = String(c < 3.9 ? 0 : c < 4.25 ? (c - 3.9) / 0.35 : Math.max(0, 1 - (c - 4.25) / 1.1));
	}

	/** A person of boxes on a procedural skeleton: body, head, two arms, two legs, each a bone. */
	makeFigures () {
		const bones = [
			{ name: "body", pivot: [0, 100, 0] }, { name: "head", pivot: [0, 142, 0] }, { name: "armL", pivot: [-27, 138, 0] },
			{ name: "armR", pivot: [27, 138, 0] }, { name: "legL", pivot: [-11, 78, 0] }, { name: "legR", pivot: [11, 78, 0] }
		];
		const skin = { r: 0.85, g: 0.7, b: 0.58 }, cloth = { r: 0.25, g: 0.4, b: 0.62 }, dark = { r: 0.16, g: 0.17, b: 0.22 };
		const parts = [
			{ x: 0, y: 108, z: 0, w: 48, h: 62, d: 26, color: cloth }, { x: 0, y: 153, z: 0, w: 26, h: 26, d: 26, color: skin },
			{ x: -33, y: 120, z: 0, w: 14, h: 62, d: 16, color: cloth }, { x: 33, y: 120, z: 0, w: 14, h: 62, d: 16, color: cloth },
			{ x: -11, y: 39, z: 0, w: 18, h: 78, d: 20, color: dark }, { x: 11, y: 39, z: 0, w: 18, h: 78, d: 20, color: dark }
		];
		const mesh: IgeGeometryData3d = IgePrimitiveGeometry.createBoxes(parts, "figureMesh");
		const count = mesh.vertices!.length / 3;
		mesh.boneIndices = new Uint8Array(count * 4);
		mesh.boneWeights = new Float32Array(count * 4);
		for (let i = 0; i < count; i++) {
			mesh.boneIndices[i * 4] = Math.floor(i / 24);
			mesh.boneWeights[i * 4] = 1;
		}
		const data = igeProceduralSkeleton("figure", bones.map((b) => ({ name: b.name, rest: at(b.pivot[0], b.pivot[1], b.pivot[2]) })));
		this.figureBones = bones;
		const make = (x: number, bias: number) => {
			const entity = new IgeEntity().skin(mesh, data);
			entity.translateTo(FIGURE_AT.x + x, FIGURE_AT.y, FIGURE_AT.z).scaleTo(2.4, 2.4, 2.4).rotateTo(0, 0.5, 0).mount(this.scene);
			this.figures.push({ entity, bias });
			return entity;
		};
		this.twin = make(-240, 0);
		this.figure = make(0, 1);
		this.figure.phase({ amount: 0.78, flicker: 0.55, edgeColor: { r: 0.45, g: 0.9, b: 1 }, edgeStrength: 2.2, rippleScale: 40 });
	}
	figureBones: { name: string; pivot: number[] }[] = [];

	/** Each figure's pose at time t: a slow sway, the arms lifting and lowering. */
	poseFigures (t: number) {
		for (const { entity, bias } of this.figures) {
			const s = Math.sin(t * 0.9 + bias), lift = 0.5 + 0.5 * Math.sin(t * 0.5 + bias * 2);
			const m: number[] = [];
			const b = this.figureBones.map((x) => x.pivot);
			m.push(...pose(b[0][0], b[0][1], b[0][2], 0, 0.03 * s));
			m.push(...pose(b[1][0], b[1][1], b[1][2], 0.08 * s, 0.25 * Math.sin(t * 0.4 + bias)));
			m.push(...pose(b[2][0], b[2][1], b[2][2], -1.4 * lift, 0));
			m.push(...pose(b[3][0], b[3][1], b[3][2], 0.35 * s, 0));
			m.push(...pose(b[4][0], b[4][1], b[4][2], 0.12 * s, 0));
			m.push(...pose(b[5][0], b[5][1], b[5][2], -0.12 * s, 0));
			entity.setBonePose(m);
		}
	}

	key (k: string) {
		if (k === "v" || k === "V") this.view = views[(views.indexOf(this.view) + 1) % views.length];
		else if (k === "k" || k === "K") { this.collapse = 0; this.collapseHeld = false; }
		else if (k === "r" || k === "R") { this.collapse = null; this.collapseHeld = false; }
		else if (k === " ") this.paused = !this.paused;
		else if (k === "p" || k === "P") { this.post = !this.post; this.graphics(); }
	}

	tick (tickDelta: number) {
		const dt = Math.min(tickDelta, 100) / 1000;
		if (!this.paused && !this.heldT) this.t += dt;
		if (this.collapse !== null && !this.paused && !this.collapseHeld) this.collapse += dt;
		this.fps = this.fps * 0.9 + (dt > 0 ? 1 / dt : 60) * 0.1;
		// One time value for every effect: the scrub slider, a recording, a timeline would set this
		igeEffectTime(this.t);

		const usePhase = this.fx === "all" || this.fx === "phase";
		const p = this.heldAmount !== null ? { amount: this.heldAmount, flicker: 0, solidWindow: false } : planetPhase(this.t);
		if (usePhase) {
			this.planet.phase({ amount: p.amount, flicker: p.flicker });
			this.figure.phase({ amount: 0.78 + 0.1 * Math.sin(this.t * 0.7) });
		} else if (this.planet.phase()) {
			this.planet.phase(null);
			this.figure.phase(null);
		}
		this.planet.rotateTo(0, this.t * 0.02, 0);
		this.poseFigures(this.t);
		this.collapseAt(this.fx === "all" || this.fx === "lens" ? this.collapse : null);

		this.aim(this.viewport, this.view);
		if (this.viewport2) this.aim(this.viewport2, "star");
		if (this.panel) this.aim(this.panel.viewport, "star");

		(document.getElementById("clock") as HTMLElement).textContent = `t = ${this.t.toFixed(2)}`;
		const scrub = document.getElementById("scrub") as HTMLInputElement;
		if (document.activeElement !== scrub) scrub.value = String(this.t % 75);
	}

	/** Points a viewport's camera at one of the views. */
	aim (viewport: IgeViewport, view: View) {
		const camera = viewport.camera;
		let eye: number[], look: number[], fov: number;
		const sway = Math.sin(this.t * 0.15) * 80;
		if (view === "planet") {
			eye = [sway, 120, 600]; look = [0, 150, -9000]; fov = 62;
		} else if (view === "figure") {
			eye = [FIGURE_AT.x + 620 + sway, FIGURE_AT.y + 300, FIGURE_AT.z + 760]; look = [FIGURE_AT.x - 90, FIGURE_AT.y + 240, FIGURE_AT.z]; fov = 38;
		} else {
			eye = [5200 + sway, 1100, -6000]; look = [STAR.x, STAR.y, STAR.z]; fov = 44;
		}
		camera._up = { x: 0, y: 1, z: 0 };
		camera.fov(fov);
		camera.translateTo(eye[0], eye[1], eye[2]);
		camera._lookAt = new IgePoint3d(look[0], look[1], look[2]);
	}

	hud () {
		const p = this.heldAmount !== null ? { amount: this.heldAmount, flicker: 0, solidWindow: false } : planetPhase(this.t), stats = this.renderer.stats();
		const u = ((this.t % CYCLE) + CYCLE) % CYCLE;
		const solid = igePhaseSolid(this.t, p.flicker, 1, 0);
		(document.getElementById("hud") as HTMLElement).textContent = [
			`view ${this.view}   post ${this.post ? "on (hdr, bloom)" : "off"}   ${this.paused ? "paused" : "running"}`,
			`planet: cycle ${u.toFixed(1)} / ${CYCLE} s   ${p.solidWindow ? "SOLID WINDOW (land now)" : "out of phase"}`,
			`  amount ${p.amount.toFixed(2)}   flicker ${p.flicker.toFixed(2)}   solid blink ${solid.toFixed(2)}`,
			`collapse: ${this.collapse === null ? "not started (K)" : this.collapse.toFixed(1) + " s"}`,
			`fps ${this.fps.toFixed(0)}   draws ${stats.drawCalls}   gpu ${stats.gpuMs === null ? "n/a" : stats.gpuMs.toFixed(2) + " ms"}`
		].join("\n");
	}
}
