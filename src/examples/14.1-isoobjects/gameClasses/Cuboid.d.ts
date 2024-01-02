import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeInputEvent } from "@/types/IgeInputEvent";

export declare class Cuboid extends IgeEntity {
	classId: string;
	constructor(pointerMoveFunc: IgeInputEvent | null, pointerOutFunc: IgeInputEvent | null);
}
