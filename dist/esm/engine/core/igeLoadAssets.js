import { IgeCellSheet } from "./IgeCellSheet.js"
import { IgeTexture } from "./IgeTexture.js";
import { ige } from "../instance.js"
import { igeGltfLoader } from "../webgl/IgeGltfLoader.js";
/** Thrown by igeLoadAssets() when assets fail to load; lists every failure. */
export class IgeAssetLoadError extends Error {
    failures;
    constructor(failures) {
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
export async function igeLoadAssets(manifest, options = {}) {
    const result = { textures: {}, models: {}, data: {}, failures: [] };
    const jobs = [];
    for (const [id, entry] of Object.entries(manifest.textures || {})) {
        const url = typeof entry === "string" ? entry : entry.url;
        jobs.push({
            kind: "texture",
            id,
            url,
            run: async () => {
                let texture = ige.textures?.exists(id) ? ige.textures.get(id) : undefined;
                if (!texture) {
                    const cells = typeof entry === "string" ? undefined : entry.cells;
                    texture = cells ? new IgeCellSheet(id, url, cells[0], cells[1]) : new IgeTexture(id, url);
                }
                const settled = await texture.whenSettled();
                if (settled.error)
                    throw settled.error;
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
                if (!response.ok)
                    throw new Error(`HTTP ${response.status} loading ${url}`);
                result.data[id] = await response.json();
            }
        });
    }
    let done = 0;
    await Promise.all(jobs.map(async (job) => {
        try {
            await job.run();
        }
        catch (err) {
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
