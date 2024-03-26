import { IgeObject } from "../engine/core/IgeObject.js"
describe("IgeObject", () => {
    it("can be instantiated", () => {
        const obj = new IgeObject();
        obj.translateTo(10, 10, 10);
        expect(obj._translate.x).toBe(10);
        expect(obj._translate.y).toBe(10);
        expect(obj._translate.z).toBe(10);
    });
});
