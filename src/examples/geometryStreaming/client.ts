import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";
import { IgeBehaviourType } from "@/enums";
import { igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import { getModelParts } from "@/engine/webgl/IgeModelParts";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IGE_QUANTISED_ENCODINGS } from "@/engine/webgl/IgeVertexPacking";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { type BlockLibrary, type ChunkFormat, pieceLibraryGlb, STREET_Z, WORLD_HALF } from "./blocks";
import type { ChunkWorkerRequest } from "./chunkWorker";
import { ChunkStreamer, type StreamerSettings } from "./streamer";

// @ts-ignore
window.ige = ige;

/**
 * Streams a generated town of merged, quantised blocks round a camera flying over it, to compare the geometry
 * pipeline's two ways of getting chunks onto the GPU:
 *
 * - `?mode=before`: the city spike's way. Workers merge chunks into plain float arrays; the main thread interleaves
 *   and uploads each chunk as it puts it in (two a frame, within 4 ms).
 * - `?mode=after` (the default): workers merge and pack chunks, quantised, in the renderer's layout; the main thread
 *   only copies them to the GPU, at most `budgetKb` kilobytes or `budgetMs` milliseconds a frame.
 *
 * `?bench=1` flies a fixed route for 40 s and reports frame times (p50, p95, p99, worst, frames over 33 ms), the
 * main thread's chunk and upload work, and the GPU memory the chunks hold. Run it with Chrome's CPU throttled 4×
 * (DevTools, Performance) to stand in for a slow laptop. Other switches: `format=quantised|packed|arrays`,
 * `budgetKb`, `budgetMs`, `radius`, `walkers=0`, `fly=0` (stay at the start).
 */
