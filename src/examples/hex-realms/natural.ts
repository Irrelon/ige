import { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import { addTree, type ColorUv, type TerrainDecor } from "./chunkMesh";
import { FOGGED, UNEXPLORED } from "./fog";
import { EDGE_X, EDGE_Z, type HexLayout, ODD_R_NEIGHBOURS, SQRT3 } from "./hex";
import type { HexMap } from "./mapGen";
import type { MeshBuilder } from "./meshBuilder";
import { mulberry32, SimplexNoise2d } from "./noise";
import { fogColor, PALETTE_COLORS, type PaletteKey, SHADE_MAX, SHADE_MIN } from "./palette";
import type { TerrainSurface } from "./surface";
import { Feature, Relief, Terrain, TERRAIN_INFO } from "./terrain";

/**
 * Civilization-style "natural" terrain. The hex grid still drives the game,
 * but the ground is one continuous heightfield:
 *
 * - Each tile contributes a base height (sea floor, coast, lowland, hills,
 *   mountains) through a smooth kernel reaching its neighbours' centres, so
 *   heights blend across tile edges into slopes, beaches and valleys.
 * - Mountain and hill tiles add peaks and bumps that sum where they meet,
 *   so adjacent mountain tiles become ranges; ridged noise makes them craggy.
 * - Water is the heightfield clamped flat at sea level; the sea floor below
 *   decides its colour, so shallows, reefs and coastlines come out naturally.
 *
 * Colour can't come from vertex colours (the lit shader ignores them), so
 * every chunk bakes its own colour texture: blended biome colours, forest
 * canopy, beaches, rock on steep slopes, snow by altitude and water by depth.
 * The bottom rows of that texture hold swatches for the tree meshes.
 */

export const SEA_LEVEL = 0;

const DEEP_HEIGHT = -34;
const FULL_STEP = 17;
const LITE_STEP = 52;
const SKIRT_DEPTH = 45;
const SNOW_LINE = 92;

const WATER_SHALLOW = [74, 164, 198];
const WATER_DEEP = [20, 60, 116];
const FOAM = [226, 240, 244];
const SAND = [214, 192, 140];
const GRAVEL = [150, 146, 136];
const ROCK = [116, 108, 98];
const SNOW = [244, 247, 250];
const CANOPY = [36, 90, 50];

/** Per-vertex blend channels: rgb, beach rgb, forest, explored, visible. */
const ATTR_CHANNELS = 9;

/** Unexplored land lies flat as a parchment map at this height. */
const PAPER_Y = 3;
const PARCHMENT = PALETTE_COLORS.parchment;
const INK = [112, 84, 54];
/** Half-width of the inked hex lines on the parchment (world units). */
const INK_WIDTH = 3;

/** Tree colour swatches; the same keys follow again as fogged versions. */
const SWATCHES: PaletteKey[] = ["forest", "pine", "jungle"];
const SWATCH_ROWS = 3;
/** Texels per grid step in each direction (3 gives ~6 world units per texel). */
const TEXELS_PER_STEP = 3;

export interface ChunkRect {
	x0: number;
	x1: number;
	z0: number;
	z1: number;
}

/** Texture layout of a natural chunk, needed to map UVs for its lite mesh. */
export interface NaturalTextureLayout {
	width: number;
	/** Rows covering the terrain (swatches follow below). */
	terrainHeight: number;
	height: number;
}

export interface NaturalChunk {
	geometry: IgeGeometryData3d | null;
	texture: IgeTexture;
	textureLayout: NaturalTextureLayout;
	/** The texture is shared by several chunks: don't destroy it with this one. */
	shared?: boolean;
}

function smoothstep (e0: number, e1: number, x: number): number {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
}

export class NaturalTerrain implements TerrainSurface {
	readonly style = "natural";
	readonly pickTop = 260;

	protected _map: HexMap;
	protected _layout: HexLayout;
	protected _noise: SimplexNoise2d;
	protected _tmp = { col: 0, row: 0 };

	// Per-tile inputs to the blend
	protected _base: Float32Array;
	protected _peak: Float32Array;
	protected _hill: Float32Array;
	protected _color: Float32Array; // rgb
	protected _beach: Float32Array; // rgb
	protected _forest: Float32Array;

	protected _tileHeights: Float32Array;
	protected _overlayHeights: Float32Array;
	/** Fog view of the human player per tile (UNEXPLORED / FOGGED / VISIBLE). */
	protected _view: Uint8Array;

	/**
	 * Blended attributes from the last sample(): colours (when requested) and
	 * always how explored (e) and visible (v) the point is, from 0 to 1.
	 */
	protected _s = { r: 0, g: 0, b: 0, br: 0, bg: 0, bb: 0, forest: 0, e: 1, v: 1 };

	/** Trees smooth or blocky (to match the art pack). */
	decor: TerrainDecor = "smooth";

	constructor (map: HexMap, layout: HexLayout, view: Uint8Array) {
		this._map = map;
		this._layout = layout;
		this._view = view;
		this._noise = new SimplexNoise2d(mulberry32(map.seed ^ 0x2c1b3c6d));

		const n = map.count;
		this._base = new Float32Array(n);
		this._peak = new Float32Array(n);
		this._hill = new Float32Array(n);
		this._color = new Float32Array(n * 3);
		this._beach = new Float32Array(n * 3);
		this._forest = new Float32Array(n);
		this._tileHeights = new Float32Array(n).fill(NaN);
		this._overlayHeights = new Float32Array(n).fill(NaN);

		const rand = mulberry32(map.seed ^ 0x51ed27);
		for (let t = 0; t < n; t++) this.updateTile(t, rand);
	}

	/** Recompute a tile's blend inputs (call after its terrain or feature changes). */
	updateTile (t: number, rand: () => number = Math.random): void {
		const map = this._map;
		const terrain = map.terrain[t] as Terrain;
		const relief = map.relief[t] as Relief;
		const info = TERRAIN_INFO[terrain];

		let base: number;
		if (terrain === Terrain.DeepOcean) base = DEEP_HEIGHT;
		else if (terrain === Terrain.Ocean) base = -12;
		else if (terrain === Terrain.Ice) base = 3;
		else base = relief === Relief.Mountain ? 32 : relief === Relief.Hills ? 22 : 10;
		this._base[t] = base;
		this._peak[t] = relief === Relief.Mountain ? 55 + rand() * 45 : 0;
		this._hill[t] = relief === Relief.Hills ? 13 + rand() * 6 : 0;

		let color = PALETTE_COLORS[info.top] as number[];
		if (relief === Relief.Mountain) color = color.map((c, i) => c * 0.4 + ROCK[i] * 0.6);
		this._color.set(color, t * 3);

		const cold = terrain === Terrain.Tundra || terrain === Terrain.Snow;
		const beach = terrain === Terrain.Ice ? PALETTE_COLORS.ice : cold ? GRAVEL : SAND;
		this._beach.set(beach as number[], t * 3);
		this._forest[t] = map.feature[t] !== Feature.None ? 1 : 0;

		this._tileHeights[t] = NaN;
		this._overlayHeights[t] = NaN;
	}

	/**
	 * Raw terrain height at a world point (below sea level under water).
	 * With `withColor`, the blended colours are left in this._s.
	 */
	sample (x: number, z: number, withColor: boolean): number {
		const map = this._map;
		const layout = this._layout;
		const K = layout.colSpacing;
		const K2 = K * K;
		const peakR = K * 0.95;
		const hillR = K * 0.8;
		const o = layout.worldToOffset(x, z, this._tmp);
		const col = o.col;
		const row = o.row;
		const dirs = ODD_R_NEIGHBOURS[row & 1];

		let sw = 0, sh = 0, bumps = 0;
		let r = 0, g = 0, b = 0, br = 0, bg = 0, bb = 0, forest = 0;
		// Fog blend over on-map tiles only, so map edges don't fade to paper
		let swMap = 0, se = 0, sv = 0;
		const view = this._view;

		// The kernel reaches exactly to neighbouring centres, so only the
		// containing tile and its six neighbours can contribute
		for (let k = -1; k < 6; k++) {
			const c = k < 0 ? col : col + dirs[k][0];
			const rr = k < 0 ? row : row + dirs[k][1];
			const dx = x - layout.centerX(c, rr);
			const dz = z - layout.centerZ(rr);
			const d2 = dx * dx + dz * dz;
			if (d2 >= K2) continue;
			const q = 1 - d2 / K2;
			const w = q * q;
			sw += w;

			const t = map.inBounds(c, rr) ? rr * map.width + c : -1;
			if (t < 0) {
				sh += w * DEEP_HEIGHT;
				if (withColor) {
					br += w * SAND[0];
					bg += w * SAND[1];
					bb += w * SAND[2];
				}
				continue;
			}

			sh += w * this._base[t];
			const state = view[t];
			swMap += w;
			if (state !== UNEXPLORED) se += w;
			if (state !== UNEXPLORED && state !== FOGGED) sv += w;
			if (withColor) {
				const c3 = t * 3;
				r += w * this._color[c3];
				g += w * this._color[c3 + 1];
				b += w * this._color[c3 + 2];
				br += w * this._beach[c3];
				bg += w * this._beach[c3 + 1];
				bb += w * this._beach[c3 + 2];
				forest += w * this._forest[t];
			}

			const peak = this._peak[t];
			const hill = this._hill[t];
			if (peak > 0 || hill > 0) {
				const d = Math.sqrt(d2);
				if (peak > 0 && d < peakR) bumps += peak * Math.pow(1 - d / peakR, 1.7);
				if (hill > 0 && d < hillR) {
					const f = 1 - d / hillR;
					bumps += hill * f * f;
				}
			}
		}

		let h = sh / sw;
		const noise = this._noise;
		const land = smoothstep(-4, 8, h);
		h += noise.fbm(x / 260, z / 260, 3) * (2.5 + 4.5 * land) + noise.noise(x / 60, z / 60) * 1.6 * land;
		if (bumps > 0) h += bumps * (0.65 + 0.7 * noise.ridged(x / 120, z / 120, 2));

		const s = this._s;
		s.e = swMap > 0 ? se / swMap : 1;
		s.v = swMap > 0 ? sv / swMap : 1;
		if (withColor) {
			s.r = r / sw;
			s.g = g / sw;
			s.b = b / sw;
			s.br = br / sw;
			s.bg = bg / sw;
			s.bb = bb / sw;
			s.forest = forest / sw;
		}
		return h;
	}

	// ------------------------------------------------------------------
	// TerrainSurface
	// ------------------------------------------------------------------

	/**
	 * Shown height for a raw height and how explored the point is: terrain
	 * where explored, flattened to the parchment where not, blended between.
	 */
	displayHeight (raw: number, explored: number): number {
		const ground = Math.max(SEA_LEVEL, raw);
		return PAPER_Y + (ground - PAPER_Y) * smoothstep(0.15, 0.85, explored);
	}

	heightAt (x: number, z: number): number {
		const raw = this.sample(x, z, false);
		return this.displayHeight(raw, this._s.e);
	}

	/** Forget cached tile heights (call when the fog view changes). */
	invalidateHeights (): void {
		this._tileHeights.fill(NaN);
		this._overlayHeights.fill(NaN);
	}

	pickHeight (x: number, z: number): number {
		return this.heightAt(x, z);
	}

	tileHeight (tile: number): number {
		let h = this._tileHeights[tile];
		if (Number.isNaN(h)) {
			const map = this._map;
			h = this._tileHeights[tile] = this.heightAt(this._layout.centerX(map.col(tile), map.row(tile)), this._layout.centerZ(map.row(tile)));
		}
		return h;
	}

	overlayHeight (tile: number): number {
		let h = this._overlayHeights[tile];
		if (Number.isNaN(h)) {
			const map = this._map;
			const cx = this._layout.centerX(map.col(tile), map.row(tile));
			const cz = this._layout.centerZ(map.row(tile));
			const R = this._layout.size * 0.8;
			h = this.tileHeight(tile);
			for (let i = 0; i < 6; i++) {
				const a = (i * Math.PI) / 3;
				h = Math.max(h, this.heightAt(cx + Math.cos(a) * R, cz + Math.sin(a) * R));
			}
			this._overlayHeights[tile] = h;
		}
		return h;
	}

	// ------------------------------------------------------------------
	// Chunk building
	// ------------------------------------------------------------------

	/** Full-detail mesh, colour texture and forests for one chunk rectangle. */
	buildChunk (rect: ChunkRect, id: string, builder: MeshBuilder): NaturalChunk {
		const { x0, x1, z0, z1 } = rect;
		const nx = Math.max(2, Math.round((x1 - x0) / FULL_STEP));
		const nz = Math.max(2, Math.round((z1 - z0) / FULL_STEP));
		const dx = (x1 - x0) / nx;
		const dz = (z1 - z0) / nz;
		const vw = nx + 1;
		const vh = nz + 1;

		// Raw and shown (fog-flattened) heights on the vertex grid plus a
		// one-vertex margin (for normals), with blended colours and fog
		// amounts for the inner vertices
		const gw = nx + 3;
		const raw = new Float32Array(gw * (nz + 3));
		const shown = new Float32Array(gw * (nz + 3));
		const attrs = new Float32Array(vw * vh * ATTR_CHANNELS);
		const s = this._s;
		for (let j = 0; j < nz + 3; j++) {
			const z = z0 + (j - 1) * dz;
			for (let i = 0; i < gw; i++) {
				const x = x0 + (i - 1) * dx;
				const inner = i >= 1 && i <= vw && j >= 1 && j <= vh;
				const h = this.sample(x, z, inner);
				raw[j * gw + i] = h;
				shown[j * gw + i] = this.displayHeight(h, s.e);
				if (inner) {
					const o = ((j - 1) * vw + (i - 1)) * ATTR_CHANNELS;
					attrs[o] = s.r;
					attrs[o + 1] = s.g;
					attrs[o + 2] = s.b;
					attrs[o + 3] = s.br;
					attrs[o + 4] = s.bg;
					attrs[o + 5] = s.bb;
					attrs[o + 6] = s.forest;
					attrs[o + 7] = s.e;
					attrs[o + 8] = s.v;
				}
			}
		}

		const surf = (i: number, j: number) => shown[(j + 1) * gw + (i + 1)];
		const normals = new Float32Array(vw * vh * 3);
		for (let j = 0; j < vh; j++) {
			for (let i = 0; i < vw; i++) {
				const hx = (surf(i + 1, j) - surf(i - 1, j)) / (2 * dx);
				const hz = (surf(i, j + 1) - surf(i, j - 1)) / (2 * dz);
				const len = Math.sqrt(hx * hx + 1 + hz * hz);
				const o = (j * vw + i) * 3;
				normals[o] = -hx / len;
				normals[o + 1] = 1 / len;
				normals[o + 2] = -hz / len;
			}
		}

		const layout: NaturalTextureLayout = {
			width: nx * TEXELS_PER_STEP + 1,
			terrainHeight: nz * TEXELS_PER_STEP + 1,
			height: nz * TEXELS_PER_STEP + 1 + SWATCHES.length * 2 * SWATCH_ROWS
		};
		const texture = this._bakeTexture(`${id}_tex`, rect, layout, nx, nz, raw, gw, attrs, normals);

		// Mesh
		builder.reset();
		const uvU = (x: number) => (0.5 + ((x - x0) / (x1 - x0)) * (layout.width - 1)) / layout.width;
		const uvV = (z: number) => (0.5 + ((z - z0) / (z1 - z0)) * (layout.terrainHeight - 1)) / layout.height;
		for (let j = 0; j < vh; j++) {
			const z = z0 + j * dz;
			for (let i = 0; i < vw; i++) {
				const x = x0 + i * dx;
				const o = (j * vw + i) * 3;
				builder.vertex(x, surf(i, j), z, normals[o], normals[o + 1], normals[o + 2], uvU(x), uvV(z));
			}
		}
		addGridTriangles(builder, vw, vh);
		addSkirts(builder, vw, vh);
		this._addForests(builder, rect, layout);

		return { geometry: builder.vertexCount ? builder.toGeometry(id) : null, texture, textureLayout: layout };
	}

	/**
	 * Is the chunk, and every tile whose blending reaches into it, unexplored?
	 * Then it is plain parchment and buildParchment() can skip the terrain.
	 */
	/**
	 * Make the parchment repeat every (px, pz) world units: with the chunk size,
	 * every interior unexplored chunk then looks the same and shares one texture.
	 */
	setParchmentPeriod (px: number, pz: number): void {
		this._period.x = px;
		this._period.z = pz;
	}

	protected _period = { x: 0, z: 0 };
	protected _parchmentTextures = new Map<string, { texture: IgeTexture; layout: NaturalTextureLayout }>();

	/** Noise in [0, 1] at a scale, seamlessly tiled with the parchment period. */
	protected _tiledNoise (x: number, z: number, scale: number): number {
		const n = (a: number, b: number) => this._noise.noise(a / scale, b / scale) * 0.5 + 0.5;
		const { x: px, z: pz } = this._period;
		if (!px || !pz) return n(x, z);
		const lx = ((x % px) + px) % px, lz = ((z % pz) + pz) % pz;
		const fx = lx / px, fz = lz / pz;
		const top = n(lx, lz) * (1 - fx) + n(lx - px, lz) * fx;
		const bottom = n(lx, lz - pz) * (1 - fx) + n(lx - px, lz - pz) * fx;
		return top * (1 - fz) + bottom * fz;
	}

	isBlank (rect: ChunkRect): boolean {
		const map = this._map;
		const L = this._layout;
		const row0 = Math.max(0, Math.floor(rect.z0 / L.rowSpacing) - 3);
		const row1 = Math.min(map.height - 1, Math.ceil(rect.z1 / L.rowSpacing) + 3);
		const col0 = Math.max(0, Math.floor(rect.x0 / L.colSpacing) - 3);
		const col1 = Math.min(map.width - 1, Math.ceil(rect.x1 / L.colSpacing) + 3);
		for (let row = row0; row <= row1; row++) {
			for (let col = col0; col <= col1; col++) if (this._view[row * map.width + col] !== UNEXPLORED) return false;
		}
		return true;
	}

	/**
	 * A chunk nobody has explored: one flat sheet of parchment (two triangles
	 * and skirts) with a parchment-only texture at the usual resolution, so it
	 * meets explored neighbours seamlessly. Much cheaper than buildChunk(),
	 * which on big maps is mostly spent on chunks like this.
	 */
	buildParchment (rect: ChunkRect, id: string, builder: MeshBuilder): NaturalChunk {
		const { x0, x1, z0, z1 } = rect;
		const nx = Math.max(2, Math.round((x1 - x0) / FULL_STEP));
		const nz = Math.max(2, Math.round((z1 - z0) / FULL_STEP));
		const { x: px, z: pz } = this._period;
		const key = px && pz ? `${Math.round(x1 - x0)}x${Math.round(z1 - z0)}@${Math.round((((x0 % px) + px) % px) * 10)},${Math.round((((z0 % pz) + pz) % pz) * 10)}` : "";
		const cached = key ? this._parchmentTextures.get(key) : undefined;
		const { texture, layout } = cached ?? this._bakeParchment(rect, nx, nz, `${id}_tex`);
		if (key && !cached) this._parchmentTextures.set(key, { texture, layout });

		builder.reset();
		const u = (x: number) => (0.5 + ((x - x0) / (x1 - x0)) * (layout.width - 1)) / layout.width;
		const v = (z: number) => (0.5 + ((z - z0) / (z1 - z0)) * (layout.terrainHeight - 1)) / layout.height;
		for (const z of [z0, z1]) for (const x of [x0, x1]) builder.vertex(x, PAPER_Y, z, 0, 1, 0, u(x), v(z));
		addGridTriangles(builder, 2, 2);
		addSkirts(builder, 2, 2);
		return { geometry: builder.toGeometry(id), texture, textureLayout: layout, shared: !!key };
	}

	protected _bakeParchment (rect: ChunkRect, nx: number, nz: number, id: string): { texture: IgeTexture; layout: NaturalTextureLayout } {
		const { x0, x1, z0, z1 } = rect;
		const layout: NaturalTextureLayout = {
			width: nx * TEXELS_PER_STEP + 1,
			terrainHeight: nz * TEXELS_PER_STEP + 1,
			height: nz * TEXELS_PER_STEP + 1 + SWATCHES.length * 2 * SWATCH_ROWS
		};
		const canvas = document.createElement("canvas");
		canvas.width = layout.width;
		canvas.height = layout.height;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const image = ctx.createImageData(layout.width, layout.height);
		const data = image.data;
		const sx = (x1 - x0) / nx / TEXELS_PER_STEP;
		const sz = (z1 - z0) / nz / TEXELS_PER_STEP;
		const paper = this._paper;
		for (let py = 0; py < layout.terrainHeight; py++) {
			const wz = z0 + py * sz;
			for (let pxl = 0; pxl < layout.width; pxl++) {
				const wx = x0 + pxl * sx;
				this._parchmentAt(wx, wz, paper);
				const o = (py * layout.width + pxl) * 4;
				data[o] = paper[0];
				data[o + 1] = paper[1];
				data[o + 2] = paper[2];
				data[o + 3] = 255;
			}
		}
		this._writeSwatches(data, layout);
		ctx.putImageData(image, 0, 0);
		const texture = new IgeTexture(id);
		texture._setImage(canvas as any);
		return { texture, layout };
	}

	/** Low-detail mesh for distant chunks: a coarse grid with skirts, no trees, same texture. */
	buildLite (rect: ChunkRect, id: string, builder: MeshBuilder, layout: NaturalTextureLayout): IgeGeometryData3d | null {
		const { x0, x1, z0, z1 } = rect;
		const nx = Math.max(2, Math.round((x1 - x0) / LITE_STEP));
		const nz = Math.max(2, Math.round((z1 - z0) / LITE_STEP));
		const dx = (x1 - x0) / nx;
		const dz = (z1 - z0) / nz;
		const vw = nx + 1;
		const vh = nz + 1;
		const gw = nx + 3;
		const surf = new Float32Array(gw * (nz + 3));
		for (let j = 0; j < nz + 3; j++) {
			for (let i = 0; i < gw; i++) {
				surf[j * gw + i] = this.heightAt(x0 + (i - 1) * dx, z0 + (j - 1) * dz);
			}
		}
		const at = (i: number, j: number) => surf[(j + 1) * gw + (i + 1)];

		builder.reset();
		for (let j = 0; j < vh; j++) {
			const z = z0 + j * dz;
			for (let i = 0; i < vw; i++) {
				const x = x0 + i * dx;
				const hx = (at(i + 1, j) - at(i - 1, j)) / (2 * dx);
				const hz = (at(i, j + 1) - at(i, j - 1)) / (2 * dz);
				const len = Math.sqrt(hx * hx + 1 + hz * hz);
				builder.vertex(
					x, at(i, j), z,
					-hx / len, 1 / len, -hz / len,
					(0.5 + ((x - x0) / (x1 - x0)) * (layout.width - 1)) / layout.width,
					(0.5 + ((z - z0) / (z1 - z0)) * (layout.terrainHeight - 1)) / layout.height
				);
			}
		}
		addGridTriangles(builder, vw, vh);
		addSkirts(builder, vw, vh);
		return builder.vertexCount ? builder.toGeometry(id) : null;
	}

	protected _bakeTexture (
		id: string, rect: ChunkRect, layout: NaturalTextureLayout,
		nx: number, nz: number, raw: Float32Array, gw: number, attrs: Float32Array, normals: Float32Array
	): IgeTexture {
		const canvas = document.createElement("canvas");
		canvas.width = layout.width;
		canvas.height = layout.height;
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
		const image = ctx.createImageData(layout.width, layout.height);
		const data = image.data;
		const vw = nx + 1;
		const noise = this._noise;
		const sx = (rect.x1 - rect.x0) / nx;
		const sz = (rect.z1 - rect.z0) / nz;
		const px = new Float32Array(ATTR_CHANNELS);
		const C = ATTR_CHANNELS;

		for (let py = 0; py < layout.terrainHeight; py++) {
			// Texels fall at fixed fractions of a grid step: interpolate the grid
			const gy = py / TEXELS_PER_STEP;
			const j0 = Math.floor(gy);
			const j1 = Math.min(nz, j0 + 1);
			const ty = gy - j0;
			const wz = rect.z0 + gy * sz;

			for (let pxl = 0; pxl < layout.width; pxl++) {
				const gx = pxl / TEXELS_PER_STEP;
				const i0 = Math.floor(gx);
				const i1 = Math.min(nx, i0 + 1);
				const tx = gx - i0;
				const wx = rect.x0 + gx * sx;

				const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
				const a00 = (j0 * vw + i0), a10 = (j0 * vw + i1), a01 = (j1 * vw + i0), a11 = (j1 * vw + i1);
				for (let c = 0; c < C; c++) {
					px[c] = attrs[a00 * C + c] * w00 + attrs[a10 * C + c] * w10 + attrs[a01 * C + c] * w01 + attrs[a11 * C + c] * w11;
				}
				const h =
					raw[(j0 + 1) * gw + i0 + 1] * w00 + raw[(j0 + 1) * gw + i1 + 1] * w10 +
					raw[(j1 + 1) * gw + i0 + 1] * w01 + raw[(j1 + 1) * gw + i1 + 1] * w11;
				const ny = normals[a00 * 3 + 1] * w00 + normals[a10 * 3 + 1] * w10 + normals[a01 * 3 + 1] * w01 + normals[a11 * 3 + 1] * w11;

				let r: number, g: number, b: number;
				const grain = noise.noise(wx / 34, wz / 34) * 0.5 + 0.5;
				if (h < SEA_LEVEL) {
					const depth = SEA_LEVEL - h;
					const d = smoothstep(0, 24, depth);
					r = WATER_SHALLOW[0] + (WATER_DEEP[0] - WATER_SHALLOW[0]) * d;
					g = WATER_SHALLOW[1] + (WATER_DEEP[1] - WATER_SHALLOW[1]) * d;
					b = WATER_SHALLOW[2] + (WATER_DEEP[2] - WATER_SHALLOW[2]) * d;
					if (depth < 1.6) {
						const f = (1 - depth / 1.6) * 0.45;
						r += (FOAM[0] - r) * f;
						g += (FOAM[1] - g) * f;
						b += (FOAM[2] - b) * f;
					}
					const m = 0.97 + 0.06 * grain;
					r *= m;
					g *= m;
					b *= m;
				} else {
					r = px[0];
					g = px[1];
					b = px[2];
					const canopy = px[6] * 0.42;
					r += (CANOPY[0] - r) * canopy;
					g += (CANOPY[1] - g) * canopy;
					b += (CANOPY[2] - b) * canopy;

					const beach = smoothstep(SEA_LEVEL + 4.5, SEA_LEVEL + 1, h) * 0.85;
					r += (px[3] - r) * beach;
					g += (px[4] - g) * beach;
					b += (px[5] - b) * beach;

					const rock = smoothstep(0.86, 0.64, ny);
					r += (ROCK[0] - r) * rock;
					g += (ROCK[1] - g) * rock;
					b += (ROCK[2] - b) * rock;

					const snow = smoothstep(SNOW_LINE - 8, SNOW_LINE + 8, h + (grain - 0.5) * 14);
					r += (SNOW[0] - r) * snow;
					g += (SNOW[1] - g) * snow;
					b += (SNOW[2] - b) * snow;

					const m = 0.93 + 0.14 * grain;
					r *= m;
					g *= m;
					b *= m;
				}

				// Fog of war: explored but out of sight fades to a muted version;
				// unexplored becomes parchment, with soft edges from the blend
				const explored = px[7];
				const seen = px[8];
				const fog = explored > 0 ? 1 - smoothstep(0.3, 0.7, seen) : 0;
				if (fog > 0) {
					const [fr, fg, fb] = fogColor([r, g, b]);
					r += (fr - r) * fog;
					g += (fg - g) * fog;
					b += (fb - b) * fog;
				}
				const reveal = smoothstep(0.15, 0.85, explored);
				if (reveal < 1) {
					this._parchmentAt(wx, wz, this._paper);
					const p = this._paper;
					r = p[0] + (r - p[0]) * reveal;
					g = p[1] + (g - p[1]) * reveal;
					b = p[2] + (b - p[2]) * reveal;
				}

				const o = (py * layout.width + pxl) * 4;
				data[o] = r;
				data[o + 1] = g;
				data[o + 2] = b;
				data[o + 3] = 255;
			}
		}

		this._writeSwatches(data, layout);

		ctx.putImageData(image, 0, 0);
		const texture = new IgeTexture(id);
		texture._setImage(canvas as any);
		return texture;
	}

	/** Tree colour swatches below the terrain texels: one gradient band per colour, then fogged versions. */
	protected _writeSwatches (data: Uint8ClampedArray, layout: NaturalTextureLayout): void {
		[...SWATCHES, ...SWATCHES].forEach((key, k) => {
			const [cr, cg, cb] = k < SWATCHES.length ? PALETTE_COLORS[key] : fogColor(PALETTE_COLORS[key]);
			for (let row = 0; row < SWATCH_ROWS; row++) {
				const y = layout.terrainHeight + k * SWATCH_ROWS + row;
				for (let x = 0; x < layout.width; x++) {
					const shade = SHADE_MIN + (x / (layout.width - 1)) * (SHADE_MAX - SHADE_MIN);
					const o = (y * layout.width + x) * 4;
					data[o] = cr * shade;
					data[o + 1] = cg * shade;
					data[o + 2] = cb * shade;
					data[o + 3] = 255;
				}
			}
		});
	}

	protected _paper = [0, 0, 0];
	protected _hexTmp = { col: 0, row: 0 };

	/**
	 * Parchment colour at a world point: aged paper with soft blotches and
	 * grain, and inked lines along the hex edges.
	 */
	protected _parchmentAt (x: number, z: number, out: number[]): void {
		const layout = this._layout;
		// Tiled with the chunk size, so unexplored chunks can share a texture without seams
		const grain = this._tiledNoise(x, z, 34);
		const blotch = this._tiledNoise(x, z, 420);
		const m = (0.86 + 0.12 * blotch) * (0.97 + 0.05 * grain);
		let r = PARCHMENT[0] * m, g = PARCHMENT[1] * m, b = PARCHMENT[2] * m;

		// Distance to the nearest edge of the hex containing the point
		const o = layout.worldToOffset(x, z, this._hexTmp);
		const dx = x - layout.centerX(o.col, o.row);
		const dz = z - layout.centerZ(o.row);
		let reach = 0;
		for (let i = 0; i < 6; i++) reach = Math.max(reach, dx * EDGE_X[i] + dz * EDGE_Z[i]);
		const toEdge = (layout.size * SQRT3) / 2 - reach;
		if (toEdge < INK_WIDTH) {
			const ink = (1 - toEdge / INK_WIDTH) * 0.32;
			r += (INK[0] - r) * ink;
			g += (INK[1] - g) * ink;
			b += (INK[2] - b) * ink;
		}
		out[0] = r;
		out[1] = g;
		out[2] = b;
	}

	/** Scatter trees over forested tiles whose centre lies in the chunk. */
	protected _addForests (b: MeshBuilder, rect: ChunkRect, layout: NaturalTextureLayout): void {
		const map = this._map;
		const hexLayout = this._layout;
		const R = hexLayout.size;
		const swatchUv = (fogged: boolean): ColorUv => (key, shade) => {
			const k = Math.max(0, SWATCHES.indexOf(key)) + (fogged ? SWATCHES.length : 0);
			const t = Math.min(1, Math.max(0, (shade - SHADE_MIN) / (SHADE_MAX - SHADE_MIN)));
			return [
				(0.5 + t * (layout.width - 1)) / layout.width,
				(layout.terrainHeight + k * SWATCH_ROWS + SWATCH_ROWS / 2) / layout.height
			];
		};
		const clearUv = swatchUv(false);
		const foggedUv = swatchUv(true);

		const row0 = Math.max(0, Math.floor(rect.z0 / hexLayout.rowSpacing) - 1);
		const row1 = Math.min(map.height - 1, Math.ceil(rect.z1 / hexLayout.rowSpacing) + 1);
		const col0 = Math.max(0, Math.floor(rect.x0 / hexLayout.colSpacing) - 1);
		const col1 = Math.min(map.width - 1, Math.ceil(rect.x1 / hexLayout.colSpacing) + 1);

		for (let row = row0; row <= row1; row++) {
			for (let col = col0; col <= col1; col++) {
				const t = row * map.width + col;
				const feature = map.feature[t] as Feature;
				if (feature === Feature.None || map.relief[t] === Relief.Mountain || this._view[t] === UNEXPLORED) continue;
				const uv = this._view[t] === FOGGED ? foggedUv : clearUv;
				const cx = hexLayout.centerX(col, row);
				const cz = hexLayout.centerZ(row);
				if (cx < rect.x0 || cx >= rect.x1 || cz < rect.z0 || cz >= rect.z1) continue;

				const rand = mulberry32(Math.imul(t + 7, 2246822519) ^ map.seed);
				const count = 6 + Math.floor(rand() * 3);
				for (let k = 0; k < count; k++) {
					const angle = rand() * Math.PI * 2;
					const dist = R * (0.3 + 0.55 * Math.sqrt(rand()));
					const x = cx + Math.cos(angle) * dist;
					const z = cz + Math.sin(angle) * dist;
					const raw = this.sample(x, z, false);
					if (raw < SEA_LEVEL + 1.5) continue;
					addTree(b, x, this.displayHeight(raw, this._s.e) - 0.8, z, R, 0.7 + rand() * 0.25, feature, rand, uv, this.decor);
				}
			}
		}
	}
}

function addGridTriangles (b: MeshBuilder, vw: number, vh: number): void {
	for (let j = 0; j < vh - 1; j++) {
		for (let i = 0; i < vw - 1; i++) {
			const a = j * vw + i;
			b.quadFacing(a, a + 1, a + vw + 1, a + vw, 0, 1, 0);
		}
	}
}

/**
 * Hang a strip below each edge of the grid. Neighbouring chunks at different
 * detail levels don't share edge vertices; the skirts hide the cracks.
 */
function addSkirts (b: MeshBuilder, vw: number, vh: number): void {
	const edges: [number[], number, number][] = [
		[Array.from({ length: vw }, (_, i) => i), 0, -1],
		[Array.from({ length: vw }, (_, i) => (vh - 1) * vw + i), 0, 1],
		[Array.from({ length: vh }, (_, j) => j * vw), -1, 0],
		[Array.from({ length: vh }, (_, j) => j * vw + vw - 1), 1, 0]
	];
	const p = b.positions;
	const n = b.normals;
	const uv = b.uvs;
	for (const [indices, ox, oz] of edges) {
		const below = indices.map((v) => b.vertex(
			p[v * 3], p[v * 3 + 1] - SKIRT_DEPTH, p[v * 3 + 2],
			n[v * 3], n[v * 3 + 1], n[v * 3 + 2],
			uv[v * 2], uv[v * 2 + 1]
		));
		for (let k = 0; k < indices.length - 1; k++) {
			b.quadFacing(indices[k], indices[k + 1], below[k + 1], below[k], ox, 0, oz);
		}
	}
}
