import { Module_Ability } from "./Module_Ability";
import { Asteroid } from "../Asteroid";

export declare class Module_MiningLaser extends Module_Ability {
	classId: string;
	_target: Asteroid | null;
	/**
	 * Called when the module has been active for a set period of time
	 * and completes its task.
	 */
	complete(): void;
}
