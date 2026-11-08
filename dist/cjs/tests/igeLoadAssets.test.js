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
const IgeAsset_1 = require("../engine/core/IgeAsset.js");
const IgeAssetRegister_1 = require("../engine/core/IgeAssetRegister.js");
const igeLoadAssets_1 = require("../engine/core/igeLoadAssets.js");
const IgeGltfLoader_1 = require("../engine/webgl/IgeGltfLoader.js");
const files = {
    "levels/one.json": { name: "one", spawns: 3 },
    "levels/two.json": { name: "two", spawns: 5 }
};
let fetches = [];
beforeEach(() => {
    fetches = [];
    globalThis.fetch = jest.fn((url) => __awaiter(void 0, void 0, void 0, function* () {
        fetches.push(url);
        yield new Promise((resolve) => setTimeout(resolve, 5));
        if (!(url in files))
            return { ok: false, status: 404 };
        return { ok: true, status: 200, json: () => __awaiter(void 0, void 0, void 0, function* () { return files[url]; }) };
    }));
});
describe("igeLoadAssets", () => {
    it("loads JSON data and reports progress for each asset", () => __awaiter(void 0, void 0, void 0, function* () {
        const progress = [];
        const assets = yield (0, igeLoadAssets_1.igeLoadAssets)({ data: { one: "levels/one.json", two: "levels/two.json" } }, { onProgress: (done, total, id) => progress.push([done, total, id]) });
        expect(assets.data.one).toEqual({ name: "one", spawns: 3 });
        expect(assets.data.two).toEqual({ name: "two", spawns: 5 });
        expect(progress.map(([done, total]) => [done, total])).toEqual([[1, 2], [2, 2]]);
        expect(assets.failures).toEqual([]);
    }));
    it("rejects with every failure once all assets have settled", () => __awaiter(void 0, void 0, void 0, function* () {
        const promise = (0, igeLoadAssets_1.igeLoadAssets)({
            data: { one: "levels/one.json", missing: "levels/missing.json" },
            models: { ghost: "models/ghost.glb" }
        });
        yield expect(promise).rejects.toBeInstanceOf(igeLoadAssets_1.IgeAssetLoadError);
        const error = (yield promise.catch((e) => e));
        expect(error.failures.map((f) => `${f.kind}:${f.id}`).sort()).toEqual(["data:missing", "model:ghost"]);
        expect(error.message).toContain("HTTP 404");
    }));
    it("returns failures instead of rejecting when asked", () => __awaiter(void 0, void 0, void 0, function* () {
        const assets = yield (0, igeLoadAssets_1.igeLoadAssets)({ data: { one: "levels/one.json", missing: "nope.json" } }, { failOnError: false });
        expect(assets.data.one).toBeDefined();
        expect(assets.failures.map((f) => f.id)).toEqual(["missing"]);
    }));
});
describe("IgeGltfLoader", () => {
    it("shares one fetch between loads of the same model in flight", () => __awaiter(void 0, void 0, void 0, function* () {
        const loader = new IgeGltfLoader_1.IgeGltfLoader();
        const a = loader.load("models/ghost.glb", "ghost").catch((e) => e);
        const b = loader.load("models/ghost.glb", "ghost").catch((e) => e);
        const [ea, eb] = yield Promise.all([a, b]);
        expect(fetches).toEqual(["models/ghost.glb"]);
        expect(ea).toBe(eb);
        expect(String(ea)).toContain("HTTP 404");
    }));
});
describe("asset settling", () => {
    it("settles failed assets so registers don't wait for them forever", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const register = new IgeAssetRegister_1.IgeAssetRegister();
        const good = new IgeAsset_1.IgeAsset();
        const bad = new IgeAsset_1.IgeAsset();
        register.add("good", good);
        register.add("bad", bad);
        expect(register._assetsLoading).toBe(2);
        good._assetLoaded();
        bad._assetFailed(new Error("missing"));
        const settled = yield register.whenLoaded();
        expect(settled).toEqual([good, bad]);
        expect(register._assetsLoading).toBe(0);
        expect((_a = (yield bad.whenSettled()).error) === null || _a === void 0 ? void 0 : _a.message).toBe("missing");
        expect((yield good.whenSettled()).error).toBeUndefined();
    }));
});
