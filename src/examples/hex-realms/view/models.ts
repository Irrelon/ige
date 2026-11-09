import { IgeEntity } from "@/engine/core/IgeEntity";
import { type IgeGltfModel, igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import type { IgeModelLodLevel } from "@/engine/webgl/IgeModelParts";

/**
 * The game's 3D models: GLBs made with AssetFurnace and imported by
 * tools/import_model.py, listed in assets/models/models.json with their
 * bounds and animation clips. They load in the background while the game
 * runs on its primitive placeholders; each one swaps in as it arrives
 * (units and cities up front, everything else when first needed).
 * Units are rigged characters with idle, walk, attack, hit and death clips;
 * cities, buildings, wonders and monuments are static props.
 *
 * Team colours: each unit model has its team-colour areas (a tabard, a
 * cloak, a sail) painted pure magenta. For every player colour in play, a
 * copy of the model is made with those areas repainted in that colour
 * (keeping their shading), so every unit of a type looks the same but each
 * team's are easy to tell apart. A model without magenta areas gets a light
 * tint in the team colour instead.
 */

export interface ModelInfo {
	file: string;
	min: [number, number, number];
	max: [number, number, number];
	triangles: number;
	animations: string[];
	skinned: boolean;
	bytes: number;
	/** Turn the model this much (radians) so its front faces +Z. */
	yaw?: number;
}

export interface ModelFit {
	/** Target height (world units). */
	height?: number;
	/** Target footprint: the larger of width and depth (world units). */
	footprint?: number;
	/** Clip to start (skinned models). */
	animation?: string;
	/** Speed of that clip (0 holds its first frame). */
	speed?: number;
	lod?: IgeModelLodLevel[];
}

const STORAGE_KEY = "hexRealms.models";

type Rgba = { r: number; g: number; b: number; a: number };

function hexRgb (hex: string): [number, number, number] {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A light team tint for models without team-colour areas. */
export function teamTint (hex: string): Rgba {
	const [r, g, b] = hexRgb(hex);
	const mix = (v: number) => 0.55 + (v / 255) * 0.45;
	return { r: mix(r), g: mix(g), b: mix(b), a: 1 };
}

/** The JSON and binary chunks of a GLB. */
function readGlb (buffer: ArrayBuffer): { json: any; bin: Uint8Array } {
	const view = new DataView(buffer);
	let off = 12;
	let json: any = null;
	let bin = new Uint8Array(0);
	while (off < buffer.byteLength) {
		const length = view.getUint32(off, true);
		const kind = view.getUint32(off + 4, true);
		const chunk = new Uint8Array(buffer, off + 8, length);
		if (kind === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
		else if (kind === 0x004e4942) bin = chunk;
		off += 8 + length;
	}
	return { json, bin };
}

/** Append blobs to a GLB's binary chunk as new buffer views; returns their indices. */
function appendViews (json: any, binLength: number, extra: Uint8Array[]): number[] {
	let size = (binLength + 3) & ~3;
	return extra.map((blob) => {
		json.bufferViews.push({ buffer: 0, byteOffset: size, byteLength: blob.length });
		size = (size + blob.length + 3) & ~3;
		return json.bufferViews.length - 1;
	});
}

/** Encode a GLB: the document, its binary chunk and the blobs appendViews() placed after it. */
function encodeGlb (json: any, bin: Uint8Array, extra: Uint8Array[], views: number[]): ArrayBuffer {
	const pad = (n: number) => (n + 3) & ~3;
	const last = views.length ? json.bufferViews[views[views.length - 1]] : null;
	const size = pad(last ? last.byteOffset + last.byteLength : bin.length);
	json.buffers = [{ byteLength: size }];
	const text = new TextEncoder().encode(JSON.stringify(json));
	const textSize = pad(text.length);
	const out = new Uint8Array(12 + 8 + textSize + 8 + size);
	const dv = new DataView(out.buffer);
	dv.setUint32(0, 0x46546c67, true);
	dv.setUint32(4, 2, true);
	dv.setUint32(8, out.length, true);
	dv.setUint32(12, textSize, true);
	dv.setUint32(16, 0x4e4f534a, true);
	out.set(text, 20);
	out.fill(0x20, 20 + text.length, 20 + textSize);
	const binStart = 20 + textSize;
	dv.setUint32(binStart, size, true);
	dv.setUint32(binStart + 4, 0x004e4942, true);
	out.set(bin, binStart + 8);
	extra.forEach((blob, i) => out.set(blob, binStart + 8 + json.bufferViews[views[i]].byteOffset));
	return out.buffer;
}

/**
 * How strongly a pixel belongs to a magenta team-colour area (0 to 1): hue
 * 305-335 degrees (fading out over 8 degrees either side) and saturation
 * above about 0.6. The finished textures drift magenta towards a dark
 * fuchsia (most of it near 320 degrees, RGB about 141, 14, 92) and shade it;
 * darker maroon edges past 340 degrees blend into leather and wood, so they
 * are left alone. Leather, skin and wood sit at 15-35 degrees, well clear.
 */
function magenta (r: number, g: number, b: number): number {
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (max < 40 || max - min < 30) return 0;
	const sat = (max - min) / max;
	const hue = hueOf(r, g, b);
	const hueWeight = Math.max(0, Math.min(1, 1 - (Math.abs(hue - 320) - 15) / 8));
	const satWeight = Math.max(0, Math.min(1, (sat - 0.5) / 0.12));
	return hueWeight * satWeight;
}

function hueOf (r: number, g: number, b: number): number {
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (max === min) return 0;
	let hue: number;
	if (max === r) hue = ((g - b) / (max - min)) * 60;
	else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
	else hue = (4 + (r - g) / (max - min)) * 60;
	return hue < 0 ? hue + 360 : hue;
}

/**
 * Could this pixel be a shaded or highlighted part of a team area? Folds
 * come out dark crimson (hue 330-360, value down to 0.1) and highlights
 * a duller violet (hue 285-315, saturation down to 0.35), outside what
 * magenta() accepts on its own. Leather, wood and skin (hue 10-40) stay out.
 */
function nearMagenta (r: number, g: number, b: number): boolean {
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (max < 10 || (max - min) / max < 0.18) return false;
	const hue = hueOf(r, g, b);
	return hue >= 270 || hue <= 8;
}

/**
 * Spill suppression, as for a chroma key: the textures bake a pale lilac
 * cast from the magenta onto neighbouring metal and cloth (vambraces,
 * mail): lilac around hue 260-275 on steel that is otherwise blue-grey
 * (hue 200-240). Pixels outside the team areas that are a weak violet
 * (hue 250-350, saturation under 0.4) are turned grey, fully below 0.25
 * and from hue 262 up.
 */
function despill (d: Uint8ClampedArray, mask: Float32Array): void {
	for (let p = 0, i = 0; i < d.length; p++, i += 4) {
		if (mask[p] > 0) continue;
		const r = d[i], g = d[i + 1], b = d[i + 2];
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		if (max < 20 || max === min) continue;
		const sat = (max - min) / max;
		if (sat >= 0.4) continue;
		const hue = hueOf(r, g, b);
		if (hue < 250 || hue > 350) continue;
		const k = Math.min(1, (0.4 - sat) / 0.15) * Math.min(1, (hue - 250) / 12);
		const grey = 0.299 * r + 0.587 * g + 0.114 * b;
		d[i] = r + (grey - r) * k;
		d[i + 1] = g + (grey - g) * k;
		d[i + 2] = b + (grey - b) * k;
	}
}

/** Max filter over a square of radius r (separable): grows a binary mask by r pixels. */
function dilate (m: Uint8Array, w: number, h: number, r: number): Uint8Array {
	const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			let v = 0;
			for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !v; k++) v = m[y * w + k];
			tmp[y * w + x] = v;
		}
	}
	for (let x = 0; x < w; x++) {
		for (let y = 0; y < h; y++) {
			let v = 0;
			for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !v; k++) v = tmp[k * w + x];
			out[y * w + x] = v;
		}
	}
	return out;
}

