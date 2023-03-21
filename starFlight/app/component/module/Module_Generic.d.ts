import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { GameEntityModuleDefinition, GameEntityModuleAudio, GameEntityModuleEffects, GameEntityModuleStates } from "../../../types/GameEntityModuleDefinition";
export declare class Module_Generic extends IgeBaseClass {
    classId: string;
    _definition: GameEntityModuleDefinition;
    _enabled: boolean;
    _active: boolean;
    _target: IgeEntity | null;
    _action?: string;
    _activeStartTime: number;
    _attachedTo: IgeEntity | null;
    constructor(definition: GameEntityModuleDefinition);
    enabled(val?: boolean): boolean | this;
    active(val?: boolean): boolean | this;
    /**
     * Gets / sets the entity that this module is attached to.
     * @param val
     * @returns {*}
     */
    attachedTo(val?: IgeEntity): IgeEntity | this | null;
    target(val?: IgeEntity): IgeEntity | this | null;
    action(val?: string): string | this | undefined;
    /**
     * If any effects are in the module's definition under "effects"
     * this method will enable / disable them and add / remove them
     * to / from the scene.
     */
    processEffects(state: keyof GameEntityModuleEffects): void;
    /**
     * If any audio files are in the module's definition under "audio"
     * this method will enable / disable them.
     */
    processAudio(state: keyof GameEntityModuleAudio): void;
    /**
     * Takes the states in the module's definition for input and output
     * and based on the tickDelta, calculates the amount of input and
     * amount of output the module should provide for this tick.
     * @param {Object} states The current states and their values.
     * @param {Number} tickDelta The tick delta for this tick.
     */
    resolve(states: GameEntityModuleStates, tickDelta: number): void;
    complete(): void;
    cooldown(): boolean;
    canBeActive(): boolean;
}
