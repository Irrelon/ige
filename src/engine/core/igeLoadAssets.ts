import { IgeCellSheet } from "@/engine/core/IgeCellSheet";
import { IgeTexture } from "@/engine/core/IgeTexture";
import { ige } from "@/engine/instance";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { igeGltfLoader } from "@/engine/webgl/IgeGltfLoader";

/** A texture: its URL, or a URL split into a grid of cells (sprite sheet). */
export type IgeAssetTextureEntry = string | { url: string; cells?: [number, number] };

/** Everything a game (or a level) needs, by id. */
export interface IgeAssetManifest {
	/** Images (IgeTexture, or IgeCellSheet with `cells`), reused when a texture with the id already exists. */
	textures?: Record<string, IgeAssetTextureEntry>;
	/** glTF / GLB files: models, and animation files for model(..., { animations }). */
	models?: Record<string, string>;
	/** JSON files (levels, configuration), parsed. */
	data?: Record<string, string>;
}

/** The loaded assets, keyed like the manifest. */
export interface IgeLoadedAssets {
	textures: Record<string, IgeTexture>;
	models: Record<string, IgeGltfModel>;
	data: Record<string, unknown>;
	/** Assets that failed (only when failOnError is false). */
	failures: IgeAssetFailure[];
}

export interface IgeAssetFailure {
	kind: "texture" | "model" | "data";
	id: string;
	url: string;
	error: Error;
}

export interface IgeLoadAssetsOptions {
	/** Called as each asset finishes (loaded or failed), e.g. for a loading bar. */
	onProgress?: (done: number, total: number, id: string) => void;
	/**
	 * Reject when any asset fails, after every asset has settled, with an
	 * IgeAssetLoadError listing all of them (default true). With false the
	 * failures are returned in `failures` instead.
	 */
	failOnError?: boolean;
}

/** Thrown by igeLoadAssets() when assets fail to load; lists every failure. */
export class IgeAssetLoadError extends Error {
	readonly failures: IgeAssetFailure[];

	constructor (failures: IgeAssetFailure[]) {
		super(`${failures.length} asset(s) failed to load: ${failures.map((f) => `${f.kind} "${f.id}" (${f.url}): ${f.error.message}`).join("; ")}`);
		this.name = "IgeAssetLoadError";
		this.failures = failures;
	}
}

/**
 * Load a game's textures, models (and animation files) and JSON data in
 * one go, with one progress callback for a loading screen. Textures and
 * models already loaded under the same id are reused, so it is cheap to
 * call per level. Everything loads in parallel; when anything fails, the
 * promise rejects after all assets have settled, listing every failure.
 * @example #Load a level
 *     const assets = await igeLoadAssets({
 *         textures: { grass: "textures/grass.png", explosion: { url: "textures/boom.png", cells: [4, 4] } },
 *         models: { zombie: "models/zombie.glb", zombieAttack: "models/zombie_attack.glb" },
 *         data: { level1: "levels/level1.json" }
 *     }, { onProgress: (done, total) => bar.style.width = `${(100 * done) / total}%` });
 *
 *     zombie.model(assets.models.zombie, { animations: { Attack: assets.models.zombieAttack } });
 */
export async function igeLoadAssets (manifest: IgeAssetManifest, options: IgeLoadAssetsOptions = {}): Promise<IgeLoadedAssets> {
	const result: IgeLoadedAssets = { textures: {}, models: {}, data: {}, failures: [] };
	const jobs: { kind: IgeAssetFailure["kind"]; id: string; url: string; run: () => Promise<void> }[] = [];

	for (const [id, entry] of Object.entries(manifest.textures || {})) {
		const url = typeof entry === "string" ? entry : entry.url;
		jobs.push({
			kind: "texture",
			id,
			url,
			run: async () => {
				let texture: IgeTexture | undefined = ige.textures?.exists(id) ? ige.textures.get(id) : undefined;
				if (!texture) {
					const cells = typeof entry === "string" ? undefined : entry.cells;
					texture = cells ? new IgeCellSheet(id, url, cells[0], cells[1]) : new IgeTexture(id, url);
				}
				const settled = await texture.whenSettled();
				if (settled.error) throw settled.error;
				result.textures[id] = texture;
			}
		});
	}

	for (const [id, url] of Object.entries(manifest.models || {})) {
		jobs.push({
			kind: "model",
			id,
			url,
			run: async () => {
				result.models[id] = await igeGltfLoader.load(url, id);
			}
		});
	}

	for (const [id, url] of Object.entries(manifest.data || {})) {
		jobs.push({
			kind: "data",
			id,
			url,
			run: async () => {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
				result.data[id] = await response.json();
			}
		});
	}

	let done = 0;
	await Promise.all(jobs.map(async (job) => {
		try {
			await job.run();
		} catch (err) {
			result.failures.push({ kind: job.kind, id: job.id, url: job.url, error: err instanceof Error ? err : new Error(String(err)) });
		}
		done++;
		options.onProgress?.(done, jobs.length, job.id);
	}));

	if (result.failures.length && options.failOnError !== false) {
		throw new IgeAssetLoadError(result.failures);
	}
	return result;
}
