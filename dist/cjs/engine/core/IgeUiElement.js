"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiElement = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
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
class IgeUiElement extends exports_1.IgeUiEntity {
    constructor() {
        super();
        this.classId = "IgeUiElement";
        this._focused = false;
        this._allowHover = true;
        this._allowFocus = true;
        this._allowActive = true;
        if (!exports_3.ige.ui)
            throw new Error("Engine UI component has not been added to the engine, please add the component IgeUiManagerController to the engine");
        exports_3.ige.ui.registerElement(this);
        this.on("pointerOver", () => {
            if (this._allowHover) {
                this._updateStyle();
                exports_3.ige.input.stopPropagation();
            }
            else {
                this._pointerStateOver = false;
            }
        });
        this.on("pointerOut", () => {
            if (this._allowHover) {
                this._updateStyle();
                exports_3.ige.input.stopPropagation();
            }
            else {
                this._pointerStateOver = false;
            }
        });
        this.on("pointerDown", () => {
            if (this._allowActive) {
                this._updateStyle();
                exports_3.ige.input.stopPropagation();
            }
            else {
                this._pointerStateDown = false;
            }
        });
        this.on("pointerUp", (event, evc) => {
            console.log("Pointer up on element", event, evc);
            if (this._allowFocus) {
                // Try to focus the entity
                if (this.focus()) {
                    exports_3.ige.input.stopPropagation();
                    //this._updateStyle();
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
            exports_3.ige.ui.unRegisterElementStyle(this);
        }
        // Assign the new style
        this._styleClass = name;
        // Register the element for this style
        exports_3.ige.ui.registerElementStyle(this);
        // Update the element style
        this._updateStyle();
        return this;
    }
    style(property, value) {
        const ui = exports_3.ige.ui;
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
    /**
     * Uses the entity's classId, styleClass and id to apply any styles
     * defined that match those values. Styles are applied in the order:
     * classId -> styleClass -> id so a style targeting the entity's id
     * would override any of the same style parameters defined in a style
     * class or classId.
     */
    _updateStyle() {
        // TODO: We could aggregate the final style object then apply it once
        //   rather than applying each one separately which currently increases
        //   overall CPU usage as styles are applied and methods called that
        //   don't need to be
        // TODO: We need to create a base style (perhaps follow CSS and use *)
        //   so that if we "un-apply" a style like going from focus to not focussed
        //   the base styles are applied that essentially "undo" the focussed
        //   state. We can identify the style method call (e.g. borderColor) and
        //   only apply those that the focus state affected to save on CPU cycles
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
    _processStyle(styleName, state) {
        if (!styleName) {
            return;
        }
        if (state) {
            styleName += ":" + state;
        }
        const styleData = exports_3.ige.ui.style(styleName);
        if (styleData) {
            //this.log('Applying styles with selector "' + styleName + '"');
            this.applyStyle(styleData);
        }
    }
    applyStyle(styleData) {
        if (styleData === undefined) {
            return this;
        }
        // Loop the style data and apply styles as required
        for (const functionName in styleData) {
            // Check that the style method exists
            // @ts-ignore
            if (typeof this[functionName] === "function") {
                // The method exists, call it with the arguments
                let args;
                if (styleData[functionName] instanceof Array) {
                    args = styleData[functionName];
                }
                else {
                    args = [styleData[functionName]];
                }
                // @ts-ignore
                this[functionName](...args);
            }
        }
        return this;
    }
    /**
     * Sets global UI focus to this element.
     */
    focus() {
        if (exports_3.ige.ui.focus(this)) {
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
        if (exports_3.ige.ui.blur(this)) {
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
        exports_3.ige.ui.unRegisterElement(this);
        return super.destroy();
    }
}
exports.IgeUiElement = IgeUiElement;
(0, exports_2.registerClass)(IgeUiElement);
