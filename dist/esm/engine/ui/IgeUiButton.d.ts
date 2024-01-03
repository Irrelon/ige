import { IgeUiElement } from "../../export/exports.js"
import type { IgeCanvasRenderingContext2d } from "../../export/exports.js"
export declare class IgeUiButton extends IgeUiElement {
    classId: string;
    _autoCell: boolean;
    constructor();
    /**
     * Gets / sets the auto cell flag. If true the button will automatically
     * react to being clicked on and update the texture cell to +1 when mousedown
     * and -1 when mouseup allowing you to define cell sheets of button graphics
     * with the up-state on cell 1 and the down-state on cell 2.
     * @param {Boolean=} val Either true or false.
     * @returns {*}
     */
    autoCell(val?: boolean): boolean | this;
    /**
     * Fires a mouse-down and a mouse-up event for the entity.
     * @returns {*}
     */
    click(): this;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
