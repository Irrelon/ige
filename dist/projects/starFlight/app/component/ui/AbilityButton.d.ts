import { IgeUiEntity } from "../../../../../engine/core/IgeUiEntity.js"
import { IgeUiButton } from "../../../../../engine/ui/IgeUiButton.js"
import { IgeUiLabel } from "../../../../../engine/ui/IgeUiLabel.js"
import type { EntityAbilityModuleDefinition } from "../../../types/EntityAbilityModuleDefinition.js"
import type { IgeCanvasRenderingContext2d } from "../../../../../types/IgeCanvasRenderingContext2d.js"
export interface AbilityButtonOptions {
    abilityId: string;
    label: string;
    module: EntityAbilityModuleDefinition;
}
export declare class AbilityButton extends IgeUiEntity {
    classId: string;
    _abilityId: string;
    _button: IgeUiButton;
    _module: EntityAbilityModuleDefinition;
    _label: IgeUiLabel;
    _timerCircle: IgeUiEntity;
    constructor(options: AbilityButtonOptions);
    active(val?: boolean): boolean | this;
    /**
     * Gets / sets the cooldown flag for this ability. When called
     * without a value to set (in getter mode) the method will check
     * remaining cooldown period to see if cooldown has been deactivated
     * or not before giving its answer.
     * @param {Boolean=} val The boolean value to set.
     * @param startTime
     * @returns {*}
     */
    cooldown(val?: boolean, startTime?: number): boolean | this;
    /**
     * Sends a request to the server asking for this ability to
     * be activated, via the useAbility() method on the player's
     * entity instance.
     */
    requestActivation(): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