/** Min filter over a square of radius r: shrinks a binary mask by r pixels. */
function erode (m: Uint8Array, w: number, h: number, r: number): Uint8Array {
	const inv = new Uint8Array(m.length);
	for (let i = 0; i < m.length; i++) inv[i] = m[i] ? 0 : 1;
	const grown = dilate(inv, w, h, r);
	for (let i = 0; i < m.length; i++) inv[i] = grown[i] ? 0 : 1;
	return inv;
}

/** An accessor's values as a flat array (floats, or integer indices). */
function accessorData (json: any, bin: Uint8Array, index: number): ArrayLike<number> & { length: number } {
	const a = json.accessors[index];
	const view = json.bufferViews[a.bufferView];
	const size = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[a.type] ?? 1;
	const kinds: Record<number, { bytes: number; read: (dv: DataView, o: number) => number }> = {
		5121: { bytes: 1, read: (dv, o) => dv.getUint8(o) },
		5123: { bytes: 2, read: (dv, o) => dv.getUint16(o, true) },
		5125: { bytes: 4, read: (dv, o) => dv.getUint32(o, true) },
		5126: { bytes: 4, read: (dv, o) => dv.getFloat32(o, true) }
	};
	const kind = kinds[a.componentType];
	const stride = view.byteStride ?? kind.bytes * size;
	const base = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
	const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
	const out = new Float64Array(a.count * size);
	for (let i = 0; i < a.count; i++) {
		for (let c = 0; c < size; c++) out[i * size + c] = kind.read(dv, base + i * stride + c * kind.bytes);
	}
	return out;
}

