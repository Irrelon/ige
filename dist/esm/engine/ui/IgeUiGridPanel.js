import { IgeUiElement } from "../core/IgeUiElement.js";
import { registerClass } from "../igeClassStore.js";

export class IgeUiGridPanel extends IgeUiElement {
	classId = "IgeUiGridPanel";
	constructor(cellWidth, cellHeight) {
		super();
		this._gridCellWidth = cellWidth || 32;
		this._gridCellHeight = cellHeight || 32;
	}
	_childMounted(obj) {
		super._childMounted(obj);
		let gridWidth = Math.floor(this._bounds2d.x / this._gridCellWidth),
			gridHeight = Math.floor(this._bounds2d.y / this._gridCellHeight),
			totalChildren = this._children.length - 1,
			positionX,
			positionY;
		// Position this child in the grid
		positionY = Math.floor(totalChildren / gridWidth);
		positionX = totalChildren - gridWidth * positionY;
		obj.left(this._gridCellWidth * positionX).top(this._gridCellHeight * positionY);
	}
}
registerClass(IgeUiGridPanel);
