"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cuboid = void 0;
const IgeEntity_1 = require("@/engine/core/IgeEntity");
class Cuboid extends IgeEntity_1.IgeEntity {
    constructor(pointerMoveFunc, pointerOutFunc) {
        super();
        this.classId = 'Cuboid';
        this.isometric(true)
            // .pointerMove(pointerMoveFunc)
            // .pointerOut(pointerOutFunc)
            // .pointerEventsActive(true)
            .triggerPolygonFunctionName('bounds3dPolygon')
            .opacity(0.95);
    }
}
exports.Cuboid = Cuboid;