/**
 * Decide team areas per triangle, not per pixel: the bakes smear other
 * colours (straps, a backpack's shadow) into the magenta and magenta into
 * their neighbours, so a pixel mask alone leaves patches. Every triangle
 * that uses this texture looks at the texels it covers: if at least
 * TEAM_VOTE of them are team colour, all of them become team colour (plus
 * a texel around it, against seams); otherwise they are left as they are.
 * Team areas then follow the mesh, like a cloak or a tabard should.
 */
function voteByTriangle (json: any, bin: Uint8Array, imageIndex: number, mask: Float32Array, w: number, h: number): Uint8Array {
	const paint = new Uint8Array(w * h);
	const used = new Uint8Array(w * h);
	for (const mesh of json.meshes ?? []) {
		for (const prim of mesh.primitives ?? []) {
			const mat = json.materials?.[prim.material];
			const tex = mat?.pbrMetallicRoughness?.baseColorTexture;
			if (!tex || json.textures?.[tex.index]?.source !== imageIndex) continue;
			const uvAccessor = prim.attributes?.[`TEXCOORD_${tex.texCoord ?? 0}`];
			if (uvAccessor === undefined) continue;
			const uv = accessorData(json, bin, uvAccessor);
			const indices = prim.indices !== undefined ? accessorData(json, bin, prim.indices) : Array.from({ length: uv.length / 2 }, (_, i) => i);
			for (let t = 0; t + 2 < indices.length; t += 3) {
				const ax = uv[indices[t] * 2] * w, ay = uv[indices[t] * 2 + 1] * h;
				const bx = uv[indices[t + 1] * 2] * w, by = uv[indices[t + 1] * 2 + 1] * h;
				const cx = uv[indices[t + 2] * 2] * w, cy = uv[indices[t + 2] * 2 + 1] * h;
				const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
				if (Math.abs(area) < 1e-6) continue;
				const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
				const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
				const covered: number[] = [];
				let team = 0;
				for (let y = y0; y <= y1; y++) {
					for (let x = x0; x <= x1; x++) {
						const px = x + 0.5, py = y + 0.5;
						const e0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / area;
						const e1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) / area;
						const e2 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) / area;
						if (e0 < -0.02 || e1 < -0.02 || e2 < -0.02) continue;
						const p = y * w + x;
						covered.push(p);
						used[p] = 1;
						if (mask[p] > 0.5) team++;
					}
				}
				if (!covered.length || team < covered.length * TEAM_VOTE) continue;
				for (const p of covered) paint[p] = 1;
			}
		}
	}
	const grown = dilate(paint, w, h, 1);
	for (let p = 0; p < w * h; p++) if (grown[p]) mask[p] = 1;
	return dilate(used, w, h, 1);
}

/**
 * Edge padding: fill the texels no triangle uses with the colour of the
 * nearest used ones, ring by ring (up to `rings` texels out). The atlases
 * pack many small pieces with dark gaps between them, and the GPU's
 * smaller mip levels averaged those gaps into every seam, so team areas
 * looked scribbled with dark lines from a distance.
 */
