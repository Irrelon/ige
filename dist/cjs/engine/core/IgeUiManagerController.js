"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiManagerController = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
const exports_4 = require("../../export/exports.js");
class IgeUiManagerController extends exports_2.IgeEventingClass {
    constructor() {
        super(...arguments);
        this.componentId = "ui";
        this.classId = "IgeUiManagerController";
        this._focus = null; // The element that currently has focus
        this._caret = null; // The caret position within the focused element
        this._register = [];
        this._styles = {};
        this._elementsByStyle = {};
        this._addEventListeners = (callback) => {
            // Remove any previous listeners
            this._removeEventListeners();
            exports_3.ige.dependencies.waitFor(["input"], () => {
                exports_3.ige.input.on("keyDown", this._keyDown);
                callback === null || callback === void 0 ? void 0 : callback();
            });
        };
        this._removeEventListeners = (callback) => {
            exports_3.ige.dependencies.waitFor(["input"], () => {
                exports_3.ige.input.off("keyDown", this._keyDown);
                callback === null || callback === void 0 ? void 0 : callback();
            });
        };
        this._keyUp = (event) => {
            // Direct the key event to the focused element
            if (this._focus) {
                this._focus.emit("keyUp", event);
                exports_3.ige.input.stopPropagation();
            }
        };
        this._keyDown = (event) => {
            // Direct the key event to the focused element
            if (this._focus) {
                this._focus.emit("keyDown", event);
                exports_3.ige.input.stopPropagation();
            }
        };
    }
    isReady() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this._addEventListeners(resolve);
            }, 1);
        });
    }
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
        (0, exports_1.arrPull)(this._register, elem);
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
    focus(elem) {
        console.log("Global focus call", elem, new Error().stack);
        if (elem !== undefined) {
            if (elem !== this._focus) {
                console.log("Global focus being set to", elem, new Error().stack);
                // The element is not our current focus so focus to it
                const previousFocus = this._focus;
                // Tell the current focused element that it is about to lose focus
                if (!previousFocus || previousFocus.emit("blur", elem) !== exports_4.IgeEventReturnFlag.cancel) {
                    if (previousFocus) {
                        previousFocus._focused = false;
                        previousFocus.blur();
                    }
                    // The blur was not cancelled
                    if (elem.emit("focus", previousFocus) !== exports_4.IgeEventReturnFlag.cancel) {
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
                if (elem.emit("blur") !== exports_4.IgeEventReturnFlag.cancel) {
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
}
exports.IgeUiManagerController = IgeUiManagerController;
IgeUiManagerController.componentTargetClass = "IgeEngine";
