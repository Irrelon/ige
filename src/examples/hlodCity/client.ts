import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { IgeHlod, type IgeHlodMeshes, type IgeHlodNode } from "@/engine/webgl/IgeHlod";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import { cameraNear, CELL, CELLS, CENTRE, MAX_HEIGHT } from "./city";
import type { HlodBuildReply, HlodBuildRequest } from "./hlodWorker";

/**
 * Hierarchical level of detail (IgeHlod): a generated city 10 km across (160 x 160 chunks of 64 m, each a block of
 * boxes with windows and ledges, about 11,000 triangles a chunk, 280 million in all), flown over from street level
 * to 4 km up. Chunks are drawn at full detail near the camera; beyond 300 m, 2 x 2 groups of them as one proxy each
 * (to 1 m, windows and ledges dropped), then 4 x 4 beyond 600 m, 8 x 8 beyond 1.2 km, 16 x 16 beyond 2.4 km and
 * 32 x 32 beyond 4.8 km (each to twice the error of the one before). Chunks and proxies are
 * built in workers (igeBuildHlodProxy() for the proxies), uploaded within a budget, cross-fade as they swap, and are
 * let go once they're out of use.
 *
 * Keys: WASD fly, Q / E down and up, arrow keys (or drag) look, Shift faster; 1 to 5 jump to street level, rooftops,
 * 400 m, 1.5 km and 4 km; H HLOD on and off (off: chunks only, out to 600 m); T tint the levels; C shadow cascades
 * (1, 3); B the shadow boxes; Space pause the bench.
 *
 * Address options: ?hlod=0, ?tint=1, ?cascades=1|3|4, ?fade=0.3, ?bench=1 (a scripted flight: street level, up to
 * 4 km and back down; per-phase frame, GPU, draw and triangle figures in window.hlodBench.result and the console),
 * ?view=1..5 (start there).
 */
const params = new URLSearchParams(location.search);

/** Where each level of groups takes over (metres from the camera to the group's box): their error about 3 px away. */
const LEVEL_DISTANCES = [300, 600, 1200, 2400, 4800];
/** Without HLOD: chunks this far (and nothing beyond). */
const RING = 600;

interface View { x: number; y: number; z: number; yaw: number; pitch: number }

/** The presets (1 to 5): a street near downtown looking along it, then higher and higher over the middle. */
const PRESETS: View[] = [
	{ x: CENTRE - 1500 + 3, y: 2, z: CENTRE + 3, yaw: -Math.PI / 2, pitch: 0.02 },
	{ x: CENTRE - 1500, y: 60, z: CENTRE, yaw: -Math.PI / 2, pitch: -0.15 },
	{ x: CENTRE - 1800, y: 400, z: CENTRE + 400, yaw: -1.35, pitch: -0.35 },
	{ x: CENTRE - 3000, y: 1500, z: CENTRE + 1500, yaw: -1.1, pitch: -0.45 },
	{ x: CENTRE - 3500, y: 4000, z: CENTRE + 3500, yaw: -Math.PI / 4, pitch: -0.7 }
];

