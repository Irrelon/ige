import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { EntityModuleDefinition, EntityModuleAudio, EntityModuleEffects, EntityModuleStates } from "../../../types/EntityModuleDefinition";
export declare class Module_Generic extends IgeBaseClass {
    classId: string;
    _definition: EntityModuleDefinition;
    _enabled: boolean;
    _active: boolean;
    _activeStartTime: number;
    _attachedTo: IgeEntity | null;
    constructor(definition: EntityModuleDefinition);
    enabled(val?: boolean): boolean | this;
    active(val?: boolean): boolean | this;
    /**
     * Gets / sets the entity that this module is attached to.
     * @param val
     * @returns {*}
     */
    attachedTo(val?: IgeEntity): IgeEntity | this | null;
    /**
     * If any effects are in the module's definition under "effects"
     * this method will enable / disable them and add / remove them
     * to / from the scene.
     */
    processEffects(state: keyof EntityModuleEffects): void;
    /**
     * If any audio files are in the module's definition under "audio"
     * this method will enable / disable them.
     */
    processAudio(state: keyof EntityModuleAudio): void;
    /**
     * Takes the states in the module's definition for input and output
     * and based on the tickDelta, calculates the amount of input and
     * amount of output the module should provide for this tick.
     * @param {Object} states The current states and their values.
     * @param {Number} tickDelta The tick delta for this tick.
     */
    resolve(states: EntityModuleStates, tickDelta: number): void;
    complete(): void;
    cooldown(): boolean;
    canBeActive(states: EntityModuleStates): boolean;
}
