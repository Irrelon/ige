import { IgeEntity } from "../../../engine/core/IgeEntity.js"
export class Cuboid extends IgeEntity {
    classId = "Cuboid";
    constructor(pointerMoveFunc, pointerOutFunc) {
        super();
        this.isometric(true)
            // .pointerMove(pointerMoveFunc)
            // .pointerOut(pointerOutFunc)
            // .pointerEventsActive(true)
            .triggerPolygonFunctionName("bounds3dPolygon")
            .opacity(0.95);
    }
}