export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer?: IgeWebGlRenderer;
	streamer?: ChunkStreamer;
	params = new URLSearchParams(window.location.search);
	/** Frame times (ms between requestAnimationFrame callbacks, timed as each runs). */
	frames: number[] = [];
	/** Per frame: main-thread ms putting chunks in, ms uploading. */
	chunkMs: number[] = [];
	uploadMs: number[] = [];
	geometryPeak = 0;
	recording = false;

	constructor () {
		super();
		void this.init();
	}

	async init () {
		const p = this.params;
		const mode = p.get("mode") === "before" ? "before" : "after";
		const format = (p.get("format") as ChunkFormat | null) ?? (mode === "before" ? "arrays" : "quantised");
		const budgetKb = Number(p.get("budgetKb") ?? (mode === "before" ? 0 : 1024));
		const budgetMs = Number(p.get("budgetMs") ?? (mode === "before" ? 0 : 2));

		const renderer = (this.renderer = new IgeWebGlRenderer());
		ige.engine.renderer(renderer);
		await renderer.setup();
		renderer.createFrontBuffer(true);
		renderer.maxPixelRatio(1.5);
		renderer.backFaceCulling(true);
		// The upload budget: 0 for either means none (everything uploads as it's asked for)
		renderer.uploadBudget({ bytes: budgetKb * 1024, ms: budgetMs });
		await ige.engine.start();

		const scene = new IgeScene2d().id("scene");
		const viewport = new IgeViewport().id("viewport").autoSize(true).scene(scene).mount(ige.engine);
		const camera = viewport.camera;
		camera.projectionType("perspective");
		camera.fov(60);
		camera.near(0.5);
		camera.far(1200);
		renderer.setClearColor(0.62, 0.7, 0.8, 1);
		const radius = Number(p.get("radius") ?? 256);
		renderer.fog({ mode: "linear", color: { r: 0.62, g: 0.7, b: 0.8 }, near: radius * 0.6, far: radius + 40 });

		const lights = renderer.lightManager!;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.55, 0.6, 0.7);
		ambient.intensity(0.7);
		ambient.mount(scene);
		lights.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.96, 0.88);
		sun.intensity(1.1);
		sun.direction(-0.45, -0.75, -0.5);
		sun.shadowBias(0.0005);
		sun.mount(scene);
		lights.addLight(sun);
		renderer.shadowManager?.frustumSize(180);
		renderer.enableShadows(sun, 2048);

		// The pieces: a quantised glTF made here (its atlas drawn on a canvas), loaded as any model would be
		const atlas = drawAtlas();
		const png = new Uint8Array(await (await new Promise<Blob>((resolve) => atlas.toBlob((b) => resolve(b!), "image/png"))).arrayBuffer());
		const model = await igeGltfLoader.parse(pieceLibraryGlb(png), "blocks");
		const parts = getModelParts(model);
		const block = parts[0];
		const library: BlockLibrary = {
			block: {
				mesh: { vertices: block.geometryData.vertices!.slice(), normals: block.geometryData.normals!.slice(), uvs: block.geometryData.uvs!.slice(), indices: block.geometryData.indices!.slice() },
				matrix: block.matrix ? Array.from(block.matrix) : undefined
			}
		};
		const atlasMaterial = { ...block.materialData, roughness: 0.9, metallic: 0 };
		const pavingTexture = new IgeTexture("paving");
		pavingTexture._setImage(drawPaving() as any);
		const pavingMaterial = { color: { r: 1, g: 1, b: 1, a: 1 }, roughness: 0.95, metallic: 0 };

		// Bollards: the glTF piece drawn as it was loaded (quantised on the GPU, instanced, casting shadows)
		const town = new IgeEntity().id("town").mount(scene);
		for (let i = 0; i < 24; i++) {
			new IgeEntity().model(model).translateTo(-WORLD_HALF + 90 + i * 3, 0, STREET_Z + 5 * (i % 2 ? 1 : -1)).scaleTo(0.35, 1.1, 0.35).mount(town);
		}

		// Walkers: a skinned, instanced model whose normals, texture coordinates and weights are kept compact on the GPU
		if (p.get("walkers") !== "0") await this.addWalkers(town);

		const workers: Worker[] = [];
		for (let i = 0; i < 2; i++) {
			const w = new Worker(new URL("./chunkWorker.ts", import.meta.url));
			w.postMessage({ type: "init", library } satisfies ChunkWorkerRequest);
			workers.push(w);
		}
		const settings: StreamerSettings = mode === "before"
			? { radius, hysteresis: 24, format, maxInFlight: 4, attachPerFrame: 2, attachBudgetMs: 4 }
			: { radius, hysteresis: 24, format, maxInFlight: 4, attachPerFrame: 8, attachBudgetMs: 4 };
		const streamer = (this.streamer = new ChunkStreamer({ renderer, parent: town, workers, settings, atlasMaterial, pavingMaterial, pavingTexture }));

		// The route: east along a street, then north up another (30 m/s, 22 m up); the camera looks 40 m ahead
		const route = (t: number) => {
			const east = 30 * Math.min(t, 30), north = 30 * Math.max(0, t - 30);
			return { x: -WORLD_HALF + 64 + east, z: STREET_Z + north, dx: t < 30 ? 1 : 0, dz: t < 30 ? 0 : 1 };
		};
		const bench = p.get("bench") === "1";
		const fly = p.get("fly") !== "0";
		let start = -1;
		scene.addBehaviour(IgeBehaviourType.preUpdate, "fly", () => {
			const now = performance.now();
			const t = start < 0 || !fly ? 0 : (now - start) / 1000;
			const at = route(Math.min(t, 40));
			camera.translateTo(at.x - at.dx * 30, 22, at.z - at.dz * 30);
			camera.lookAtPoint(new IgePoint3d(at.x + at.dx * 40, 0, at.z + at.dz * 40));
			streamer.update(at.x, at.z);
		});

		const hud = document.getElementById("hud")!;
		const setup = `${mode}: ${format}${budgetKb || budgetMs ? `, upload budget ${budgetKb ? `${budgetKb} kB` : ""}${budgetKb && budgetMs ? " / " : ""}${budgetMs ? `${budgetMs} ms` : ""}` : ", no upload budget"}`;
		let last = performance.now();
		const tick = () => {
			const now = performance.now();
			const dt = now - last;
			last = now;
			const stats = renderer.stats();
			this.geometryPeak = Math.max(this.geometryPeak, stats.gpuMemory.geometry);
			if (this.recording) {
				this.frames.push(dt);
				this.chunkMs.push(streamer.frameMs);
				this.uploadMs.push(stats.uploadMs);
			}
			const c = streamer.counts();
			hud.textContent = `${setup}\nchunks shown ${c.shown}, waiting ${c.pending}, uploads queued ${stats.uploadsQueued}\n` +
				`frame ${dt.toFixed(1)} ms, chunk work ${streamer.frameMs.toFixed(1)} ms, uploads ${stats.uploadMs.toFixed(1)} ms\n` +
				`meshes on the GPU ${(stats.gpuMemory.geometry / 1048576).toFixed(1)} MB (peak ${(this.geometryPeak / 1048576).toFixed(1)})\n` +
				`draws ${stats.drawCalls + stats.instancedDrawCalls}, triangles ${(stats.triangles / 1000).toFixed(0)}k` +
				(this.recording ? `\nrecording ${(((now - start) / 1000)).toFixed(0)} / 40 s` : "");
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);

		// Wait for the chunks round the start, a second more, then fly (and record, with ?bench=1)
		const settled = () => streamer.counts().pending === 0 && renderer.stats().uploadsQueued === 0 && streamer.counts().shown > 0;
		while (!settled()) await new Promise((r) => setTimeout(r, 100));
		await new Promise((r) => setTimeout(r, 1000));
		this.geometryPeak = 0;
		start = performance.now();
		if (!bench) return;
		this.recording = true;
		await new Promise((r) => setTimeout(r, 40000));
		this.recording = false;
		const result = this.report(setup);
		(window as any).__bench = result;
		hud.textContent += `\n\n${JSON.stringify(result, null, 1)}`;
		console.log("bench", JSON.stringify(result));
	}

	/** CesiumMan walking near the start: a skinned model, its compact attributes kept compact on the GPU. */
	async addWalkers (parent: IgeEntity): Promise<void> {
		const man = await igeGltfLoader.load("../../assets/models/CesiumMan.glb", "walker");
		for (const part of getModelParts(man)) part.geometryData.vertexEncodings = IGE_QUANTISED_ENCODINGS;
		for (let i = 0; i < 6; i++) {
			new IgeEntity().model(man, { animation: man.animations?.[0]?.name }).translateTo(-WORLD_HALF + 96 + i * 7, 0, STREET_Z - 2 + (i % 3) * 2).rotateTo(0, Math.PI / 2, 0).scaleTo(2.2, 2.2, 2.2).mount(parent);
		}
	}

	/** Percentiles and hitches of what was recorded. */
	report (setup: string) {
		const pct = (list: number[], q: number) => {
			const sorted = [...list].sort((a, b) => a - b);
			return +sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(1);
		};
		const max = (list: number[]) => +Math.max(...list).toFixed(1);
		const built = this.streamer!.built;
		return {
			setup,
			frames: this.frames.length,
			fps: +(1000 / (this.frames.reduce((a, b) => a + b, 0) / this.frames.length)).toFixed(0),
			frame: { p50: pct(this.frames, 0.5), p95: pct(this.frames, 0.95), p99: pct(this.frames, 0.99), worst: max(this.frames) },
			hitchesOver33ms: this.frames.filter((f) => f > 33).length,
			chunkWorkMs: { p95: pct(this.chunkMs, 0.95), worst: max(this.chunkMs) },
			uploadMs: { p95: pct(this.uploadMs, 0.95), worst: max(this.uploadMs) },
			chunksBuilt: built.length,
			buildMsInWorker: +(built.reduce((a, b) => a + b.ms, 0) / Math.max(1, built.length)).toFixed(1),
			trianglesPerChunk: Math.round(built.reduce((a, b) => a + b.triangles, 0) / Math.max(1, built.length)),
			blocksPerChunk: Math.round(built.reduce((a, b) => a + b.blocks, 0) / Math.max(1, built.length)),
			geometryMbPeak: +(this.geometryPeak / 1048576).toFixed(1),
			geometryMbEnd: +(this.renderer!.stats().gpuMemory.geometry / 1048576).toFixed(1),
			jsHeapMb: (performance as any).memory ? +((performance as any).memory.usedJSHeapSize / 1048576).toFixed(0) : null
		};
	}
}

