import IgeUiElement from "../core/IgeUiElement.js";
class IgeUiGridPanel extends IgeUiElement {
    constructor() {
        super(...arguments);
        this.classId = "IgeUiGridPanel";
        this.init = (cellWidth, cellHeight) => {
            IgeUiElement.prototype.init.call(this);
            this._gridCellWidth = cellWidth || 32;
            this._gridCellHeight = cellHeight || 32;
        };
        this._childMounted = (obj) => {
            super._childMounted(obj);
            var gridWidth = Math.floor(this._bounds2d.x / this._gridCellWidth), gridHeight = Math.floor(this._bounds2d.y / this._gridCellHeight), totalChildren = this._children.length - 1, positionX, positionY;
            // Position this child in the grid
            positionY = Math.floor(totalChildren / gridWidth);
            positionX = totalChildren - (gridWidth * positionY);
            obj.left(this._gridCellWidth * positionX)
                .top(this._gridCellHeight * positionY);
        };
    }
}
export default IgeUiGridPanel;
