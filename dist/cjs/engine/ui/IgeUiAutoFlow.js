"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiAutoFlow = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
class IgeUiAutoFlow extends exports_2.IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiAutoFlow";
        this._currentHeight = 0;
    }
    tick(ctx) {
        // Loop children and re-position then
        const arr = this._children;
        const arrCount = arr.length;
        let currentY = 0;
        for (let i = 0; i < arrCount; i++) {
            const item = arr[i];
            const itemY = item._bounds2d.y;
            item.top(currentY);
            currentY += itemY;
        }
        // Now do the super-class tick
        super.tick(ctx);
    }
}
exports.IgeUiAutoFlow = IgeUiAutoFlow;
(0, exports_1.registerClass)(IgeUiAutoFlow);
