import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { buildChunk, type TerrainDecor } from "../chunkMesh";
import { UNEXPLORED } from "../fog";
import type { HexLayout } from "../hex";
import { MeshBuilder } from "../meshBuilder";
import { type ChunkRect, NaturalTerrain, type NaturalTextureLayout } from "../natural";
import { createPaletteTexture } from "../palette";
import type { Sim } from "../sim/sim";
import { type TerrainStyle, type TerrainSurface, TileSurface } from "../surface";

/**
 * Draws the map: terrain chunks in either style (stepped tiles or natural
 * heightfield), their detail levels, rebuilds after fog-of-war and terrain
 * changes, and the surface everything else stands on.
 *
 * Fog comes from the simulation, as seen by `player`.
 */

/** Chunks switch to their lite mesh when a tile would be smaller than this many CSS pixels across. */
const LITE_TILE_PX = 18;
/** Time per frame for building detail levels on demand (at least one build). */
const LOD_BUILD_BUDGET_MS = 6;
/** Time per frame for queued rebuilds (style switch, fog changes). */
const REBUILD_BUDGET_MS = 8;

interface ChunkRecord {
	entity: IgeEntity;
	cx: number;
	cy: number;
	col0: number;
	row0: number;
	rect: ChunkRect;
	x: number;
	z: number;
	version: number;
	style: TerrainStyle | null;
	full?: IgeGeometryData3d | null;
	lite?: IgeGeometryData3d | null;
	dirty: boolean;
	queued: boolean;
	texture?: IgeTexture;
	textureLayout?: NaturalTextureLayout;
	/** The texture is shared with other chunks (unexplored parchment). */
	sharedTexture?: boolean;
	lod: 0 | 1;
}

export interface TerrainViewOptions {
	sim: Sim;
	layout: HexLayout;
	renderer: IgeWebGlRenderer;
	viewport: IgeViewport;
	layer: IgeEntity;
	style: TerrainStyle;
	chunkSize: number;
	player: number;
	/** Trees, mountains and clouds smooth or blocky (to match the art pack). */
	decor?: TerrainDecor;
}

export class TerrainView {
	sim: Sim;
	layout: HexLayout;
	renderer: IgeWebGlRenderer;
	viewport: IgeViewport;
	layer: IgeEntity;
	chunkSize: number;
	player: number;
	style: TerrainStyle;
	decor: TerrainDecor;

	/** What the viewing player knows of each tile (UNEXPLORED / FOGGED / VISIBLE). */
	fogView: Uint8Array;
	surface: TerrainSurface;
	natural?: NaturalTerrain;
	tileSurface?: TileSurface;
	palette: IgeTexture;

	chunks: ChunkRecord[] = [];
	chunksX = 0;
	chunksY = 0;
	queue: number[] = [];
	builder = new MeshBuilder();
	liteChunks = 0;
	triangles = 0;
	/** Set when something was rebuilt (the caller should render a frame). */
	changed = false;

	constructor (options: TerrainViewOptions) {
		this.sim = options.sim;
		this.layout = options.layout;
		this.renderer = options.renderer;
		this.viewport = options.viewport;
		this.layer = options.layer;
		this.chunkSize = options.chunkSize;
		this.player = options.player;
		this.style = options.style;
		this.decor = options.decor ?? "smooth";
		this.fogView = new Uint8Array(this.sim.map.count);
		this.palette = createPaletteTexture("hexRealmsPalette");
		this.refreshFogView();
		this.surface = this.surfaceFor(this.style);
	}

	get map () {
		return this.sim.map;
	}

