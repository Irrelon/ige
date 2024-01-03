"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiInlineFlow = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
class IgeUiInlineFlow extends exports_1.IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiInlineFlow";
    }
    tick(ctx, dontTransform = false) {
        // Loop children and re-position them
        const arr = this._children;
        const arrCount = arr.length;
        let currentX = 0;
        for (let i = 0; i < arrCount; i++) {
            const item = arr[i];
            const itemX = item._bounds2d.x;
            item.left(currentX);
            currentX += itemX;
        }
        // call the super-class tick
        super.tick(ctx, dontTransform);
    }
}
exports.IgeUiInlineFlow = IgeUiInlineFlow;
(0, exports_2.registerClass)(IgeUiInlineFlow);
