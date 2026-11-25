import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import { CHUNK_SIZE, type BuiltChunk, type ChunkFormat, WORLD_CHUNKS, WORLD_HALF } from "./blocks";
import type { ChunkWorkerReply, ChunkWorkerRequest } from "./chunkWorker";

/**
 * Streams the town's chunks round a point: asks the workers for the chunks within `radius`, puts built ones into the
 * scene nearest first, and takes chunks out (freeing their GPU buffers) once they're `hysteresis` further away.
 *
 * Putting a chunk in is making its entities and handing its meshes to the renderer. With an upload budget
 * (renderer.uploadBudget()) the renderer uploads them over the next frames and draws each chunk once it's up; without
 * one, discardGeometryArrays() uploads them there and then (as the city spike's streamer did).
 */
export interface StreamerSettings {
	/** Chunks within this many metres of the focus (to their nearest edge) are shown. */
	radius: number;
	/** Extra metres before a shown chunk is taken out. */
	hysteresis: number;
	/** How the workers hand chunks back. */
	format: ChunkFormat;
	/** Builds outstanding at once. */
	maxInFlight: number;
	/** Built chunks put into the scene per frame at most. */
	attachPerFrame: number;
	/** Keep putting chunks in while under this many milliseconds this frame (the first always goes). */
	attachBudgetMs: number;
}

interface ChunkState {
	cx: number;
	cz: number;
	/** Metres from the focus this frame. */
	d: number;
	state: "none" | "pending" | "shown";
	root?: IgeEntity;
	meshes: IgeGeometryData3d[];
}

export class ChunkStreamer {
	settings: StreamerSettings;
	/** Main-thread milliseconds spent putting chunks in this frame. */
	frameMs = 0;
	/** Chunks put in this frame. */
	frameAttached = 0;
	/** Every chunk put in: its build time (worker) and blocks and triangles. */
	readonly built: { ms: number; blocks: number; triangles: number }[] = [];
	protected _renderer: IgeWebGlRenderer;
	protected _parent: IgeEntity;
	protected _workers: Worker[];
	protected _next = 0;
	protected _inFlight = 0;
	protected _chunks = new Map<string, ChunkState>();
	protected _order: ChunkState[] = [];
	protected _ready: BuiltChunk[] = [];
	protected _materials: { atlas: IgeMaterialData; paving: IgeMaterialData };
	protected _pavingTexture: IgeTexture;

	constructor (options: {
		renderer: IgeWebGlRenderer;
		parent: IgeEntity;
		workers: Worker[];
		settings: StreamerSettings;
		atlasMaterial: IgeMaterialData;
		pavingMaterial: IgeMaterialData;
		pavingTexture: IgeTexture;
	}) {
		this._renderer = options.renderer;
		this._parent = options.parent;
		this._workers = options.workers;
		this.settings = options.settings;
		this._materials = { atlas: options.atlasMaterial, paving: options.pavingMaterial };
		this._pavingTexture = options.pavingTexture;
		for (let cx = 0; cx < WORLD_CHUNKS; cx++) {
			for (let cz = 0; cz < WORLD_CHUNKS; cz++) this._chunks.set(`${cx}_${cz}`, { cx, cz, d: 0, state: "none", meshes: [] });
		}
		this._order = [...this._chunks.values()];
		for (const w of this._workers) {
			w.onmessage = (event: MessageEvent<ChunkWorkerReply>) => {
				const msg = event.data;
				this._inFlight--;
				if (msg.type === "built") this._ready.push(msg.chunk);
				else console.error(`Chunk build failed: ${msg.message}`);
			};
		}
	}

	/** Chunks shown, and waiting (asked for or built but not yet in). */
	counts (): { shown: number; pending: number } {
		let shown = 0, pending = 0;
		for (const c of this._chunks.values()) {
			if (c.state === "shown") shown++;
			else if (c.state === "pending") pending++;
		}
		return { shown, pending };
	}

	/** Metres from (x, z) to a chunk's nearest edge. */
	protected _distance (c: { cx: number; cz: number }, x: number, z: number): number {
		const x0 = c.cx * CHUNK_SIZE - WORLD_HALF, z0 = c.cz * CHUNK_SIZE - WORLD_HALF;
		const dx = Math.max(x0 - x, 0, x - (x0 + CHUNK_SIZE)), dz = Math.max(z0 - z, 0, z - (z0 + CHUNK_SIZE));
		return Math.hypot(dx, dz);
	}

	/** Each frame, with the focus (metres): asks for, puts in and takes out chunks. */
	update (x: number, z: number): void {
		const t0 = performance.now();
		const s = this.settings;
		this.frameAttached = 0;
		// Each chunk's distance once, nearest first
		const order = this._order;
		for (const c of order) c.d = this._distance(c, x, z);
		order.sort((a, b) => a.d - b.d);
		for (const c of order) {
			const d = c.d;
			if (c.state === "shown" && d > s.radius + s.hysteresis) this._unload(c);
			else if (c.state === "none" && d <= s.radius && this._inFlight < s.maxInFlight) {
				c.state = "pending";
				this._inFlight++;
				this._workers[this._next++ % this._workers.length].postMessage({ type: "build", cx: c.cx, cz: c.cz, format: s.format } satisfies ChunkWorkerRequest);
			}
		}
		// Built chunks in, nearest first, within the frame's allowance
		if (this._ready.length > 1) this._ready.sort((a, b) => this._chunks.get(a.key)!.d - this._chunks.get(b.key)!.d);
		while (this._ready.length && this.frameAttached < s.attachPerFrame && (this.frameAttached === 0 || performance.now() - t0 < s.attachBudgetMs)) {
			const built = this._ready.shift()!;
			const c = this._chunks.get(built.key)!;
			// Wanted no longer (the camera moved on)
			if (c.d > s.radius + s.hysteresis) {
				c.state = "none";
				continue;
			}
			this._attach(c, built);
			this.frameAttached++;
		}
		this.frameMs = performance.now() - t0;
	}

	/** A built chunk into the scene: an entity per mesh, and the meshes handed to the renderer to upload. */
	protected _attach (c: ChunkState, built: BuiltChunk): void {
		const x = c.cx * CHUNK_SIZE - WORLD_HALF + CHUNK_SIZE / 2, z = c.cz * CHUNK_SIZE - WORLD_HALF + CHUNK_SIZE / 2;
		c.root = new IgeEntity().id(`chunk_${built.key}`).translateTo(x, 0, z).mount(this._parent);
		for (const m of built.meshes) {
			const entity = new IgeEntity().geometry(m.geometry).mount(c.root);
			if (m.material === "paving") entity.texture(this._pavingTexture).material(this._materials.paving);
			else entity.material(this._materials.atlas);
			// Keep only the GPU copy: uploaded now, or (with an upload budget) in its turn, the arrays freed after
			this._renderer.discardGeometryArrays(m.geometry);
			c.meshes.push(m.geometry);
		}
		c.state = "shown";
		this.built.push({ ms: built.ms, blocks: built.blocks, triangles: built.triangles });
	}

	/** A chunk out of the scene, its GPU buffers freed (or its uploads called off). */
	protected _unload (c: ChunkState): void {
		c.root?.destroy();
		c.root = undefined;
		for (const g of c.meshes) this._renderer.releaseGeometry(g);
		c.meshes = [];
		c.state = "none";
	}

	/** Everything out, the workers stopped. */
	destroy (): void {
		for (const c of this._chunks.values()) if (c.state === "shown") this._unload(c);
		for (const w of this._workers) w.terminate();
	}
}