	surfaceFor (style: TerrainStyle): TerrainSurface {
		if (style === "natural") {
			if (!this.natural) {
				this.natural = new NaturalTerrain(this.map, this.layout, this.fogView);
				this.natural.decor = this.decor;
				// Interior chunks span the same stretch of the hex grid: parchment repeats with them
				this.natural.setParchmentPeriod(this.chunkSize * this.layout.colSpacing, this.chunkSize * this.layout.rowSpacing);
			}
			return this.natural;
		}
		this.tileSurface ??= new TileSurface(this.map, this.layout, this.fogView);
		this.tileSurface.blockyHills = this.decor === "blocky";
		return this.tileSurface;
	}

	unexploredLook (): "cloud" | "parchment" {
		return this.style === "natural" ? "parchment" : "cloud";
	}

	// ------------------------------------------------------------------
	// Building
	// ------------------------------------------------------------------

	/** Create every chunk and build it, yielding so a loading bar can move. */
	async build (progress: (done: number, total: number) => Promise<void>): Promise<void> {
		const map = this.map;
		const size = this.chunkSize;
		const cs = this.layout.colSpacing;
		const rs = this.layout.rowSpacing;
		const R = this.layout.size;
		this.chunksX = Math.ceil(map.width / size);
		this.chunksY = Math.ceil(map.height / size);
		const total = this.chunksX * this.chunksY;
		let last = performance.now();

		for (let cy = 0; cy < this.chunksY; cy++) {
			for (let cx = 0; cx < this.chunksX; cx++) {
				const col0 = cx * size, row0 = cy * size;
				const rect: ChunkRect = {
					x0: cx === 0 ? -cs / 2 : col0 * cs - cs / 2,
					x1: cx === this.chunksX - 1 ? map.width * cs : (col0 + size) * cs - cs / 2,
					z0: cy === 0 ? -R : row0 * rs - rs / 2,
					z1: cy === this.chunksY - 1 ? (map.height - 1) * rs + R : (row0 + size) * rs - rs / 2
				};
				const entity = new IgeEntity();
				entity.id(`chunk_${cx}_${cy}`);
				entity._materialData = { color: { r: 1, g: 1, b: 1, a: 1 }, roughness: 0.9 };
				entity.mount(this.layer);
				const chunk: ChunkRecord = {
					entity, cx, cy, col0, row0, rect,
					x: (rect.x0 + rect.x1) / 2,
					z: (rect.z0 + rect.z1) / 2,
					version: 0, style: null, full: null, dirty: false, queued: false, lod: 0
				};
				this.chunks.push(chunk);
				this.buildChunkMesh(chunk);
				if (performance.now() - last > 30) {
					await progress(this.chunks.length, total);
					last = performance.now();
				}
			}
		}
	}

	/**
	 * (Re)build a chunk in the active style. Natural chunks always build
	 * their full mesh (it carries the colour texture); tile chunks build only
	 * the level the camera needs, and update() builds the other on demand.
	 */
	buildChunkMesh (chunk: ChunkRecord): void {
		const old = { full: chunk.full?.id, lite: chunk.lite?.id, texture: chunk.sharedTexture ? undefined : chunk.texture };
		chunk.version++;
		chunk.full = undefined;
		chunk.lite = undefined;

		if (this.style === "natural") {
			const id = `chunk_${chunk.cx}_${chunk.cy}_natural_v${chunk.version}`;
			const natural = this.natural as NaturalTerrain;
			// Unexplored chunks are flat parchment: quick to build, and too simple to need a lite level
			const blank = natural.isBlank(chunk.rect);
			const built = blank ? natural.buildParchment(chunk.rect, id, this.builder) : natural.buildChunk(chunk.rect, id, this.builder);
			chunk.full = built.geometry;
			if (blank) chunk.lite = null;
			chunk.texture = built.texture;
			chunk.sharedTexture = !!built.shared;
			chunk.textureLayout = built.textureLayout;
			chunk.entity.texture(built.texture);
			chunk.lod = 0;
		} else {
			chunk.texture = undefined;
			chunk.sharedTexture = false;
			chunk.textureLayout = undefined;
			chunk.entity.texture(this.palette);
			const wantLite = this.chunkTilePx(chunk) < (chunk.lod === 1 ? LITE_TILE_PX * 1.15 : LITE_TILE_PX);
			chunk.style = this.style;
			if (wantLite) chunk.lite = this.buildLevel(chunk, "lite");
			else chunk.full = this.buildLevel(chunk, "full");
			chunk.lod = wantLite ? 1 : 0;
		}

		chunk.style = this.style;
		chunk.dirty = false;
		const shown = chunk.lod === 1 ? chunk.lite : chunk.full;
		if (shown) chunk.entity._geometryData = shown;
		if (old.full) this.renderer.releaseGeometry(old.full);
		if (old.lite) this.renderer.releaseGeometry(old.lite);
		if (old.texture && old.texture !== chunk.texture) old.texture.destroy();
		this.changed = true;
	}

