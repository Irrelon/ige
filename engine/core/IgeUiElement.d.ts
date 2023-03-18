import { IgeUiEntity } from "./IgeUiEntity";
export type IgeUiStyleObject = Record<string, any>;
export type IgeUiStyleState = "focus" | "hover" | "active";
/**
 * Creates a new UI element. UI elements use more resources and CPU
 * than standard IgeEntity instances but provide a rich set of extra
 * positioning and styling methods as well as reacting to styles
 * defined using the IgeUiManagerComponent.
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
     * @param {String=} name The style name to apply.
     * @returns {*}
     */
    styleClass(name?: string): this;
    styleClass(): string;
    style(styleDataObject: IgeUiStyleObject): IgeUiStyleObject | undefined;
    _updateStyle(): void;
    _processStyle(styleName?: string, state?: IgeUiStyleState): void;
    /**
     * Apply styles from a style data object. Usually you don't want to
     * call this method directly but rather assign a style by name using
     * the style() method, however it is not illegal practise to apply
     * here if you wish, if you have not defined a style by name and simply
     * wish to apply style data directly.
     *
     * Style property names must correspond to method names in the element
     * class that the style is being applied to. You can see the default
     * ui style methods available in the ./engine/extensions/IgeUi* files.
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
     * @example #Apply padding with multiple arguments
     *     var elem = new IgeUiElement()
     *         .applyStyle({
     *             'padding': [10, 10, 10, 10] // Set padding using multiple values
     *         });
     *
     * @param {Object} styleData The style object to apply. This object should
     * contain key/value pairs where the key matches a method name and the value
     * is the parameter to pass it.
     */
    applyStyle(styleData?: IgeUiStyleObject): this;
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
