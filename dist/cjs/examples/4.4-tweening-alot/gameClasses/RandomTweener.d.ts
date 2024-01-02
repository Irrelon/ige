import { IgeEntity } from "@/engine/core/IgeEntity";

export declare class RandomTweener extends IgeEntity {
	classId: string;
	constructor();
	/**
	 * Creates a new random position and rotation to tween
	 * to and then starts the tween.
	 */
	newTween(): void;
}