function padAtlas (d: Uint8ClampedArray, used: Uint8Array, w: number, h: number, rings: number): void {
	const done = used.slice();
	for (let ring = 0; ring < rings; ring++) {
		const add: number[] = [];
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const p = y * w + x;
				if (done[p]) continue;
				let r = 0, g = 0, b = 0, k = 0;
				for (let dy = -1; dy <= 1; dy++) {
					for (let dx = -1; dx <= 1; dx++) {
						const xx = x + dx, yy = y + dy;
						if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
						const q = yy * w + xx;
						if (!done[q]) continue;
						r += d[q * 4]; g += d[q * 4 + 1]; b += d[q * 4 + 2]; k++;
					}
				}
				if (!k) continue;
				d[p * 4] = r / k; d[p * 4 + 1] = g / k; d[p * 4 + 2] = b / k;
				add.push(p);
			}
		}
		if (!add.length) break;
		for (const p of add) done[p] = 1;
	}
}

/** Share of a triangle's texels that must be team colour for all of them to be. */
const TEAM_VOTE = 0.3;

/** Holes in a team area up to about twice this (pixels) across are filled. */
const TEAM_CLOSE = 3;

/** How far (pixels) a team area grows into its own shading. */
const TEAM_GROW = 8;

/**
 * The team-colour weight of every pixel: magenta() picks out the clearly
 * magenta pixels, then the area grows (up to TEAM_GROW pixels) into
 * neighbouring pixels that could be its folds and highlights, any clearly
 * violet-to-magenta pixel elsewhere joins (magenta is kept for team areas),
 * and finally specks mostly surrounded by team colour are filled (bake
 * noise). Without this, team areas kept small dark patches of the original
 * magenta and looked mottled.
 */
function teamMask (d: Uint8ClampedArray, w: number, h: number): { weight: Float32Array; count: number } {
	const n = w * h;
	const weight = new Float32Array(n);
	const dist = new Uint8Array(n).fill(255);
	const queue = new Int32Array(n);
	let head = 0, tail = 0, count = 0;
	for (let p = 0; p < n; p++) {
		weight[p] = magenta(d[p * 4], d[p * 4 + 1], d[p * 4 + 2]);
		if (weight[p] > 0.5) {
			count++;
			dist[p] = 0;
			queue[tail++] = p;
		}
	}
	while (head < tail) {
		const p = queue[head++];
		if (dist[p] >= TEAM_GROW) continue;
		const x = p % w, y = (p - x) / w;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const xx = x + dx, yy = y + dy;
				if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
				const q = yy * w + xx;
				if (dist[q] !== 255 || !nearMagenta(d[q * 4], d[q * 4 + 1], d[q * 4 + 2])) continue;
				dist[q] = dist[p] + 1;
				weight[q] = 1;
				queue[tail++] = q;
			}
		}
	}
	// Magenta is kept for team areas in these models, so any clearly violet-to-magenta pixel is one,
	// however far from the rest (patches of shaded magenta the growth didn't reach)
	for (let p = 0; p < n; p++) {
		if (weight[p] > 0.5) continue;
		const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		if (max < 25 || (max - min) / max < 0.3) continue;
		const hue = hueOf(r, g, b);
		if (hue >= 280 && hue <= 345) weight[p] = 1;
	}
	// Close the mask: fill holes and gaps up to about 2 x TEAM_CLOSE pixels across inside team areas,
	// whatever their colour (bake noise drifts magenta toward salmon or maroon), without moving their
	// outer edges
	const inside = new Uint8Array(n);
	for (let p = 0; p < n; p++) inside[p] = weight[p] > 0.5 ? 1 : 0;
	const closed = erode(dilate(inside, w, h, TEAM_CLOSE), w, h, TEAM_CLOSE);
	for (let p = 0; p < n; p++) if (closed[p] && weight[p] <= 0.5) weight[p] = 1;
	for (let pass = 0; pass < 2; pass++) {
		const fill: number[] = [];
		for (let y = 1; y < h - 1; y++) {
			for (let x = 1; x < w - 1; x++) {
				const p = y * w + x;
				if (weight[p] > 0.5) continue;
				let around = 0;
				for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && weight[p + dy * w + dx] > 0.5) around++;
				if (around >= 5) fill.push(p);
			}
		}
		for (const p of fill) weight[p] = 1;
	}
	return { weight, count };
}

export class ModelLibrary {
	base: string;
	infos: Record<string, ModelInfo> = {};
	models = new Map<string, IgeGltfModel>();
	enabled: boolean;
	/** Called each time a model finishes loading. */
	onLoaded?: (id: string) => void;
	protected _uid = 0;
	protected _raw = new Map<string, Promise<ArrayBuffer>>();
	/** Team-painted models by "id|colour": the model, or null when the model has no team areas. */
	protected _teams = new Map<string, IgeGltfModel | null>();
	protected _painting = new Set<string>();
	protected _queue: string[] = [];
	protected _queued = new Set<string>();
	protected _waiting = new Set<string>();
	protected _active = 0;

