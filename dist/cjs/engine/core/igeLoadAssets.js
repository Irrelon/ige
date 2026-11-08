"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAssetLoadError = void 0;
exports.igeLoadAssets = igeLoadAssets;
const IgeCellSheet_1 = require("./IgeCellSheet.js");
const IgeTexture_1 = require("./IgeTexture.js");
const instance_1 = require("../instance.js");
const IgeGltfLoader_1 = require("../webgl/IgeGltfLoader.js");
/** Thrown by igeLoadAssets() when assets fail to load; lists every failure. */
class IgeAssetLoadError extends Error {
    constructor(failures) {
        super(`${failures.length} asset(s) failed to load: ${failures.map((f) => `${f.kind} "${f.id}" (${f.url}): ${f.error.message}`).join("; ")}`);
        this.name = "IgeAssetLoadError";
        this.failures = failures;
    }
}
exports.IgeAssetLoadError = IgeAssetLoadError;
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
function igeLoadAssets(manifest_1) {
    return __awaiter(this, arguments, void 0, function* (manifest, options = {}) {
        const result = { textures: {}, models: {}, data: {}, failures: [] };
        const jobs = [];
        for (const [id, entry] of Object.entries(manifest.textures || {})) {
            const url = typeof entry === "string" ? entry : entry.url;
            jobs.push({
                kind: "texture",
                id,
                url,
                run: () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    let texture = ((_a = instance_1.ige.textures) === null || _a === void 0 ? void 0 : _a.exists(id)) ? instance_1.ige.textures.get(id) : undefined;
                    if (!texture) {
                        const cells = typeof entry === "string" ? undefined : entry.cells;
                        texture = cells ? new IgeCellSheet_1.IgeCellSheet(id, url, cells[0], cells[1]) : new IgeTexture_1.IgeTexture(id, url);
                    }
                    const settled = yield texture.whenSettled();
                    if (settled.error)
                        throw settled.error;
                    result.textures[id] = texture;
                })
            });
        }
        for (const [id, url] of Object.entries(manifest.models || {})) {
            jobs.push({
                kind: "model",
                id,
                url,
                run: () => __awaiter(this, void 0, void 0, function* () {
                    result.models[id] = yield IgeGltfLoader_1.igeGltfLoader.load(url, id);
                })
            });
        }
        for (const [id, url] of Object.entries(manifest.data || {})) {
            jobs.push({
                kind: "data",
                id,
                url,
                run: () => __awaiter(this, void 0, void 0, function* () {
                    const response = yield fetch(url);
                    if (!response.ok)
                        throw new Error(`HTTP ${response.status} loading ${url}`);
                    result.data[id] = yield response.json();
                })
            });
        }
        let done = 0;
        yield Promise.all(jobs.map((job) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield job.run();
            }
            catch (err) {
                result.failures.push({ kind: job.kind, id: job.id, url: job.url, error: err instanceof Error ? err : new Error(String(err)) });
            }
            done++;
            (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, done, jobs.length, job.id);
        })));
        if (result.failures.length && options.failOnError !== false) {
            throw new IgeAssetLoadError(result.failures);
        }
        return result;
    });
}
