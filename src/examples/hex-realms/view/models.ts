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
	let hue: number;
	if (max === r) hue = ((g - b) / (max - min)) * 60;
	else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
	else hue = (4 + (r - g) / (max - min)) * 60;
	if (hue < 0) hue += 360;
	const hueWeight = Math.max(0, Math.min(1, 1 - (Math.abs(hue - 320) - 15) / 8));
	const satWeight = Math.max(0, Math.min(1, (sat - 0.5) / 0.12));
	return hueWeight * satWeight;
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
			let count = 0;
			for (let i = 0; i < d.length; i += 4) {
				const r = d[i], g = d[i + 1], b = d[i + 2];
				const weight = magenta(r, g, b);
				if (weight <= 0) continue;
				if (weight > 0.5) count++;
				// Keep the texel's shading, relative to the finished magenta's typical brightness (about 0.5)
				const shade = Math.min(1.25, Math.max(r, g, b) / 255 / 0.55);
				d[i] = r + (tr * shade - r) * weight;
				d[i + 1] = g + (tg * shade - g) * weight;
				d[i + 2] = b + (tb * shade - b) * weight;
			}
			if (count < (d.length / 4) * 0.002) continue;
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
