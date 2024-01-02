import { IgeEntity } from "../../../engine/core/IgeEntity.js"
import type { IgeInputEvent } from "../../../types/IgeInputEvent.js"
export declare class Cuboid extends IgeEntity {
    classId: string;
    constructor(pointerMoveFunc: IgeInputEvent | null, pointerOutFunc: IgeInputEvent | null);
}
