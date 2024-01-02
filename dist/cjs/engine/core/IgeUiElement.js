"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiElement = void 0;
const IgeUiEntity_1 = require("./IgeUiEntity");
const igeClassStore_1 = require("../igeClassStore.js");
const instance_1 = require("../instance");
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
class IgeUiElement extends IgeUiEntity_1.IgeUiEntity {
    constructor() {
        super();
        this.classId = "IgeUiElement";
        this._focused = false;
        this._allowHover = true;
        this._allowFocus = true;
        this._allowActive = true;
        if (!instance_1.ige.ui)
            throw new Error("Engine UI component has not been added to the engine, please add the component IgeUiManagerController to the engine");
        instance_1.ige.ui.registerElement(this);
        this.on("pointerOver", () => {
            if (this._allowHover) {
                this._updateStyle();
                instance_1.ige.input.stopPropagation();
            }
            else {
                this._pointerStateOver = false;
            }
        });
        this.on("pointerOut", () => {
            if (this._allowHover) {
                this._updateStyle();
                instance_1.ige.input.stopPropagation();
            }
            else {
                this._pointerStateOver = false;
            }
        });
        this.on("pointerDown", () => {
            if (this._allowActive) {
                this._updateStyle();
                instance_1.ige.input.stopPropagation();
            }
            else {
                this._pointerStateDown = false;
            }
        });
        this.on("pointerUp", () => {
            if (this._allowFocus) {
                // Try to focus the entity
                if (!this.focus()) {
                    this._updateStyle();
                }
                else {
                    instance_1.ige.input.stopPropagation();
                }
            }
            else if (this._allowActive) {
                this._updateStyle();
            }
        });
        // Enable mouse events on this entity by default
        this.pointerEventsActive(true);
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
    styleClass(name) {
        if (name === undefined) {
            return this._styleClass;
        }
        // Add a period to the class name
        name = "." + name;
        // Check for existing assigned style
        if (this._styleClass && this._styleClass !== name) {
            // Unregister this element from the style
            instance_1.ige.ui.unRegisterElementStyle(this);
        }
        // Assign the new style
        this._styleClass = name;
        // Register the element for this style
        instance_1.ige.ui.registerElementStyle(this);
        // Update the element style
        this._updateStyle();
        return this;
    }
    style(property, value) {
        const ui = instance_1.ige.ui;
        const allStyles = {};
        const elementStyles = ui.style(this.classId) || {}; // Get styles by element type (e.g. "IgeUiButton")
        const classStyles = ui.style(this._styleClass) || {}; // Get styles by class name (e.g. ".helpButton")
        const idStyles = ui.style("#" + this._id) || {}; // Get styles by element id (e.g. "#myHelpButton")
        for (const i in elementStyles) {
            if (elementStyles.hasOwnProperty(i)) {
                allStyles[i] = elementStyles[i];
            }
        }
        for (const i in classStyles) {
            if (classStyles.hasOwnProperty(i)) {
                allStyles[i] = classStyles[i];
            }
        }
        for (const i in idStyles) {
            if (idStyles.hasOwnProperty(i)) {
                allStyles[i] = idStyles[i];
            }
        }
        if (property !== undefined) {
            if (value !== undefined) {
                // Assign property value to our idStyles object and
                // assign it back to the style management component
                idStyles[property] = value;
                ui.style("#" + this._id, idStyles);
                return this;
            }
            return allStyles[property];
        }
        return allStyles;
    }
    _updateStyle() {
        // Apply styles in order of class, class:focus, class:hover, class:active,
        // id, id:focus, id:hover, id:active
        this._processStyle(this.classId);
        this._processStyle(this._styleClass);
        this._processStyle("#" + this._id);
        if (this._focused) {
            this._processStyle(this.classId, "focus");
            this._processStyle(this._styleClass, "focus");
            this._processStyle("#" + this._id, "focus");
        }
        if (this._pointerStateOver) {
            this._processStyle(this.classId, "hover");
            this._processStyle(this._styleClass, "hover");
            this._processStyle("#" + this._id, "hover");
        }
        if (this._pointerStateDown) {
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
        const styleData = instance_1.ige.ui.style(styleName);
        if (styleData) {
            //this.log('Applying styles with selector "' + styleName + '"');
            this.applyStyle(styleData);
        }
    }
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
        if (instance_1.ige.ui.focus(this)) {
            // Re-apply styles since the change
            this._updateStyle();
            return true;
        }
        return false;
    }
    /**
     * The blur method removes global UI focus from this UI element.
     */
    blur() {
        if (instance_1.ige.ui.blur(this)) {
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
        instance_1.ige.ui.unRegisterElement(this);
        return super.destroy();
    }
}
exports.IgeUiElement = IgeUiElement;
(0, igeClassStore_1.registerClass)(IgeUiElement);
