import { IgeAsset } from "../engine/core/IgeAsset.js"
import { IgeAssetRegister } from "../engine/core/IgeAssetRegister.js"
import { IgeAssetLoadError, igeLoadAssets } from "../engine/core/igeLoadAssets.js"
import { IgeGltfLoader } from "../engine/webgl/IgeGltfLoader.js"
const files = {
    "levels/one.json": { name: "one", spawns: 3 },
    "levels/two.json": { name: "two", spawns: 5 }
};
let fetches = [];
beforeEach(() => {
    fetches = [];
    globalThis.fetch = jest.fn(async (url) => {
        fetches.push(url);
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (!(url in files))
            return { ok: false, status: 404 };
        return { ok: true, status: 200, json: async () => files[url] };
    });
});
describe("igeLoadAssets", () => {
    it("loads JSON data and reports progress for each asset", async () => {
        const progress = [];
        const assets = await igeLoadAssets({ data: { one: "levels/one.json", two: "levels/two.json" } }, { onProgress: (done, total, id) => progress.push([done, total, id]) });
        expect(assets.data.one).toEqual({ name: "one", spawns: 3 });
        expect(assets.data.two).toEqual({ name: "two", spawns: 5 });
        expect(progress.map(([done, total]) => [done, total])).toEqual([[1, 2], [2, 2]]);
        expect(assets.failures).toEqual([]);
    });
    it("rejects with every failure once all assets have settled", async () => {
        const promise = igeLoadAssets({
            data: { one: "levels/one.json", missing: "levels/missing.json" },
            models: { ghost: "models/ghost.glb" }
        });
        await expect(promise).rejects.toBeInstanceOf(IgeAssetLoadError);
        const error = (await promise.catch((e) => e));
        expect(error.failures.map((f) => `${f.kind}:${f.id}`).sort()).toEqual(["data:missing", "model:ghost"]);
        expect(error.message).toContain("HTTP 404");
    });
    it("returns failures instead of rejecting when asked", async () => {
        const assets = await igeLoadAssets({ data: { one: "levels/one.json", missing: "nope.json" } }, { failOnError: false });
        expect(assets.data.one).toBeDefined();
        expect(assets.failures.map((f) => f.id)).toEqual(["missing"]);
    });
});
describe("IgeGltfLoader", () => {
    it("shares one fetch between loads of the same model in flight", async () => {
        const loader = new IgeGltfLoader();
        const a = loader.load("models/ghost.glb", "ghost").catch((e) => e);
        const b = loader.load("models/ghost.glb", "ghost").catch((e) => e);
        const [ea, eb] = await Promise.all([a, b]);
        expect(fetches).toEqual(["models/ghost.glb"]);
        expect(ea).toBe(eb);
        expect(String(ea)).toContain("HTTP 404");
    });
});
describe("asset settling", () => {
    it("settles failed assets so registers don't wait for them forever", async () => {
        const register = new IgeAssetRegister();
        const good = new IgeAsset();
        const bad = new IgeAsset();
        register.add("good", good);
        register.add("bad", bad);
        expect(register._assetsLoading).toBe(2);
        good._assetLoaded();
        bad._assetFailed(new Error("missing"));
        const settled = await register.whenLoaded();
        expect(settled).toEqual([good, bad]);
        expect(register._assetsLoading).toBe(0);
        expect((await bad.whenSettled()).error?.message).toBe("missing");
        expect((await good.whenSettled()).error).toBeUndefined();
    });
});