	buildLevel (chunk: ChunkRecord, detail: "full" | "lite"): IgeGeometryData3d | null {
		const id = `chunk_${chunk.cx}_${chunk.cy}_${this.style}_v${chunk.version}${detail === "lite" ? "_lite" : ""}`;
		if (this.style === "natural") {
			return (this.natural as NaturalTerrain).buildLite(chunk.rect, id, this.builder, chunk.textureLayout as NaturalTextureLayout);
		}
		return buildChunk(this.map, this.layout, this.builder, chunk.col0, chunk.row0, this.chunkSize, id, detail, this.fogView, this.decor);
	}

	chunkTilePx (chunk: ChunkRecord): number {
		const camera = this.viewport.camera;
		const height = this.viewport._bounds2d.y || window.innerHeight;
		const k = (this.layout.size * height) / Math.tan(((camera.fov() as number) * Math.PI) / 360);
		const cp = camera._translate;
		const dx = chunk.x - cp.x, dy = cp.y, dz = chunk.z - cp.z;
		return k / Math.sqrt(dx * dx + dy * dy + dz * dz);
	}

	chunkIndexOfTile (tile: number): number {
		const size = this.chunkSize;
		return Math.floor(this.map.row(tile) / size) * this.chunksX + Math.floor(this.map.col(tile) / size);
	}

	// ------------------------------------------------------------------
	// Style, fog and terrain changes
	// ------------------------------------------------------------------

	/** Switch terrain style; chunks rebuild progressively. Returns true if it changed. */
	setStyle (style: TerrainStyle): boolean {
		if (style === this.style) return false;
		this.style = style;
		this.surface = this.surfaceFor(style);
		this.queueChunks(this.chunks.map((_, i) => i));
		return true;
	}

	/** Switch trees, mountains and clouds between smooth and blocky; chunks rebuild progressively. */
	setDecor (decor: TerrainDecor): boolean {
		if (decor === this.decor) return false;
		this.decor = decor;
		if (this.natural) this.natural.decor = decor;
		if (this.tileSurface) this.tileSurface.blockyHills = decor === "blocky";
		this.queueChunks(this.chunks.map((_, i) => i));
		return true;
	}

	/**
	 * Re-read what the viewer knows of some tiles; queues the chunks that
	 * show them. Returns the tiles whose state changed.
	 */
	applyFog (tiles: Iterable<number>): number[] {
		const changed: number[] = [];
		for (const t of tiles) {
			const state = this.sim.viewOf(this.player, t);
			if (this.fogView[t] === state) continue;
			this.fogView[t] = state;
			changed.push(t);
		}
		if (!changed.length) return changed;
		this.natural?.invalidateHeights();
		if (this.chunks.length) {
			const reach = this.style === "natural" ? 2 : 1;
			const affected = new Set<number>();
			if (changed.length > 4000) {
				this.chunks.forEach((_, i) => affected.add(i));
			} else {
				for (const t of changed) {
					affected.add(this.chunkIndexOfTile(t));
					for (const n of this.sim.tilesWithin(t, reach)) affected.add(this.chunkIndexOfTile(n));
				}
			}
			this.queueChunks(affected);
		}
		this.changed = true;
		return changed;
	}