/** The bench's flight: seconds, and where the camera is then (blended between). */
const BENCH: { t: number; view: View; phase: string }[] = [
	{ t: 0, phase: "street", view: { ...PRESETS[0] } },
	{ t: 10, phase: "street", view: { ...PRESETS[0], x: PRESETS[0].x + 300 } },
	{ t: 25, phase: "climb", view: { ...PRESETS[3], x: PRESETS[3].x + 400 } },
	{ t: 35, phase: "high", view: { ...PRESETS[4] } },
	{ t: 45, phase: "high", view: { ...PRESETS[4], x: PRESETS[4].x + 1500 } },
	{ t: 60, phase: "descend", view: { ...PRESETS[0], x: PRESETS[0].x + 600 } },
	{ t: 66, phase: "street", view: { ...PRESETS[0], x: PRESETS[0].x + 750 } }
];

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer = new IgeWebGlRenderer();
	scene = new IgeScene2d();
	viewport = new IgeViewport();
	hlod?: IgeHlod;
	useHlod = params.get("hlod") !== "0";
	tint = params.get("tint") === "1";
	cascades = Number(params.get("cascades") ?? 3);
	material: IgeMaterialData = { color: { r: 1, g: 1, b: 1, a: 1 }, roughness: 0.9 };
	view: View = { ...PRESETS[Math.max(0, Math.min(4, Number(params.get("view") ?? 1) - 1))] };
	keys = new Set<string>();
	workers: Worker[] = [];
	nextWorker = 0;
	nextJob = 0;
	jobs = new Map<number, (reply: HlodBuildReply) => void>();
	/** Build figures by level: count, ms, triangles. */
	builds: { n: number; ms: number; triangles: number; source: number }[] = [];
	frames = 0;
	gpu: number[] = [];
	bench?: { start: number; paused: boolean; samples: Record<string, { frame: number[]; gpu: number[]; draws: number[]; shadowDraws: number[]; triangles: number[]; holes: number[] }>; last: number };

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
		renderer.backFaceCulling(true);
		renderer.uploadBudget({ bytes: 2 * 1048576, ms: 3 });
		renderer.setClearColor(0.66, 0.74, 0.82, 1);
		renderer.fog({ mode: "linear", color: { r: 0.66, g: 0.74, b: 0.82 }, near: 2500, far: 11000 });

		this.scene.id("city");
		this.viewport.id("view").autoSize(true).scene(this.scene).mount(ige.engine);
		const camera = this.viewport.camera;
		camera.projectionType("perspective");
		camera.fov(60);
		camera.near(1);
		camera.far(12000);

		this.lights();
		const threads = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 2));
		for (let i = 0; i < threads; i++) {
			const w = new Worker(new URL("./hlodWorker.ts", import.meta.url));
			w.onmessage = (event: MessageEvent<HlodBuildReply>) => {
				const done = this.jobs.get(event.data.id);
				this.jobs.delete(event.data.id);
				done?.(event.data);
			};
			this.workers.push(w);
		}
		this.makeHlod();

		this.scene.addBehaviour(IgeBehaviourType.preUpdate, "fly", (_e: unknown, tickDelta: number) => this.fly(Math.min(tickDelta, 100) / 1000));
		addEventListener("keydown", (e) => this.key(e));
		addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
		let drag: { x: number; y: number } | null = null;
		addEventListener("pointerdown", (e) => (drag = { x: e.clientX, y: e.clientY }));
		addEventListener("pointerup", () => (drag = null));
		addEventListener("pointermove", (e) => {
			if (!drag) return;
			this.view.yaw -= (e.clientX - drag.x) * 0.004;
			this.view.pitch = Math.max(-1.5, Math.min(1.2, this.view.pitch - (e.clientY - drag.y) * 0.004));
			drag = { x: e.clientX, y: e.clientY };
		});
		setInterval(() => this.hud(), 250);
		if (params.get("bench") === "1") this.startBench();
		(window as unknown as { demo: unknown }).demo = this;
	}

	lights () {
		const renderer = this.renderer;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.72, 0.8, 0.92);
		ambient.groundColor(0.42, 0.39, 0.34);
		ambient.intensity(0.6);
		ambient.mount(this.scene);
		renderer.lightManager?.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.95, 0.86);
		sun.intensity(1.15);
		sun.direction(-0.48, -0.78, -0.4);
		sun.mount(this.scene);
		renderer.lightManager?.addLight(sun);
		renderer.shadowManager?.shadowPlanes(1, 800);
		renderer.enableShadows(sun, 4096);
		renderer.shadowFit({ minY: -0.3, maxY: MAX_HEIGHT });
		renderer.shadowCascades({ count: this.cascades });
		renderer.lightManager?.refresh();
	}

	/** The city's HLOD, or (H) its chunks alone out to RING. */
	makeHlod () {
		this.hlod?.destroy();
		this.hlod = new IgeHlod({
			cellSize: CELL,
			cells: { x: CELLS, z: CELLS },
			minY: -0.3,
			maxY: MAX_HEIGHT,
			levels: this.useHlod ? LEVEL_DISTANCES.map((distance) => ({ distance })) : [],
			maxDistance: this.useHlod ? 12000 : RING,
			fade: Number(params.get("fade") ?? 0.3),
			concurrency: this.workers.length * 2,
			keep: 8,
			discardArrays: true,
			load: (node) => this.build(node)
		});
		this.hlod.id("hlod").mount(this.scene);
	}

	/** A node built in a worker: its meshes, with the city's one material (vertex colours). */
	build (node: IgeHlodNode): Promise<IgeHlodMeshes> {
		const id = ++this.nextJob;
		const worker = this.workers[this.nextWorker++ % this.workers.length];
		return new Promise((resolve, reject) => {
			this.jobs.set(id, (reply) => {
				if (reply.error) return reject(new Error(reply.error));
				const b = (this.builds[node.level] ??= { n: 0, ms: 0, triangles: 0, source: 0 });
				b.n++;
				b.ms += reply.ms;
				b.triangles += reply.triangles;
				b.source += reply.sourceTriangles;
				resolve({ meshes: reply.meshes.map((geometry) => ({ geometry, material: this.material })) });
			});
			worker.postMessage({ id, level: node.level, x: node.x, z: node.z, tint: this.tint } satisfies HlodBuildRequest);
		});
	}

	key (e: KeyboardEvent) {
		const k = e.key.toLowerCase();
		this.keys.add(k);
		if (k >= "1" && k <= "5") this.view = { ...PRESETS[Number(k) - 1] };
		if (k === "h") {
			this.useHlod = !this.useHlod;
			this.makeHlod();
		}
		if (k === "t") {
			this.tint = !this.tint;
			this.makeHlod();
		}
		if (k === "c") {
			this.cascades = this.cascades === 1 ? 3 : 1;
			this.renderer.shadowCascades({ count: this.cascades });
		}
		if (k === "b") this.renderer.debugDraw({ shadowFrustum: !this.renderer.debugDraw().shadowFrustum });
		if (k === " " && this.bench) this.bench.paused = !this.bench.paused;
	}

	/** Free flight (or the bench's path), then the camera and the shadow distance. */
	fly (dt: number) {
		this.frames++;
		const v = this.view;
		if (this.bench) {
			this.benchStep();
		} else {
			const speed = Math.max(15, v.y * 1.2) * (this.keys.has("shift") ? 5 : 1) * dt;
			const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
			if (this.keys.has("w")) { v.x += fx * speed; v.z += fz * speed; }
			if (this.keys.has("s")) { v.x -= fx * speed; v.z -= fz * speed; }
			if (this.keys.has("a")) { v.x += fz * speed; v.z -= fx * speed; }
			if (this.keys.has("d")) { v.x -= fz * speed; v.z += fx * speed; }
			if (this.keys.has("e")) v.y += speed;
			if (this.keys.has("q")) v.y = Math.max(1.5, v.y - speed);
			if (this.keys.has("arrowleft")) v.yaw += dt * 1.5;
			if (this.keys.has("arrowright")) v.yaw -= dt * 1.5;
			if (this.keys.has("arrowup")) v.pitch = Math.min(1.2, v.pitch + dt);
			if (this.keys.has("arrowdown")) v.pitch = Math.max(-1.5, v.pitch - dt);
		}
		const camera = this.viewport.camera;
		camera.translateTo(v.x, v.y, v.z);
		// The near plane rises with the camera, so far-off roofs keep their depths apart (see cameraNear())
		camera.near(cameraNear(v.y));
		const c = Math.cos(v.pitch);
		camera._lookAt = new IgePoint3d(v.x - Math.sin(v.yaw) * c * 100, v.y + Math.sin(v.pitch) * 100, v.z - Math.cos(v.yaw) * c * 100);
		// Shadows out to 300 m at street level, further from higher up (the view's ground is further off)
		this.renderer.shadowFit({ distance: 300 + v.y * 2.5 });
	}

	startBench () {
		const empty = () => ({ frame: [] as number[], gpu: [] as number[], draws: [] as number[], shadowDraws: [] as number[], triangles: [] as number[], holes: [] as number[] });
		this.bench = { start: -1, paused: false, samples: { street: empty(), climb: empty(), high: empty(), descend: empty() }, last: -1 };
		this.view = { ...BENCH[0].view };
	}

	/** The bench: waits for the start to load, then flies the path, recording each frame by phase. */
	benchStep () {
		const b = this.bench!, now = performance.now(), hlod = this.hlod!;
		if (b.start < 0) {
			// (Settled: nothing loading or waiting, no holes, for a second)
			const s = hlod.stats();
			if (s.loading || s.holes || s.wanted > s.loaded || this.renderer.stats().uploadsQueued) b.last = now;
			else if (b.last > 0 && now - b.last > 1000) {
				b.start = now;
				b.last = -1;
			}
			return;
		}
		if (b.paused) {
			b.start += now - b.last;
			b.last = now;
			return;
		}
		const t = (now - b.start) / 1000;
		const end = BENCH[BENCH.length - 1].t;
		if (t > end) {
			if (!(window as unknown as { hlodBench?: unknown }).hlodBench) this.finishBench();
			return;
		}
		let i = 0;
		while (i < BENCH.length - 2 && t > BENCH[i + 1].t) i++;
		const a = BENCH[i], c = BENCH[i + 1], f = Math.min(1, (t - a.t) / (c.t - a.t)), e = f * f * (3 - 2 * f);
		const lerp = (p: number, q: number) => p + (q - p) * e;
		this.view = { x: lerp(a.view.x, c.view.x), y: lerp(a.view.y, c.view.y), z: lerp(a.view.z, c.view.z), yaw: lerp(a.view.yaw, c.view.yaw), pitch: lerp(a.view.pitch, c.view.pitch) };
		const s = this.renderer.stats(), phase = b.samples[c.phase];
		if (b.last > 0) phase.frame.push(now - b.last);
		if (s.gpuMs !== null) phase.gpu.push(s.gpuMs);
		phase.draws.push(s.drawCalls + s.instancedDrawCalls);
		phase.shadowDraws.push(s.shadowDrawCalls);
		phase.triangles.push(s.triangles);
		phase.holes.push(hlod.stats().holes);
		b.last = now;
	}

	finishBench () {
		const b = this.bench!;
		const spread = (a: number[]) => {
			const s = [...a].sort((x, y) => x - y), q = (p: number) => s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100 : null;
			return { mean: s.length ? Math.round((s.reduce((x, y) => x + y, 0) / s.length) * 100) / 100 : null, p50: q(0.5), p95: q(0.95), max: q(1) };
		};
		const result: Record<string, unknown> = { hlod: this.useHlod, cascades: this.cascades };
		for (const [phase, p] of Object.entries(b.samples)) {
			result[phase] = { frames: p.frame.length, frameMs: spread(p.frame), gpuMs: spread(p.gpu), draws: spread(p.draws), shadowDraws: spread(p.shadowDraws), triangles: spread(p.triangles), holeFrames: p.holes.filter((h) => h > 0).length };
		}
		result.builds = this.builds.map((x, level) => x && { level, n: x.n, msMean: Math.round((x.ms / x.n) * 10) / 10, trianglesMean: Math.round(x.triangles / x.n), sourceMean: Math.round(x.source / x.n) });
		result.gpuMemoryMB = Math.round(this.renderer.stats().gpuMemory.total / 1048576);
		result.geometryMB = Math.round(this.renderer.stats().gpuMemory.geometry / 1048576);
		(window as unknown as { hlodBench: unknown }).hlodBench = { result };
		console.log("HLOD_BENCH", JSON.stringify(result));
	}

	hud () {
		const s = this.renderer.stats(), h = this.hlod!.stats(), v = this.view;
		const gpu = s.gpuMs === null ? "n/a" : `${s.gpuMs.toFixed(1)} ms`;
		const levels = h.drawn.map((n, l) => `${l === 0 ? "chunks" : `${1 << l}x${1 << l}`} ${n}`).join(" · ");
		const builds = this.builds.map((b, l) => b ? `L${l} ${Math.round(b.triangles / b.n)} tris, ${(b.ms / b.n).toFixed(1)} ms` : "").filter(Boolean).join(" · ");
		(document.getElementById("hud") as HTMLElement).textContent = [
			`${this.useHlod ? "HLOD" : `no HLOD (chunks to ${RING} m)`} · ${v.y.toFixed(0)} m up · fps ${this.frames * 4} · GPU ${gpu}${this.bench ? ` · bench ${this.bench.start < 0 ? "waiting for the start to load" : ((performance.now() - this.bench.start) / 1000).toFixed(0) + " s"}` : ""}`,
			`drawn: ${levels} · fading ${h.fading} · holes ${h.holes}`,
			`loaded ${h.loaded} · loading ${h.loading} · loads ${h.loads} · let go ${h.unloads} · uploads waiting ${s.uploadsQueued}`,
			`draws ${s.drawCalls + s.instancedDrawCalls} · shadow draws ${s.shadowDrawCalls} (${s.shadowCascades} cascades) · ${(s.triangles / 1e6).toFixed(2)}M triangles · GPU memory ${(s.gpuMemory.total / 1048576).toFixed(0)} MB (meshes ${(s.gpuMemory.geometry / 1048576).toFixed(0)})`,
			`built: ${builds}`
		].join("\n");
		this.frames = 0;
	}
}
