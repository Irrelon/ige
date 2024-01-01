"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeUiGridPanel = void 0;
const IgeUiElement_1 = require("@/engine/core/IgeUiElement");
const igeClassStore_1 = require("@/engine/igeClassStore");
class IgeUiGridPanel extends IgeUiElement_1.IgeUiElement {
    constructor(cellWidth, cellHeight) {
        super();
        this.classId = "IgeUiGridPanel";
        this._gridCellWidth = cellWidth || 32;
        this._gridCellHeight = cellHeight || 32;
    }
    _childMounted(obj) {
        super._childMounted(obj);
        let gridWidth = Math.floor(this._bounds2d.x / this._gridCellWidth), gridHeight = Math.floor(this._bounds2d.y / this._gridCellHeight), totalChildren = this._children.length - 1, positionX, positionY;
        // Position this child in the grid
        positionY = Math.floor(totalChildren / gridWidth);
        positionX = totalChildren - (gridWidth * positionY);
        obj.left(this._gridCellWidth * positionX)
            .top(this._gridCellHeight * positionY);
    }
}
exports.IgeUiGridPanel = IgeUiGridPanel;
(0, igeClassStore_1.registerClass)(IgeUiGridPanel);