	/** Re-read the whole fog view (fog mode changed, or a new viewing player). */
	refreshFogView (): number[] {
		const all = new Array<number>(this.map.count);
		for (let t = 0; t < this.map.count; t++) all[t] = t;
		return this.applyFog(all);
	}

	/** Rebuild the chunks around a tile whose terrain changed (a forest cleared). */
	terrainChangedAt (tile: number): void {
		this.natural?.updateTile(tile);
		const reach = this.style === "natural" ? 2 : 0;
		const affected = new Set<number>([this.chunkIndexOfTile(tile)]);
		for (const n of this.sim.tilesWithin(tile, reach)) affected.add(this.chunkIndexOfTile(n));
		for (const i of affected) {
			const chunk = this.chunks[i];
			if (chunk && chunk.style === this.style) this.buildChunkMesh(chunk);
		}
	}

	isExplored (tile: number): boolean {
		return this.fogView[tile] !== UNEXPLORED;
	}

	queueChunks (indices: Iterable<number>): void {
		for (const i of indices) {
			const chunk = this.chunks[i];
			if (!chunk) continue;
			chunk.dirty = true;
			if (!chunk.queued) {
				chunk.queued = true;
				this.queue.push(i);
			}
		}
		const cp = this.viewport.camera._translate;
		const d = (i: number) => (this.chunks[i].x - cp.x) ** 2 + (this.chunks[i].z - cp.z) ** 2;
		this.queue.sort((a, b) => d(a) - d(b));
	}

	// ------------------------------------------------------------------
	// Per frame
	// ------------------------------------------------------------------

	/** Run queued rebuilds and level-of-detail switching within a time budget. */
	update (): void {
		if (this.queue.length) {
			const start = performance.now();
			do {
				const chunk = this.chunks[this.queue.shift() as number];
				if (!chunk) continue;
				chunk.queued = false;
				if (chunk.dirty || chunk.style !== this.style) this.buildChunkMesh(chunk);
			} while (this.queue.length && performance.now() - start < REBUILD_BUDGET_MS);
		}
		this.updateLod();
	}

	protected updateLod (): void {
		const start = performance.now();
		let builds = 0, lite = 0, triangles = 0;
		const overBudget = () => builds > 0 && performance.now() - start > LOD_BUILD_BUDGET_MS;

		for (const chunk of this.chunks) {
			if (chunk.style !== this.style) continue;
			const tilePx = this.chunkTilePx(chunk);
			const wantLite = tilePx < (chunk.lod === 1 ? LITE_TILE_PX * 1.15 : LITE_TILE_PX);
			if (wantLite && chunk.lod === 0) {
				if (chunk.lite === undefined && !overBudget()) {
					builds++;
					chunk.lite = this.buildLevel(chunk, "lite");
				}
				if (chunk.lite) {
					chunk.entity._geometryData = chunk.lite;
					chunk.lod = 1;
				}
			} else if (!wantLite && chunk.lod === 1) {
				if (chunk.full === undefined && !overBudget()) {
					builds++;
					chunk.full = this.buildLevel(chunk, "full");
				}
				if (chunk.full) {
					chunk.entity._geometryData = chunk.full;
					chunk.lod = 0;
				}
			}
			// Far away, a tile chunk's full mesh is cheap to rebuild: free it
			if (this.style === "tiles" && chunk.lod === 1 && chunk.full && tilePx < LITE_TILE_PX * 0.5) {
				this.renderer.releaseGeometry(chunk.full.id);
				chunk.full = undefined;
			}
			if (chunk.lod === 1) lite++;
			const shown = chunk.entity._geometryData?.indices;
			if (shown) triangles += shown.length / 3;
		}
		if (builds > 0) this.changed = true;
		this.liteChunks = lite;
		this.triangles = triangles;
	}
}
