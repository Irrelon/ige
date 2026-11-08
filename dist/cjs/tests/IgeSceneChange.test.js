"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeEntity_1 = require("../engine/core/IgeEntity.js");
const IgeParticleSystem3d_1 = require("../engine/webgl/IgeParticleSystem3d.js");
const IgeDecalSystem3d_1 = require("../engine/webgl/IgeDecalSystem3d.js");
const sceneChange_1 = require("../engine/utils/sceneChange.js");
const instance_1 = require("../engine/instance.js");
// updateTransform() asks the engine which renderer is active; these tests
// only need "none" (the 2D path)
beforeAll(() => {
    Object.defineProperty(instance_1.ige, "engine", { value: { renderer: () => undefined }, configurable: true, writable: true });
});
/** Run fn and return how many scene changes it reported. */
function changes(fn) {
    const before = sceneChange_1.igeSceneChange.count;
    fn();
    return sceneChange_1.igeSceneChange.count - before;
}
describe("scene change reporting (render on demand)", () => {
    it("reports transform changes, but not unchanged updates", () => {
        const entity = new IgeEntity_1.IgeEntity();
        entity.updateTransform();
        expect(changes(() => entity.updateTransform())).toBe(0);
        expect(changes(() => entity.translateTo(10, 0, 0).updateTransform())).toBeGreaterThan(0);
        expect(changes(() => entity.updateTransform())).toBe(0);
    });
    it("reports showing and hiding only when visibility changes", () => {
        const entity = new IgeEntity_1.IgeEntity();
        expect(changes(() => entity.hide())).toBe(1);
        expect(changes(() => entity.hide())).toBe(0);
        expect(changes(() => entity.show())).toBe(1);
        expect(changes(() => entity.show())).toBe(0);
    });
    it("doesn't report moves of hidden entities", () => {
        const entity = new IgeEntity_1.IgeEntity();
        entity.updateTransform();
        entity.hide();
        expect(changes(() => entity.translateTo(5, 5, 0).updateTransform())).toBe(0);
    });
    it("reports particles only while some are alive", () => {
        const system = new IgeParticleSystem3d_1.IgeParticleSystem3d({ rate: 0, lifetime: [0.1, 0.1] });
        expect(changes(() => system._simulate(0.016))).toBe(0);
        system.burst(5, { x: 0, y: 0, z: 0 });
        expect(changes(() => system._simulate(0.016))).toBe(1);
        // The frame where the last particle dies still needs drawing
        expect(changes(() => system._simulate(1))).toBe(1);
        expect(changes(() => system._simulate(0.016))).toBe(0);
    });
    it("reports decals when added or fading, not while unchanged", () => {
        const decals = new IgeDecalSystem3d_1.IgeDecalSystem3d({ lifetime: 1, fadeTime: 1 });
        decals.add(0, 0);
        expect(changes(() => decals._age(0.1))).toBe(1);
        expect(changes(() => decals._age(0.1))).toBe(0);
        expect(changes(() => decals._age(1))).toBe(1); // fading
    });
});
