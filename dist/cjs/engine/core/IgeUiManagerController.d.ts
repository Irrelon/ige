import { IgeEventingClass } from "../../export/exports.js"
import type { IgeUiElement, IgeUiStyleObject } from "../../export/exports.js"
import type { IgeIsReadyPromise } from "../../export/exports.js"
export declare class IgeUiManagerController extends IgeEventingClass implements IgeIsReadyPromise {
    static componentTargetClass: string;
    componentId: string;
    classId: string;
    _focus: IgeUiElement | null;
    _caret: null;
    _register: IgeUiElement[];
    _styles: Record<string, IgeUiStyleObject>;
    _elementsByStyle: Record<string, IgeUiElement[]>;
    isReady(): Promise<void>;
    /**
     * Get / set a style by name.
     * @param {string} name The unique name of the style.
     * @param {Object=} data The style properties and values to assign to the
     * style.
     * @returns {*}
     */
    style(name?: string, data?: IgeUiStyleObject): IgeUiStyleObject | this;
    /**
     * Registers a UI element with the UI manager.
     * @param elem
     */
    registerElement(elem: IgeUiElement): void;
    /**
     * Un-registers a UI element with the UI manager.
     * @param elem
     */
    unRegisterElement(elem: IgeUiElement): void;
    /**
     * Registers a UI element against a style for quick lookup.
     * @param elem
     */
    registerElementStyle(elem: IgeUiElement): void;
    /**
     * Un-registers a UI element from a style.
     * @param elem
     */
    unRegisterElementStyle(elem: IgeUiElement): void;
    canFocus(elem: IgeUiElement): boolean;
    focus(elem: IgeUiElement): boolean;
    blur(elem: IgeUiElement): boolean;
    _keyUp: (event: Event) => void;
    _keyDown: (event: Event) => void;
}
