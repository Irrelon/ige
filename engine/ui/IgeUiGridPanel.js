var IgeUiGridPanel = IgeUiEntity.extend({
	classId: 'IgeUiGridPanel',

	init: function (cellWidth, cellHeight) {
		this._super();

		this._gridCellWidth = cellWidth || 32;
		this._gridCellHeight = cellHeight || 32;
	},

	_childMounted: function (obj) {
		this._super(obj);

		var gridWidth = Math.floor(this.geometry.x / this._gridCellWidth),
			gridHeight = Math.floor(this.geometry.y / this._gridCellHeight),
			totalChildren = this._children.length - 1, positionX, positionY;

		// Position this child in the grid
		positionY = Math.floor(totalChildren / gridWidth);
		positionX = totalChildren - (gridWidth * positionY);

		obj.left(this._gridCellWidth * positionX)
			.top(this._gridCellHeight * positionY);
	}
});