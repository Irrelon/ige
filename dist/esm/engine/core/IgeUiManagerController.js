import { IgeEventingClass } from "./IgeEventingClass.js"
import { ige } from "../instance.js"
import { arrPull } from "../utils/arrays.js"
import { IgeEventReturnFlag } from "../../enums/index.js"
export class IgeUiManagerController extends IgeEventingClass {
    static componentTargetClass = "IgeEngine";
    componentId = "ui";
    classId = "IgeUiManagerController";
    _focus = null; // The element that currently has focus
    _caret = null; // The caret position within the focused element
    _register = [];
    _styles = {};
    _elementsByStyle = {};
    isReady() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this._addEventListeners(resolve);
            }, 1);
        });
    }
    _addEventListeners = (callback) => {
        // Remove any previous listeners
        this._removeEventListeners();
        ige.dependencies.waitFor(["input"], () => {
            ige.input.on("keyDown", this._keyDown);
            callback?.();
        });
    };
    _removeEventListeners = (callback) => {
        ige.dependencies.waitFor(["input"], () => {
            ige.input.off("keyDown", this._keyDown);
            callback?.();
        });
    };
    style(name, data) {
        if (name !== undefined) {
            if (data !== undefined) {
                // Set the data against the name, update any elements using the style
                this._styles[name] = data;
                return this;
            }
            // Get the data and return
            return this._styles[name];
        }
        return;
    }
    /**
     * Registers a UI element with the UI manager.
     * @param elem
     */
    registerElement(elem) {
        this._register.push(elem);
    }
    /**
     * Un-registers a UI element with the UI manager.
     * @param elem
     */
    unRegisterElement(elem) {
        arrPull(this._register, elem);
        // Kill any styles defined for this element id
        delete this._styles["#" + elem._id];
        delete this._styles["#" + elem._id + ":active"];
        delete this._styles["#" + elem._id + ":focus"];
        delete this._styles["#" + elem._id + ":hover"];
    }
    /**
     * Registers a UI element against a style for quick lookup.
     * @param elem
     */
    registerElementStyle(elem) {
        if (elem && elem._styleClass) {
            this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
            this._elementsByStyle[elem._styleClass].push(elem);
        }
    }
    /**
     * Un-registers a UI element from a style.
     * @param elem
     */
    unRegisterElementStyle(elem) {
        if (elem && elem._styleClass) {
            this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
            this._elementsByStyle[elem._styleClass].push(elem);
        }
    }
    canFocus(elem) {
        return elem._allowFocus;
    }
    /**
     * Tells the currently focussed element to blur. Can still
     * be cancelled by an event listener that returns a cancel signal.
     */
    blurCurrent() {
        if (!this._focus)
            return;
        this._focus.blur();
    }
    /**
     * Attempts to place focus on the passed element. If focus is successful
     * or the element is already focussed, returns true, otherwise returns
     * false.
     * @param elem
     */
    focus(elem) {
        //console.log("Global focus call", elem, new Error().stack);
        if (elem !== undefined) {
            if (elem !== this._focus) {
                //console.log("Global focus being set to", elem, new Error().stack);
                // The element is not our current focus so focus to it
                const previousFocus = this._focus;
                // Tell the current focused element that it is about to lose focus
                if (!previousFocus || previousFocus.emit("blur", elem) !== IgeEventReturnFlag.cancel) {
                    if (previousFocus) {
                        previousFocus._focused = false;
                        previousFocus.blur();
                    }
                    // The blur was not cancelled
                    if (elem.emit("focus", previousFocus) !== IgeEventReturnFlag.cancel) {
                        // The focus was not cancelled
                        this._focus = elem;
                        elem._focused = true;
                        return true;
                    }
                }
            }
            else {
                // We are already focused
                return true;
            }
        }
        return false;
    }
    blur(elem) {
        //console.log('blur', elem._id, elem);
        if (elem !== undefined) {
            if (elem === this._focus) {
                // The element is currently focused
                // Tell the current focused element that it is about to lose focus
                if (elem.emit("blur") !== IgeEventReturnFlag.cancel) {
                    // The blur was not cancelled
                    this._focus = null;
                    elem._focused = false;
                    elem._updateStyle();
                    return true;
                }
            }
        }
        return false;
    }
    _keyUp = (event) => {
        // Direct the key event to the focused element
        if (this._focus) {
            this._focus.emit("keyUp", event);
            ige.input.stopPropagation();
        }
    };
    _keyDown = (event) => {
        // Direct the key event to the focused element
        if (this._focus) {
            this._focus.emit("keyDown", event);
            ige.input.stopPropagation();
        }
    };
}
