import { IgeEntity } from "@/engine/core/IgeEntity";
export class Cuboid extends IgeEntity {
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