	constructor (base = "./assets/models/") {
		this.base = base;
		const q = new URLSearchParams(window.location.search).get("models");
		let stored: string | null = null;
		try {
			stored = localStorage.getItem(STORAGE_KEY);
		} catch {
			stored = null;
		}
		this.enabled = q !== null ? q !== "0" : stored !== "0";
	}

	setEnabled (on: boolean): void {
		this.enabled = on;
		try {
			localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
		} catch {
			// Not remembered without storage
		}
	}

	/**
	 * Read the manifest and load the models given, a few at a time, most
	 * wanted first. Any other model (a building, wonder or monument) loads the
	 * first time something asks for it, so models nobody builds never load.
	 */
	async start (eager: string[] = []): Promise<void> {
		try {
			const response = await fetch(`${this.base}models.json`, { cache: "no-cache" });
			if (!response.ok) return;
			this.infos = await response.json();
		} catch {
			return;
		}
		for (const id of eager) this.request(id);
		for (const id of this._waiting) this.request(id);
		this._waiting.clear();
	}

	/** Load a model in the background if it exists and isn't loaded; onLoaded(id) fires when it is. */
	request (id: string): void {
		if (this.models.has(id) || this._queued.has(id)) return;
		if (!this.infos[id]) {
			// Asked for before the manifest arrived
			if (!Object.keys(this.infos).length) this._waiting.add(id);
			return;
		}
		this._queued.add(id);
		this._queue.push(id);
		while (this._active < 3 && this._queue.length) void this.work();
	}

	protected async work (): Promise<void> {
		this._active++;
		for (let id = this._queue.shift(); id; id = this._queue.shift()) {
			try {
				const model = await igeGltfLoader.load(`${this.base}${this.infos[id].file}`, `hexRealms_model_${id}`);
				this.models.set(id, model);
				this.onLoaded?.(id);
			} catch (error) {
				console.warn(`Couldn't load model ${id}`, error);
			}
		}
		this._active--;
	}

	has (id: string): boolean {
		return this.enabled && this.models.has(id);
	}

	info (id: string): ModelInfo | undefined {
		return this.infos[id];
	}

	/** Does a loaded model have this clip? */
	hasClip (id: string, clip: string): boolean {
		return !!this.info(id)?.animations.includes(clip);
	}

	clipDuration (id: string, clip: string): number {
		return this.models.get(id)?.animations?.find((a) => a.name === clip)?.duration ?? 0;
	}

	/**
	 * The model painted in a team colour: the model once made, null when it
	 * has no team areas, undefined while it is being made (onLoaded(id) fires
	 * when it's ready).
	 */
	teamModel (id: string, color: string): IgeGltfModel | null | undefined {
		const key = `${id}|${color}`;
		if (this._teams.has(key)) return this._teams.get(key);
		if (!this._painting.has(key) && this.models.has(id)) {
			this._painting.add(key);
			this.paint(id, color).catch((error) => {
				console.warn(`Couldn't paint ${id} in ${color}`, error);
				return null;
			}).then((model) => {
				this._teams.set(key, model);
				this._painting.delete(key);
				this.onLoaded?.(id);
			});
		}
		return undefined;
	}

	protected raw (id: string): Promise<ArrayBuffer> {
		let pending = this._raw.get(id);
		if (!pending) {
			pending = fetch(`${this.base}${this.infos[id].file}`).then((r) => r.arrayBuffer());
			this._raw.set(id, pending);
		}
		return pending;
	}

