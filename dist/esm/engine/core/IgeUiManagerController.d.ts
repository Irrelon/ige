import { IgeEventingClass } from "./IgeEventingClass.js"
import type { IgeUiElement } from "./IgeUiElement.js"
import type { IgeAnyFunction } from "../../types/IgeAnyFunction.js"
import type { IgeClassRecord } from "../../types/IgeClassRecord.js"
import type { IgeIsReadyPromise } from "../../types/IgeIsReadyPromise.js"
import type { IgeUiStyleObject } from "../../types/IgeUiStyleObject.js"
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
    _addEventListeners: (callback?: IgeAnyFunction) => void;
    _removeEventListeners: (callback?: IgeAnyFunction) => void;
    /**
     * Get / set a style by name. This is the main way to define styles using
     * the engine's style system. A style name can be any string that maps to
     * a method name on the target entity that the style will be applied to.
     *
     * The style() function supports a similar naming convention to CSS so to
     * create a style for an entity that has a specific id you would start the
     * style name with a hash # character. To create a style class that can be
     * shared and applied to multiple entities at the same time, the name starts
     * with a period . character. You can also define styles for a specific
     * entity constructor e.g. IgeUiTextbox.
     *
     * Finally, all style types support the addition of modifier states to a
     * style that respond to the internal state of the entity it's applied to.
     * You denote modifier state names by providing the style name, then a
     * colon : character, then the modifier name. Supported modifiers are
     * defined in the type IgeUiStyleModifier. Styles are always applied in
     * the order of least specific to most specific, so constructor styles
     * first, then style classes and finally id-based styles.
     *
     * @example Create an id-based style
     * 		> Styles with a # are auto-applied to IgeUiElement() instances
     * 		> where the id matches the name after the #
     * 		// Create the style targeting the id
     * 		ige.ui.style("#myEntityId", {color: "blue"});
     *
     * 		// Create the entity with the id - the style is auto-applied
     * 		new IgeUiElement().id("myEntityId");
     *
     * @example Create a style class that can be shared
     * 		> Styles starting with a . are considered "style classes"
     * 		> and can be applied to multiple ui entities
     * 		// Create a style class
     * 		ige.ui.style(".blueText", {color: "blue"});
     *
     * 		// Create an entity and assign the style class
     * 		new IgeUiElement().styleClass("blueText");
     *
     * @example Create a style targeting a constructor
     * 		> Styles that don't start with a # or . are considered
     * 		> constructor selectors
     * 		// Create a style that targets a constructor
     * 		ige.ui.style("IgeUiTextbox", {color: "purple"});
     *
     * 		// Create an entity with the IgeUiTextbox constructor
     * 		// the style for this constructor is automatically applied
     * 		new IgeUiTextbox();
     *
     * @example Create a modifier style
     * 		> Style names that have a colon : in their name are
     * 		> considered to be modifier styles
     * 		ige.ui.style("IgeUiTextbox:focus", {
     * 			borderColor: "red",
     * 			borderWidth: 1
     * 		});
     *
     * @param {string} name The unique name of the style.
     * @param {Object=} data The style properties and values to assign to the
     * style.
     * @returns {*}
     */
    style<StyleClassType>(name: string, data: IgeClassRecord<Partial<StyleClassType>>): this;
    style<StyleClassType>(name: string | undefined): IgeClassRecord<Partial<StyleClassType>> | undefined;
    style<StyleClassType>(): this;
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
    /**
     * Tells the currently focussed element to blur. Can still
     * be cancelled by an event listener that returns a cancel signal.
     */
    blurCurrent(): void;
    /**
     * Attempts to place focus on the passed element. If focus is successful
     * or the element is already focussed, returns true, otherwise returns
     * false.
     * @param elem
     */
    focus(elem: IgeUiElement): boolean;
    blur(elem: IgeUiElement): boolean;
    _keyUp: (event: Event) => void;
    _keyDown: (event: Event) => void;
}
