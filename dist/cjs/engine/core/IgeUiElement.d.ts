import { IgeUiEntity } from "./IgeUiEntity.js"
import type { IgeUiStyleModifier } from "../../types/IgeUiStyleModifier.js"
import type { IgeUiStyleObject } from "../../types/IgeUiStyleObject.js"
/**
 * Creates a new UI element. UI elements use more resources and CPU
 * than standard IgeEntity instances but provide a rich set of extra
 * positioning and styling methods as well as reacting to styles
 * defined using the IgeUiManagerController.
 *
 * IgeUiElement instances are similar to DOM elements. They receive
 * their own pointer events as standard and also stop propagation
 * of those events to lower depth entities and as such, should only
 * be used if you intend to create user-interface elements. If you
 * don't intend to create an element, use IgeUiEntity instead as
 * those will use fewer resources and will not block pointer events
 * from propagating to lower depth entities by default.
 */
export declare class IgeUiElement extends IgeUiEntity {
    classId: string;
    _focused: boolean;
    _allowHover: boolean;
    _allowFocus: boolean;
    _allowActive: boolean;
    _styleClass?: string;
    _style?: IgeUiStyleObject;
    _value?: any;
    constructor();
    allowHover(val: boolean): this;
    allowHover(): boolean;
    allowFocus(val: boolean): this;
    allowFocus(): boolean;
    allowActive(val: boolean): this;
    allowActive(): boolean;
    /**
     * Gets / sets the applied style by name.
     * @param {string=} name The style name to apply.
     * @returns {*}
     */
    styleClass(name?: string): this;
    styleClass(): string;
    /**
     * Gets / sets a style for this individual element.
     * @param {string=} property The property to get / set.
     * @param {*=} value The value to set for the property.
     * @return {*}
     */
    style(property: string, value: any): this;
    style(property: string): any;
    /**
     * Uses the entity's classId, styleClass and id to apply any styles
     * defined that match those values. Styles are applied in the order:
     * classId -> styleClass -> id so a style targeting the entity's id
     * would override any of the same style parameters defined in a style
     * class or classId.
     */
    _updateStyle(): void;
    /**
     * Process a given style + state and apply it to the element.
     * This means method provides a way for the style system to apply styles
     * based on both the style name and the current state of the element.
     * The style system supports common modifier states similar to CSS.
     * For instance, you can define a style in the ui system via:
     *
     * 		ige.ui.style(".myStyleClass", {paddingLeft: 10});
     *
     * You can then define a modifier to that style:
     *
     * 		ige.ui.style(".myStyleClass:focus", {paddingLeft: 20});
     *
     * When you assign the style class to an IgeUiElement, the focus state of
     * that element will affect the style being applied:
     *
     * 		new IgeUiTextbox().styleClass("myStyleClass");
     *
     * When un-focussed, the textbox will have left-padding of 10. When the
     * user clicks into the textbox and it gains focus, the left-padding will
     * update to 20. When it loses focus the left-padding will reset to 10.
     *
     * @see IgeUiManagerController.style()
     * @param {string} styleName - The name of the style to process.
     * @param {IgeUiStyleModifier} [state] - The state of the style.
     *
     * @return {void}
     */
    _processStyle(styleName?: string, state?: IgeUiStyleModifier): undefined;
    /**
     * Apply styles from a style data object. Usually you don't want to
     * call this method directly but rather assign a style by name using
     * the style() method, however it is not illegal practise to apply
     * here if you wish, if you have not defined a style by name and simply
     * wish to apply style data directly.
     *
     * Style property names must correspond to method names in the element
     * class that the style is being applied to. You can see the default
     * ui style methods available in the ./engine/ui/IgeUi* files.
     *
     * In the example below showing padding, you can see how the data assigned
     * is passed to the "padding()" method as arguments, which is the same
     * as calling "padding(10, 10, 10, 10);".
     *
     * @example #Apply a background color
     *     var elem = new IgeUiElement()
     *         .applyStyle({
     *             'backgroundColor': '#ffffff' // Set background color to white
     *         });
     *
     *     Internally, this call is equivalent to `elem.backgroundColor("#ffffff");`
     *
     * @example #Apply padding with multiple arguments
     *     var elem = new IgeUiElement()
     *         .applyStyle({
     *             'padding': [10, 10, 10, 10] // Set padding using multiple values
     *         });
     *
     *     Internally, this call is equivalent to `elem.padding(10, 10, 10, 10);`
     *
     * @param {Object} styleData The style object to apply. This object should
     * contain key/value pairs where the key matches a method name and the value
     * is the argument or array of arguments to pass it. Arrays of arguments are
     * spread using the `...args` spread operator e.g. `someFunc(...args);`
     */
    applyStyle(styleData: IgeUiStyleObject): this;
    applyStyle(): IgeUiStyleObject;
    /**
     * Sets global UI focus to this element.
     */
    focus(): boolean;
    /**
     * The blur method removes global UI focus from this UI element.
     */
    blur(): boolean;
    focused(): boolean;
    value(val?: any): any;
    _mounted(): void;
    /**
     * Destructor
     */
    destroy(): this;
}
