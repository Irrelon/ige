"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiRow = void 0;
const IgeUiElement_1 = require("../core/IgeUiElement.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
class IgeUiRow extends IgeUiElement_1.IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiRow";
    }
    tick(ctx) {
        const maxWidth = this.width();
        // Loop children and re-position then
        const arr = this._children;
        const arrCount = arr.length;
        let flowSpace = maxWidth;
        let flowSpaceDivisions = 0;
        let currentPosition = 0;
        // Flex resolution algorithm
        // 1) Loop children
        // 2) Find children with fixed width and those with flex, hold those with flex in separate array
        // 3) Final overall width available is total - sum(fixed widths)
        // 4) Loop flex children and assign width based on available space and flex value
        for (let i = 0; i < arrCount; i++) {
            const item = arr[i];
            if (item._uiFlex !== undefined) {
                flowSpaceDivisions += item._uiFlex;
                continue;
            }
            // Remove this non-flex entity's size from available flow space
            flowSpace -= item.width() + item._marginLeft + item._marginRight;
        }
        // Single flow space division is...
        const singleFlowSpaceDivision = flowSpace / flowSpaceDivisions;
        // Loop children again and assign co-ordinate position
        for (let i = 0; i < arrCount; i++) {
            const item = arr[i];
            if (item._uiFlex !== undefined) {
                // Item is flex-based, assign it space based on flex value
                item.width(singleFlowSpaceDivision * item._uiFlex - (item._marginLeft + item._marginRight));
            }
            // Bounds (x, y) is (width, height) in local space
            const itemWidth = item._bounds2d.x;
            item.left(currentPosition + item._marginLeft);
            currentPosition += itemWidth + item._marginLeft + item._marginRight;
        }
        // Now do the super-class tick
        super.tick(ctx);
    }
}
exports.IgeUiRow = IgeUiRow;
(0, igeClassStore_1.registerClass)(IgeUiRow);
