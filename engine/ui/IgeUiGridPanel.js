var IgeUiGridPanel = IgeUiEntity.extend({
	classId: 'IgeUiGridPanel',

	init: function (cellWidth, cellHeight) {
		IgeUiEntity.prototype.init.call(this);

		this._gridCellWidth = cellWidth || 32;
		this._gridCellHeight = cellHeight || 32;
	},

	_childMounted: function (obj) {
		IgeUiEntity.prototype._childMounted.call(this, obj);

		var gridWidth = Math.floor(this._geometry.x / this._gridCellWidth),
			gridHeight = Math.floor(this._geometry.y / this._gridCellHeight),
			totalChildren = this._children.length - 1, positionX, positionY;

		// Position this child in the grid
		positionY = Math.floor(totalChildren / gridWidth);
		positionX = totalChildren - (gridWidth * positionY);

		obj.left(this._gridCellWidth * positionX)
			.top(this._gridCellHeight * positionY);
	}
});