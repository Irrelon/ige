import { IgeEntity } from "../engine/core/IgeEntity.js"
describe("IgeEntity", () => {
    describe("transform", () => {
        it("can be translated", () => {
            const obj = new IgeEntity();
            obj.translateTo(10, 10, 10);
            expect(obj._translate.x).toBe(10);
            expect(obj._translate.y).toBe(10);
            expect(obj._translate.z).toBe(10);
        });
        it("can be rotated", () => {
            const obj = new IgeEntity();
            obj.rotateTo(10, 10, 10);
            expect(obj._rotate.x).toBe(10);
            expect(obj._rotate.y).toBe(10);
            expect(obj._rotate.z).toBe(10);
        });
        it("can be scaled", () => {
            const obj = new IgeEntity();
            obj.scaleTo(10, 10, 10);
            expect(obj._scale.x).toBe(10);
            expect(obj._scale.y).toBe(10);
            expect(obj._scale.z).toBe(10);
        });
    });
    describe("events", () => {
        it("fires created", () => {
            const obj = new IgeEntity();
            obj.scaleTo(10, 10, 10);
            expect(obj._scale.x).toBe(10);
            expect(obj._scale.y).toBe(10);
            expect(obj._scale.z).toBe(10);
        });
        it("fires destroyed", () => {
            const obj = new IgeEntity();
            let called = 0;
            obj.on("destroyed", () => {
                called++;
            });
            obj.destroy();
            expect(called).toBe(1);
        });
    });
});
