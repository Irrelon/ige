"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IgeObject_1 = require("../engine/core/IgeObject.js");
describe("IgeObject", () => {
    it("can be instantiated", () => {
        const obj = new IgeObject_1.IgeObject();
        obj.translateTo(10, 10, 10);
        expect(obj._translate.x).toBe(10);
        expect(obj._translate.y).toBe(10);
        expect(obj._translate.z).toBe(10);
    });
});
