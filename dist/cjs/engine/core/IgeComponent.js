"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeComponent = void 0;
const exports_1 = require("../../export/exports.js");
class IgeComponent extends exports_1.IgeEventingClass {
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
