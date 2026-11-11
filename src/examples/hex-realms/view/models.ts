import { IgeEntity } from "@/engine/core/IgeEntity";
import { type IgeGltfModel, igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";
import type { IgeModelLodLevel } from "@/engine/webgl/IgeModelParts";
import { blockyModel, BLOCKY_IDS } from "./blocky";

/**
 * The game's 3D models: GLBs made with AssetFurnace and imported by
 * tools/import_model.py, listed in assets/models/models.json with their
 * bounds and animation clips. They load in the background while the game
 * runs on its primitive placeholders; each one swaps in as it arrives
 * (units and cities up front, everything else when first needed).
 * Units are rigged characters with idle, walk, attack, hit and death clips;
 * cities, buildings, wonders and monuments are static props.
 *
 * Whose a unit is shows in its base and its badge (see WorldView and the
 * HUD), not in the model: the models keep their own colours.
 *
 * The art can be switched between packs: the AssetFurnace models, the
 * blocky pack (built in code, view/blocky), or simple shapes (no models).
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
	/** Skinned models: the lowest point in the idle pose (model space), which stands on the ground. */
	floor?: number;
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
const PACK_KEY = "hexRealms.pack";

/** Which art the world is drawn with: the AssetFurnace models, the blocky pack, or simple shapes. */
export type ArtPack = "models" | "blocky" | "shapes";

/** One set of models: what it has (infos) and what has loaded, loading a few at a time. */
export class PackSource {
	infos: Record<string, ModelInfo> = {};
	models = new Map<string, IgeGltfModel>();
	started = false;
	protected _queue: string[] = [];
	protected _queued = new Set<string>();
	protected _waiting = new Set<string>();
	protected _active = 0;
	protected lib: ModelLibrary;
	protected kind: "models" | "blocky";

	constructor (lib: ModelLibrary, kind: "models" | "blocky") {
		this.lib = lib;
		this.kind = kind;
	}

	async start (eager: string[]): Promise<void> {
		if (this.started) return;
		this.started = true;
		if (this.kind === "blocky") {
			// Built in code: work out every model's size up front (they're small)
			for (const id of BLOCKY_IDS) {
				const m = blockyModel(id);
				if (m) this.infos[id] = { file: "", min: m.min, max: m.max, triangles: m.triangles, animations: m.animations, skinned: m.skinned, bytes: m.bytes, floor: m.skinned ? 0 : undefined };
			}
		} else {
			try {
				const response = await fetch(`${this.lib.base}models.json`, { cache: "no-cache" });
				if (!response.ok) return;
				this.infos = await response.json();
			} catch {
				return;
			}
		}
		for (const id of eager) this.request(id);
		for (const id of this._waiting) this.request(id);
		this._waiting.clear();
	}

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
				this.models.set(id, await this.load(id));
				if (this.lib.source === this) this.lib.onLoaded?.(id);
			} catch (error) {
				console.warn(`Couldn't load model ${id}`, error);
			}
		}
		this._active--;
	}

	protected async load (id: string): Promise<IgeGltfModel> {
		if (this.kind === "models") return igeGltfLoader.load(`${this.lib.base}${this.infos[id].file}`, `hexRealms_model_${id}`);
		// The blocky pack's glTF, handed to the loader as a file of its own
		const built = blockyModel(id);
		if (!built) throw new Error(`No blocky model ${id}`);
		const url = URL.createObjectURL(new Blob([JSON.stringify(built.gltf)], { type: "model/gltf+json" }));
		try {
			return await igeGltfLoader.load(url, `hexRealms_blocky_${id}`);
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

export class ModelLibrary {
	base: string;
	pack: ArtPack;
	/** Called each time a model of the pack in use finishes loading. */
	onLoaded?: (id: string) => void;
	protected _uid = 0;
	protected _eager: string[] = [];
	protected sources: Record<"models" | "blocky", PackSource>;

	constructor (base = "./assets/models/") {
		this.base = base;
		this.sources = { models: new PackSource(this, "models"), blocky: new PackSource(this, "blocky") };
		const params = new URLSearchParams(window.location.search);
		const q = params.get("pack") ?? (params.get("models") === "0" ? "shapes" : params.get("models") !== null ? "models" : null);
		let stored: string | null = null, old: string | null = null;
		try {
			stored = localStorage.getItem(PACK_KEY);
			old = localStorage.getItem(STORAGE_KEY);
		} catch {
			stored = null;
		}
		const pick = (p: string | null): ArtPack | null => (p === "models" || p === "blocky" || p === "shapes" ? p : null);
		// The blocky pack unless the player picked another (or turned the models off before there were packs)
		this.pack = pick(q) ?? pick(stored) ?? (old === "0" ? "shapes" : "blocky");
	}

	/** The models of the pack in use (the AssetFurnace set when drawing simple shapes, which uses none). */
	get source (): PackSource {
		return this.sources[this.pack === "blocky" ? "blocky" : "models"];
	}

	get infos (): Record<string, ModelInfo> {
		return this.source.infos;
	}

	get models (): Map<string, IgeGltfModel> {
		return this.source.models;
	}

	get enabled (): boolean {
		return this.pack !== "shapes";
	}

	/** The AssetFurnace models' manifest (their pictures make the research screen's thumbnails, whatever the pack). */
	get thumbs (): Record<string, ModelInfo> {
		return this.sources.models.infos;
	}

	/** Models on (the AssetFurnace set) or off (simple shapes). */
	setEnabled (on: boolean): void {
		this.setPack(on ? "models" : "shapes");
	}

	setPack (pack: ArtPack): void {
		this.pack = pack;
		try {
			localStorage.setItem(PACK_KEY, pack);
			localStorage.setItem(STORAGE_KEY, pack === "shapes" ? "0" : "1");
		} catch {
			// Not remembered without storage
		}
		if (pack !== "shapes") void this.source.start(this._eager);
	}

	/**
	 * Read the manifest and load the models given, a few at a time, most
	 * wanted first. Any other model (a building, wonder or monument) loads the
	 * first time something asks for it, so models nobody builds never load.
	 */
	async start (eager: string[] = []): Promise<void> {
		this._eager = eager;
		// The AssetFurnace manifest is read whatever the pack (for the thumbnails)
		const models = this.sources.models.start(this.pack === "models" ? eager : []);
		if (this.pack === "blocky") await this.sources.blocky.start(eager);
		await models;
	}

	/** Load a model in the background if it exists and isn't loaded; onLoaded(id) fires when it is. */
	request (id: string): void {
		this.source.request(id);
	}

	has (id: string): boolean {
		return this.enabled && this.models.has(id);
	}

	info (id: string): ModelInfo | undefined {
		return this.enabled ? this.infos[id] : undefined;
	}

	/** Does a loaded model have this clip? */
	hasClip (id: string, clip: string): boolean {
		return !!this.info(id)?.animations.includes(clip);
	}

	clipDuration (id: string, clip: string): number {
		return this.models.get(id)?.animations?.find((a) => a.name === clip)?.duration ?? 0;
	}

	/**
	 * An entity showing a model, scaled to fit, standing on y = 0 and centred
	 * on x and z (mount it on something placed at the tile). Null when the
	 * model isn't loaded or models are off.
	 */
	create (id: string, fit: ModelFit): IgeEntity | null {
		if (!this.enabled) return null;
		if (!this.models.has(id)) {
			this.request(id);
			return null;
		}
		const model = this.models.get(id) as IgeGltfModel;
		const info = this.infos[id];
		const h = Math.max(1e-6, info.max[1] - info.min[1]);
		const w = Math.max(1e-6, info.max[0] - info.min[0], info.max[2] - info.min[2]);
		let s = fit.height !== undefined ? fit.height / h : (fit.footprint ?? 1) / w;
		if (fit.height !== undefined && fit.footprint !== undefined) s = Math.min(fit.height / h, fit.footprint / w);
		const e = new IgeEntity();
		e.id(`hexRealms_${id}_${++this._uid}`);
		e.model(model, { lod: fit.lod });
		const yaw = info.yaw ?? 0;
		const cx = -(info.min[0] + info.max[0]) / 2 * s, cz = -(info.min[2] + info.max[2]) / 2 * s;
		e.scaleTo(s, s, s);
		e.translateTo(cx * Math.cos(yaw) + cz * Math.sin(yaw), -(info.floor ?? info.min[1]) * s, -cx * Math.sin(yaw) + cz * Math.cos(yaw));
		if (yaw) e.rotateTo(0, yaw, 0);
		if (fit.animation && info.animations.includes(fit.animation)) {
			(e.components.skeletalAnimation as any)?.play(fit.animation, { crossFadeDuration: 0, speed: fit.speed ?? 1 });
		}
		return e;
	}
}
