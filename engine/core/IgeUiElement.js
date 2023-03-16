import { ige } from "../instance.js";
import IgeUiEntity from "./IgeUiEntity.js";
/**
 * Creates a new UI element. UI elements use more resources and CPU
 * than standard IgeEntity instances but provide a rich set of extra
 * positioning and styling methods as well as reacting to styles
 * defined using the IgeUiManagerComponent.
 */
class IgeUiElement extends IgeUiEntity {
    constructor() {
        super();
        this.classId = "IgeUiElement";
        this._focused = false;
        this._allowHover = true;
        this._allowFocus = true;
        this._allowActive = true;
        if (!ige.engine.components.ui)
            throw new Error("Engine UI component has not been added to the engine, please add the component IgeUiManagerComponent to the engine");
        ige.engine.components.ui.registerElement(this);
        this.on("mouseOver", () => {
            if (this._allowHover) {
                this._updateStyle();
                ige.engine.components.input.stopPropagation();
            }
            else {
                this._mouseStateOver = false;
            }
        });
        this.on("mouseOut", () => {
            if (this._allowHover) {
                this._updateStyle();
                ige.engine.components.input.stopPropagation();
            }
            else {
                this._mouseStateOver = false;
            }
        });
        this.on("mouseDown", () => {
            if (this._allowActive) {
                this._updateStyle();
                ige.engine.components.input.stopPropagation();
            }
            else {
                this._mouseStateDown = false;
            }
        });
        this.on("mouseUp", () => {
            if (this._allowFocus) {
                // Try to focus the entity
                if (!this.focus()) {
                    this._updateStyle();
                }
                else {
                    ige.engine.components.input.stopPropagation();
                }
            }
            else if (this._allowActive) {
                this._updateStyle();
            }
        });
        // Enable mouse events on this entity by default
        this.mouseEventsActive(true);
    }
    allowHover(val) {
        if (val !== undefined) {
            this._allowHover = val;
            return this;
        }
        return this._allowHover;
    }
    allowFocus(val) {
        if (val !== undefined) {
            this._allowFocus = val;
            return this;
        }
        return this._allowFocus;
    }
    allowActive(val) {
        if (val !== undefined) {
            this._allowActive = val;
            return this;
        }
        return this._allowActive;
    }
    /**
     * Gets / sets the applied style by name.
     * @param {String=} name The style name to apply.
     * @returns {*}
     */
    styleClass(name) {
        if (name === undefined) {
            return this._styleClass;
        }
        // Add a period to the class name
        name = "." + name;
        // Check for existing assigned style
        if (this._styleClass && this._styleClass !== name) {
            // Unregister this element from the style
            ige.engine.components.ui.unRegisterElementStyle(this);
        }
        // Assign the new style
        this._styleClass = name;
        // Register the element for this style
        ige.engine.components.ui.registerElementStyle(this);
        // Update the element style
        this._updateStyle();
        return this;
    }
    style(styleDataObject) {
        if (styleDataObject === undefined) {
            return this._style;
        }
        // Assign the new style
        this._style = styleDataObject;
        // Update the element style
        this._updateStyle();
    }
    _updateStyle() {
        // Apply styles in order of class, class:focus, class:hover, class:active,
        // id, id:focus, id:hover, id:active
        this._processStyle(this.classId);
        this._processStyle(this._styleClass);
        this._processStyle("#" + this._id);
        this.applyStyle(this._style);
        if (this._focused) {
            this._processStyle(this.classId, "focus");
            this._processStyle(this._styleClass, "focus");
            this._processStyle("#" + this._id, "focus");
        }
        if (this._mouseStateOver) {
            this._processStyle(this.classId, "hover");
            this._processStyle(this._styleClass, "hover");
            this._processStyle("#" + this._id, "hover");
        }
        if (this._mouseStateDown) {
            this._processStyle(this.classId, "active");
            this._processStyle(this._styleClass, "active");
            this._processStyle("#" + this._id, "active");
        }
    }
    _processStyle(styleName, state) {
        if (!styleName) {
            return;
        }
        if (state) {
            styleName += ":" + state;
        }
        const styleData = ige.engine.components.ui.style(styleName);
        if (styleData) {
            //this.log('Applying styles with selector "' + styleName + '"');
            this.applyStyle(styleData);
        }
    }
    /**
     * Apply styles from a style data object. Usually you don't want to
     * call this method directly but rather assign a style by name using
     * the style() method, however it is not illegal practise to apply
     * here if you wish if you have not defined a style by name and simply
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
    applyStyle(styleData) {
        if (styleData === undefined) {
            return this;
        }
        // Loop the style data and apply styles as required
        for (const i in styleData) {
            // Check that the style method exists
            // @ts-ignore
            if (typeof this[i] === "function") {
                // The method exists, call it with the arguments
                let args;
                if (styleData[i] instanceof Array) {
                    args = styleData[i];
                }
                else {
                    args = [styleData[i]];
                }
                // @ts-ignore
                this[i](...args);
            }
        }
        return this;
    }
    /**
     * Sets global UI focus to this element.
     */
    focus() {
        if (ige.engine.components.ui.focus(this)) {
            // Re-apply styles since the change
            this._updateStyle();
            return true;
        }
        return false;
    }
    blur() {
        if (ige.engine.components.ui.blur(this)) {
            // Re-apply styles since the change
            this._updateStyle();
            return true;
        }
        return false;
    }
    focused() {
        return this._focused;
    }
    value(val) {
        if (val !== undefined) {
            this._value = val;
            return this;
        }
        return this._value;
    }
    _mounted() {
        this._updateStyle();
    }
    /**
     * Destructor
     */
    destroy() {
        ige.engine.components.ui.unRegisterElement(this);
        return super.destroy();
    }
}
export default IgeUiElement;
