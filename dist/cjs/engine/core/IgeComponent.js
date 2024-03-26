"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeComponent = void 0;
const IgeEventingClass_1 = require("./IgeEventingClass.js");
class IgeComponent extends IgeEventingClass_1.IgeEventingClass {
    constructor(parent, options) {
        super();
        this.componentId = "IgeComponent";
        this._entity = parent;
        this._options = options;
    }
    destroy() {
        return this;
    }
}
exports.IgeComponent = IgeComponent;
