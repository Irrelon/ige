import { IgeObject } from "../engine/core/IgeObject.js"
describe("IgeObject", () => {
    it("can be translated", () => {
        const obj = new IgeObject();
        obj.translateTo(10, 10, 10);
        expect(obj._translate.x).toBe(10);
        expect(obj._translate.y).toBe(10);
        expect(obj._translate.z).toBe(10);
    });
    it("can be rotated", () => {
        const obj = new IgeObject();
        obj.rotateTo(10, 10, 10);
        expect(obj._rotate.x).toBe(10);
        expect(obj._rotate.y).toBe(10);
        expect(obj._rotate.z).toBe(10);
    });
    it("can be scaled", () => {
        const obj = new IgeObject();
        obj.scaleTo(10, 10, 10);
        expect(obj._scale.x).toBe(10);
        expect(obj._scale.y).toBe(10);
        expect(obj._scale.z).toBe(10);
    });
});