	/** Repaint the magenta areas of a model's base colour textures in a team colour, as a new model. */
	protected async paint (id: string, color: string): Promise<IgeGltfModel | null> {
		const { json, bin } = readGlb(await this.raw(id));
		const sources = new Set<number>();
		for (const m of json.materials ?? []) {
			const t = m.pbrMetallicRoughness?.baseColorTexture?.index;
			const source = t !== undefined ? json.textures?.[t]?.source : undefined;
			if (source !== undefined) sources.add(source);
		}
		const [tr, tg, tb] = hexRgb(color);
		const painted: { image: number; bytes: Uint8Array }[] = [];
		for (const index of sources) {
			const image = json.images[index];
			const view = json.bufferViews[image.bufferView];
			const bytes = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
			const bitmap = await createImageBitmap(new Blob([bytes], { type: image.mimeType ?? "image/png" }));
			const canvas = document.createElement("canvas");
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
			ctx.drawImage(bitmap, 0, 0);
			const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const d = pixels.data;
			const { weight: mask, count } = teamMask(d, canvas.width, canvas.height);
			if (count < (d.length / 4) * 0.002) continue;
			const used = voteByTriangle(json, bin, index, mask, canvas.width, canvas.height);
			for (let p = 0, i = 0; i < d.length; p++, i += 4) {
				const weight = mask[p];
				if (weight <= 0) continue;
				const r = d[i], g = d[i + 1], b = d[i + 2];
				// Keep a trace of the texel's shading, relative to the finished magenta's typical brightness
				// (about 0.55): copied at full strength, the bake's noise showed as dark patches and
				// scribbles in the team colour (the engine's lighting shades the model anyway)
				const shade = Math.max(0.72, Math.min(1.08, 0.8 + 0.2 * (Math.max(r, g, b) / 255 / 0.55)));
				d[i] = r + (tr * shade - r) * weight;
				d[i + 1] = g + (tg * shade - g) * weight;
				d[i + 2] = b + (tb * shade - b) * weight;
			}
			despill(d, mask);
			if (used.some((v) => v)) padAtlas(d, used, canvas.width, canvas.height, 8);
			ctx.putImageData(pixels, 0, 0);
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
			if (blob) painted.push({ image: index, bytes: new Uint8Array(await blob.arrayBuffer()) });
		}
		if (!painted.length) return null;
		const blobs = painted.map((p) => p.bytes);
		const views = appendViews(json, bin.length, blobs);
		painted.forEach((p, i) => {
			json.images[p.image].bufferView = views[i];
			json.images[p.image].mimeType = "image/png";
		});
		const url = URL.createObjectURL(new Blob([encodeGlb(json, bin, blobs, views)], { type: "model/gltf-binary" }));
		return igeGltfLoader.load(`${url}#${id}.glb`, `hexRealms_model_${id}_${color}`);
	}

	/**
	 * An entity showing a model, scaled to fit, standing on y = 0 and centred
	 * on x and z (mount it on something placed at the tile). With a team
	 * colour, the team-painted copy (or the plain model with a team tint,
	 * kept in `teamTint` on the entity, until the copy is ready or if the
	 * model has no team areas). Null when the model isn't loaded or models
	 * are off.
	 */
	create (id: string, fit: ModelFit, team?: string): (IgeEntity & { teamTint?: Rgba }) | null {
		if (!this.enabled) return null;
		if (!this.models.has(id)) {
			this.request(id);
			return null;
		}
		let model = this.models.get(id) as IgeGltfModel;
		let tint: Rgba | undefined;
		if (team) {
			const painted = this.teamModel(id, team);
			if (painted) model = painted;
			else tint = teamTint(team);
		}
		const info = this.infos[id];
		const h = Math.max(1e-6, info.max[1] - info.min[1]);
		const w = Math.max(1e-6, info.max[0] - info.min[0], info.max[2] - info.min[2]);
		let s = fit.height !== undefined ? fit.height / h : (fit.footprint ?? 1) / w;
		if (fit.height !== undefined && fit.footprint !== undefined) s = Math.min(fit.height / h, fit.footprint / w);
		const e = new IgeEntity() as IgeEntity & { teamTint?: Rgba };
		e.id(`hexRealms_${id}_${++this._uid}`);
		e.model(model, { lod: fit.lod });
		if (tint) {
			e.teamTint = tint;
			e.material({ color: tint });
		}
		const yaw = info.yaw ?? 0;
		const cx = -(info.min[0] + info.max[0]) / 2 * s, cz = -(info.min[2] + info.max[2]) / 2 * s;
		e.scaleTo(s, s, s);
		e.translateTo(cx * Math.cos(yaw) + cz * Math.sin(yaw), -info.min[1] * s, -cx * Math.sin(yaw) + cz * Math.cos(yaw));
		if (yaw) e.rotateTo(0, yaw, 0);
		if (fit.animation && info.animations.includes(fit.animation)) {
			(e.components.skeletalAnimation as any)?.play(fit.animation, { crossFadeDuration: 0, speed: fit.speed ?? 1 });
		}
		return e;
	}
}
