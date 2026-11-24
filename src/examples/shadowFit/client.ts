import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeBehaviourType } from "@/enums";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";

/**
 * The directional shadow map fitted to the view (renderer.shadowFit()), with GPU time and memory from stats(), and a
 * stress test of decals and particles added after their systems update.
 *
 * A town of boxes (100 units a metre, like a game in metres scaled up), the sun low in the south-west, and a camera
 * driving a loop round it at 30 m/s: top-down from 130 m, low top-down from 34 m, or at street level. Each frame the
 * page checks that the ground and the roofs the camera sees (a grid across the screen, its corners included) land in
 * the shadow map: "corners" in the readout. Address options: ?view=top|low|street, ?fit=0, ?cache=1, ?dist=180
 * (metres of shadow at street level), ?stress=1, ?pause=1, ?box=1 (draw the shadow box), ?glcheck=1 (gl.getError()
 * every frame), ?speed=30.
 */
const M = 100;
const ROOF = 25;
const params = new URLSearchParams(location.search);
const views = ["top", "low", "street"] as const;
type View = typeof views[number];

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

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer = new IgeWebGlRenderer();
	scene = new IgeScene2d();
	viewport = new IgeViewport();
	view: View = (views as readonly string[]).includes(params.get("view") ?? "") ? params.get("view") as View : "top";
	fit = params.get("fit") !== "0";
	stress = params.get("stress") === "1";
	paused = params.get("pause") === "1";
	/** Draw where the shadow map meets the ground (magenta). */
	outline = params.get("box") === "1";
	speed = Number(params.get("speed") ?? 30);
	distance = Number(params.get("dist") ?? 180);
	decals?: IgeDecalSystem3d;
	smoke?: IgeParticleSystem3d;
	/** Metres driven round the loop. */
	driven = 0;
	frames = 0;
	/** Frames where part of what the camera saw wasn't in the shadow map, and the worst point this second (clip space). */
	missed = 0;
	worst = 0;
	glErrors = 0;
	added = { decals: 0, particles: 0 };
	cacheRebuilds = 0;
	/** The camera as the last frame drew it, for checking that frame's shadow map. */
	drawn: { view: View; eye: number[] } | null = null;
	fps = 0;
	gpuMs: number[] = [];

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

		this.scene.id("town");
		this.viewport.id("view").autoSize(true).scene(this.scene).mount(ige.engine);
		const camera = this.viewport.camera;
		camera.projectionType("perspective");
		camera.near(0.1 * M);
		camera.far(1000 * M);

		this.lights();
		this.town();
		this.effects();
		this.settings();

		this.scene.addBehaviour(IgeBehaviourType.preUpdate, "drive", (_e: unknown, tickDelta: number) => this.tick(tickDelta));
		addEventListener("keydown", (e) => this.key(e.key));
		setInterval(() => this.hud(), 250);
		// For checking from the console or DevTools
		(window as unknown as { demo: unknown }).demo = this;
	}

	lights () {
		const renderer = this.renderer;
		renderer.setClearColor(0.62, 0.71, 0.79, 1);
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.72, 0.8, 0.92);
		ambient.groundColor(0.42, 0.39, 0.34);
		ambient.intensity(0.62);
		ambient.mount(this.scene);
		renderer.lightManager?.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.94, 0.84);
		sun.intensity(1.15);
		sun.direction(-0.48, -0.78, -0.4);
		sun.mount(this.scene);
		renderer.lightManager?.addLight(sun);
		// The old square: 180 m across round the camera's target; the depth the bias is a share of: 1 to 800 m
		renderer.shadowManager?.frustumSize(90 * M);
		renderer.shadowManager?.shadowPlanes(1 * M, 800 * M);
		renderer.enableShadows(sun, 4096);
		renderer.lightManager?.refresh();
	}

	/** Blocks of buildings 6 to 25 m tall between streets, lamp posts along them, a ground slab, cars driving round. */
	town () {
		const cube = IgePrimitiveGeometry.createCube(1, "townCube");
		const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: { r: number; g: number; b: number }) => {
			const e = new IgeEntity();
			e._geometryData = cube;
			e.material({ color: { ...color, a: 1 } });
			e.translateTo(x * M, (y + h / 2) * M, z * M).scaleTo(w * M, h * M, d * M).mount(this.scene);
			return e;
		};
		box(0, -1, 0, 1400, 1, 1400, { r: 0.45, g: 0.47, b: 0.44 });
		const rand = random(1066);
		for (let bx = -6; bx < 6; bx++) {
			for (let bz = -6; bz < 6; bz++) {
				// A 60 m block with a 14 m street round it
				const x0 = bx * 60 + 7, z0 = bz * 60 + 7;
				for (let i = 0; i < 4; i++) {
					const w = 9 + rand() * 11, d = 9 + rand() * 11, h = 6 + rand() * (ROOF - 6);
					const x = x0 + (i % 2) * 24 + w / 2 + rand() * 3, z = z0 + Math.floor(i / 2) * 24 + d / 2 + rand() * 3;
					const shade = 0.55 + rand() * 0.35;
					box(x, 0, z, w, h, d, { r: shade, g: shade * 0.92, b: shade * 0.85 });
				}
				// Lamp posts at the block's corners
				box(x0 - 2, 0, z0 - 2, 0.3, 6, 0.3, { r: 0.2, g: 0.2, b: 0.22 });
				box(x0 + 48, 0, z0 - 2, 0.3, 6, 0.3, { r: 0.2, g: 0.2, b: 0.22 });
			}
		}
		// Cars: moving casters, drawn over the cached static shadows each frame
		for (let i = 0; i < 24; i++) {
			const car = box(0, 0, 0, 1.8, 1.5, 4.4, { r: rand(), g: rand() * 0.5, b: rand() * 0.5 });
			const lane = (i % 12 - 6) * 60 + 3.5, phase = rand() * 720, along = i < 12;
			car.addBehaviour(IgeBehaviourType.preUpdate, "drive", () => {
				const s = ((ige.engine._currentTime / 1000) * 12 + phase) % 720 - 360;
				if (along) car.translateTo(lane * M, 0.75 * M, s * M);
				else car.translateTo(s * M, 0.75 * M, lane * M).rotateTo(0, Math.PI / 2, 0);
			});
		}
	}

	/**
	 * Skid-mark decals that last (45 s) and smoke, with hundreds of each added after the scene graph has updated (the
	 * engine's postUpdate, where a game steps its physics and reads its wheels). Skids start and stop: some frames add
	 * none, and the first frame after a quiet one is where the old code drew more marks than it had uploaded.
	 */
	effects () {
		this.decals = new IgeDecalSystem3d({ maxDecals: 200000, lifetime: 45, fadeTime: 8, lift: 0.05 * M }).mount(this.scene);
		this.smoke = new IgeParticleSystem3d({
			maxParticles: 4000, blending: "normal", lifetime: [0.3, 0.9], speed: [0.5 * M, 2 * M], spread: Math.PI / 3,
			gravity: { x: 0, y: 0.5 * M, z: 0 }, size: [0.8 * M, 3 * M],
			startColor: { r: 0.9, g: 0.9, b: 0.9, a: 0.5 }, endColor: { r: 0.95, g: 0.95, b: 0.95, a: 0 }
		}).mount(this.scene);
		ige.engine.addBehaviour(IgeBehaviourType.postUpdate, "skids", () => {
			if (!this.stress || this.frames % 5 >= 3) return;
			const t = this.target();
			for (let i = 0; i < 300; i++) {
				this.decals!.add((t.x + (Math.random() - 0.5) * 60) * M, (t.z + (Math.random() - 0.5) * 40) * M, { size: 0.5 * M, color: { r: 0.15, g: 0.14, b: 0.14 }, opacity: 0.4 });
			}
			for (let b = 0; b < 40; b++) this.smoke!.burst(8, { x: (t.x + (Math.random() - 0.5) * 40) * M, y: 0.5 * M, z: (t.z + (Math.random() - 0.5) * 30) * M });
			this.added.decals += 300;
			this.added.particles += 320;
		});
	}

	settings () {
		const r = this.renderer;
		r.shadowFit({ enabled: this.fit, distance: (this.view === "street" ? this.distance : Infinity) * M, minY: 0, maxY: ROOF * M });
		r.shadowCaching(params.get("cache") === "1");
	}

	key (key: string) {
		const r = this.renderer;
		if (key === "v") this.view = views[(views.indexOf(this.view) + 1) % views.length];
		if (key === "f") this.fit = !this.fit;
		if (key === "c") r.shadowCaching(!r.shadowCaching());
		if (key === "s") this.stress = !this.stress;
		if (key === " ") this.paused = !this.paused;
		if (key === "b") this.outline = !this.outline;
		r.shadowFit({ enabled: this.fit, distance: (this.view === "street" ? this.distance : Infinity) * M });
	}

	/** Where the camera is on the loop (metres): a 240 m square round the middle blocks, along the streets. */
	at (metres: number): { x: number; z: number; heading: number } {
		const side = 240, s = ((metres % (side * 4)) + side * 4) % (side * 4), leg = Math.floor(s / side), u = s - leg * side;
		const corners = [[-120, 120], [-120, -120], [120, -120], [120, 120]];
		const [ax, az] = corners[leg], [bx, bz] = corners[(leg + 1) % 4];
		return { x: ax + ((bx - ax) * u) / side, z: az + ((bz - az) * u) / side, heading: Math.atan2(bx - ax, bz - az) };
	}

	target (): { x: number; z: number } {
		return this.at(this.driven);
	}

	tick (tickDelta: number) {
		this.frames++;
		this.check();
		if (!this.paused) this.driven += (this.speed * Math.min(tickDelta, 100)) / 1000;
		const p = this.at(this.driven), camera = this.viewport.camera;
		let eye: number[], look: number[];
		if (this.view === "street") {
			eye = [p.x - Math.sin(p.heading) * 7, 3, p.z - Math.cos(p.heading) * 7];
			look = [p.x + Math.sin(p.heading) * 18, 1.5, p.z + Math.cos(p.heading) * 18];
			camera._up = { x: 0, y: 1, z: 0 };
			camera.fov(60);
		} else {
			const height = this.view === "top" ? 130 : 34;
			eye = [p.x, height, p.z];
			look = [p.x, 0, p.z];
			// North up the screen
			camera._up = { x: 0, y: 0, z: -1 };
			camera.fov(50);
		}
		camera.translateTo(eye[0] * M, eye[1] * M, eye[2] * M);
		camera._lookAt = new IgePoint3d(look[0] * M, look[1] * M, look[2] * M);
		this.drawn = { view: this.view, eye };
		if (this.outline) this.drawOutline();
		if (params.get("glcheck") === "1") {
			const gl = (this.renderer as unknown as { _canvasContext: WebGL2RenderingContext })._canvasContext;
			for (let e = gl.getError(); e !== gl.NO_ERROR; e = gl.getError()) this.glErrors++;
		}
		const stats = this.renderer.stats();
		this.cacheRebuilds += stats.shadowCacheRebuilds;
		if (stats.gpuMs !== null) this.gpuMs.push(stats.gpuMs);
	}

	/**
	 * Did the last frame's shadow map hold everything its camera saw that takes a shadow? A grid of screen points (its
	 * corners included) onto the ground and onto the roofs, out to the shadow distance at street level, each projected
	 * into the map: all must land inside it (|clip| under 1).
	 */
	check () {
		const r = this.renderer as unknown as { _cameraController: { getCachedMatrices (id: string): { viewProjection: IgeMatrix4; view: IgeMatrix4 } | undefined }; _shadowLightId: string };
		const matrices = r._cameraController?.getCachedMatrices(this.viewport.camera.id());
		const light = this.renderer.shadowManager?.getLightSpaceMatrix(r._shadowLightId);
		if (!matrices || !light || !this.drawn) return;
		const inv = matrices.viewProjection.getInverse()?.matrix;
		if (!inv) return;
		const v = matrices.view.matrix;
		const limit = this.drawn.view === "street" ? this.distance * M : Infinity;
		let worst = 0;
		for (const height of [0, ROOF * M]) {
			for (let i = 0; i <= 6; i++) {
				for (let j = 0; j <= 6; j++) {
					const nx = -1 + i / 3, ny = -1 + j / 3;
					const at = (nz: number) => {
						const w = inv[3] * nx + inv[7] * ny + inv[11] * nz + inv[15];
						return [0, 1, 2].map((k) => (inv[k] * nx + inv[4 + k] * ny + inv[8 + k] * nz + inv[12 + k]) / w);
					};
					const a = at(-1), b = at(1), t = (height - a[1]) / (b[1] - a[1]);
					if (!(t > 0 && t < 1)) continue;
					const p = [a[0] + (b[0] - a[0]) * t, height, a[2] + (b[2] - a[2]) * t];
					if (-(v[2] * p[0] + v[6] * p[1] + v[10] * p[2] + v[14]) > limit) continue;
					const x = light[0] * p[0] + light[4] * p[1] + light[8] * p[2] + light[12];
					const y = light[1] * p[0] + light[5] * p[1] + light[9] * p[2] + light[13];
					worst = Math.max(worst, Math.abs(x), Math.abs(y));
				}
			}
		}
		if (worst > 1) this.missed++;
		this.worst = Math.max(this.worst, worst);
	}

	/** Where the last frame's shadow map meets the ground: its four edges, followed along the light down to y = 0. */
	drawOutline () {
		const id = (this.renderer as unknown as { _shadowLightId: string })._shadowLightId;
		const light = this.renderer.shadowManager?.getLightSpaceMatrix(id);
		if (!light) return;
		const m = new IgeMatrix4();
		m.matrix.set(light);
		const inv = m.getInverse()?.matrix;
		if (!inv) return;
		const world = (x: number, y: number, z: number) => [0, 1, 2].map((k) => inv[k] * x + inv[4 + k] * y + inv[8 + k] * z + inv[12 + k]);
		const ground = (x: number, y: number) => {
			const a = world(x, y, -1), b = world(x, y, 1), t = (0 - a[1]) / (b[1] - a[1]);
			return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t];
		};
		const corners = [ground(-1, -1), ground(1, -1), ground(1, 1), ground(-1, 1)];
		for (let i = 0; i < 4; i++) {
			const a = corners[i], b = corners[(i + 1) % 4];
			for (const lift of [0.2, 0.4, 0.6]) this.renderer.debugLine(a[0], lift * M, a[1], b[0], lift * M, b[1], { r: 1, g: 0.1, b: 0.9, a: 1 });
		}
	}

	hud () {
		const s = this.renderer.stats(), m = s.gpuMemory, mb = (b: number) => (b / 1048576).toFixed(1);
		const gpu = this.gpuMs.length ? this.gpuMs.reduce((a, b) => a + b, 0) / this.gpuMs.length : null;
		const fit = this.renderer.shadowFit();
		const light = this.renderer.shadowManager?.getLightSpaceMatrix((this.renderer as unknown as { _shadowLightId: string })._shadowLightId);
		const across = light ? [2 / Math.hypot(light[0], light[4], light[8]) / M, 2 / Math.hypot(light[1], light[5], light[9]) / M] : [0, 0];
		this.fps = Math.round(this.frames * 4);
		(document.getElementById("hud") as HTMLElement).textContent = [
			`view ${this.view} · shadow map ${fit.enabled ? "fitted" : "square"} ${across[0].toFixed(0)} x ${across[1].toFixed(0)} m · caching ${this.renderer.shadowCaching() ? "on" : "off"}${this.view === "street" && fit.enabled ? ` · to ${this.distance} m` : ""}`,
			`corners in the map: ${this.worst <= 1 ? "yes" : "NO"} (worst ${this.worst.toFixed(3)}), frames missing some ${this.missed}`,
			`fps ${this.fps} · GPU ${gpu === null ? "n/a" : gpu.toFixed(2) + " ms"} · draws ${s.drawCalls} + ${s.instancedDrawCalls} instanced · shadow draws ${s.shadowDrawCalls} · cache rebuilds ${this.cacheRebuilds * 4}/s`,
			`GPU memory ${mb(m.total)} MB: geometry ${mb(m.geometry)}, textures ${mb(m.textures)}, render targets ${mb(m.renderTargets)}, shadow maps ${mb(m.shadowMaps)}, buffers ${mb(m.buffers)}, canvas ${mb(m.canvas)}`,
			`stress ${this.stress ? "on" : "off"} · decals ${this.decals?.decalCount()} · particles ${this.smoke?.particleCount()} · added ${this.added.decals} decals, ${this.added.particles} particles · GL errors ${params.get("glcheck") === "1" ? this.glErrors : "not checked"}`
		].join("\n");
		this.frames = 0;
		this.worst = 0;
		this.cacheRebuilds = 0;
		this.gpuMs.length = 0;
	}
}
