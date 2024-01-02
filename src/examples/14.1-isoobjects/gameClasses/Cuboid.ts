import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeInputEvent } from "@/types/IgeInputEvent";

export class Cuboid extends IgeEntity {
	classId = "Cuboid";

	constructor(pointerMoveFunc: IgeInputEvent | null, pointerOutFunc: IgeInputEvent | null) {
		super();

		this.isometric(true)
			// .pointerMove(pointerMoveFunc)
			// .pointerOut(pointerOutFunc)
			// .pointerEventsActive(true)
			.triggerPolygonFunctionName("bounds3dPolygon")
			.opacity(0.95);
	}
}
