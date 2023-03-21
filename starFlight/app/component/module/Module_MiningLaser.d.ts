import { Module_Ability } from "./Module_Ability";
export declare class Module_MiningLaser extends Module_Ability {
    classId: string;
    /**
     * Called when the module has been active for a set period of time
     * and completes its task.
     */
    complete(): void;
}
