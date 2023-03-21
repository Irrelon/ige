import { Module_Generic } from "./Module_Generic";
import { GameEntityModuleAudio, GameEntityModuleBaseCost, GameEntityModuleDefinition, GameEntityModuleEffects, GameEntityModuleInputOutput, GameEntityModuleStates, GameEntityModuleUsageCost } from "../../../types/GameEntityModuleDefinition";
export interface GameEntityAbilityModuleDefinition extends GameEntityModuleDefinition {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: 1;
    action: string;
    classId: string;
    name: string;
    abilityTitle: string;
    damageIndex?: number;
    usageCost: GameEntityModuleUsageCost;
    input: GameEntityModuleInputOutput;
    output: GameEntityModuleInputOutput;
    state: GameEntityModuleStates;
    range?: number;
    attachTo: string[];
    baseCost: GameEntityModuleBaseCost;
    requiresTarget?: boolean;
    enabled: boolean;
    active: boolean;
    activeDuration: number;
    cooldownDuration: number;
    effects?: GameEntityModuleEffects;
    audio?: GameEntityModuleAudio;
}
export declare class Module_Ability extends Module_Generic {
    classId: string;
    _cooldown: boolean;
    _cooldownStartTime: number;
    constructor(definition: GameEntityAbilityModuleDefinition);
    active(val: boolean, states: GameEntityModuleStates): this;
    active(): boolean;
    /**
     * Determines if the active flag can transition from false
     * to true. This is useful for checking pre-flight conditions
     * for allowing an ability to activate etc.
     * @param {Object} states The current states that we read values
     * from to determine if the module can activate.
     * @returns {boolean} If true, allows the active flag to become
     * true. If false, denies it.
     */
    canBeActive(states: GameEntityModuleStates): boolean;
    /**
     * Determines if the active flag can transition from true
     * to false. This is useful for checking post-flight conditions
     * for allowing an ability to deactivate etc.
     * @returns {boolean} If true, allows the active flag to become
     * false. If false, denies it.
     */
    canBeInactive(states: any): any;
    /**
     * Called when an ability's active flag has been set to true
     * when it was previously set to false.
     * @private
     */
    _onActive(states: any): void;
    /**
     * Called when an ability's active flag has been set to false
     * when it was previously set to true.
     * @private
     */
    _onInactive(states: GameEntityModuleStates): void;
    complete(): void;
    /**
     * Gets / sets the cooldown flag for this ability. When called
     * without a value to set (in getter mode) the method will check
     * remaining cooldown period to see if cooldown has been deactivated
     * or not before giving its answer.
     * @param {Boolean=} val The boolean value to set.
     * @returns {*}
     */
    cooldown(val: boolean): this;
    cooldown(): boolean;
    /**
     * Takes the states in the module's definition for input and output
     * and based on the tickDelta, calculates the amount of input and
     * amount of output the module should provide for this tick.
     * @param {Object} states The current states and their values.
     * @param {Number} tickDelta The tick delta for this tick.
     */
    resolve(states: any, tickDelta: any): void;
}
