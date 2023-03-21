import { IgeUiButton } from "@/engine/ui/IgeUiButton";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { GameEntityAbilityModuleDefinition } from "../module/Module_Ability";
export interface AbilityButtonOptions {
    abilityId: string;
    module: GameEntityAbilityModuleDefinition;
}
export declare class AbilityButton extends IgeUiEntity {
    classId: string;
    _abilityId: string;
    _button: IgeUiButton;
    _module: GameEntityAbilityModuleDefinition;
    constructor(options: AbilityButtonOptions);
    active(val: any): boolean | this;
    /**
     * Gets / sets the cooldown flag for this ability. When called
     * without a value to set (in getter mode) the method will check
     * remaining cooldown period to see if cooldown has been deactivated
     * or not before giving its answer.
     * @param {Boolean=} val The boolean value to set.
     * @returns {*}
     */
    cooldown(val: any, startTime: any): any;
    /**
     * Sends a request to the server asking for this ability to
     * be activated, via the useAbility() method on the player's
     * entity instance.
     */
    requestActivation(): any;
    update(tickDelta: any): void;
}