/** The 2 × 2 atlas: brick, render, glass and roof, each with some texture so mipmaps show. */
function drawAtlas (): HTMLCanvasElement {
	const size = 512, half = size / 2;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	const rnd = (() => {
		let a = 7;
		return () => ((a = (a * 16807) % 2147483647) / 2147483647);
	})();
	// Brick: courses of 16 × 8 px
	ctx.fillStyle = "#b8b0a8";
	ctx.fillRect(0, 0, half, half);
	for (let y = 0; y < half; y += 8) {
		for (let x = (y / 8) % 2 ? -8 : 0; x < half; x += 16) {
			const s = 200 + Math.floor(rnd() * 40);
			ctx.fillStyle = `rgb(${s}, ${s - 70}, ${s - 90})`;
			ctx.fillRect(x + 1, y + 1, 14, 6);
		}
	}
	// Render: pale, with speckle
	ctx.fillStyle = "#e8e4da";
	ctx.fillRect(half, 0, half, half);
	for (let i = 0; i < 3000; i++) {
		ctx.fillStyle = rnd() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)";
		ctx.fillRect(half + rnd() * half, rnd() * half, 2, 2);
	}
	// Glass: a frame round a sky reflection
	ctx.fillStyle = "#30343a";
	ctx.fillRect(0, half, half, half);
	const g = ctx.createLinearGradient(0, half, 0, size);
	g.addColorStop(0, "#9cc4e8");
	g.addColorStop(1, "#40607e");
	ctx.fillStyle = g;
	ctx.fillRect(20, half + 20, half - 40, half - 40);
	ctx.fillStyle = "#30343a";
	ctx.fillRect(half / 2 - 6, half, 12, half);
	// Roof: dark felt
	ctx.fillStyle = "#5c5c60";
	ctx.fillRect(half, half, half, half);
	for (let i = 0; i < 2000; i++) {
		ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.15})`;
		ctx.fillRect(half + rnd() * half, half + rnd() * half, 3, 3);
	}
	return canvas;
}

/** Flagstones: 4 × 4 slabs of 0.5 m to a 2 m tile, slightly different shades. */
function drawPaving (): HTMLCanvasElement {
	const size = 256, slab = size / 4;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d")!;
	ctx.fillStyle = "#6e6c68";
	ctx.fillRect(0, 0, size, size);
	for (let y = 0; y < 4; y++) {
		for (let x = 0; x < 4; x++) {
			const s = 150 + ((x * 7 + y * 13) % 5) * 8;
			ctx.fillStyle = `rgb(${s}, ${s - 3}, ${s - 8})`;
			ctx.fillRect(x * slab + 2, y * slab + 2, slab - 4, slab - 4);
		}
	}
	return canvas;
}
