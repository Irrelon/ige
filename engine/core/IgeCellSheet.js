var IgeCellSheet = IgeTexture.extend({
	classId: 'IgeCellSheet',
	IgeSpriteSheet: true,

	init: function (url, horizontalCells, verticalCells) {
		this._super(url);
		this.on('loaded', function () {
			if (this.image) {
				// Store the cell sheet image
				this._sheetImage = this.image;

				this._cellColumns = 0;
				this._cellRows = 0;

				this.horizontalCells(horizontalCells);
				this.verticalCells(verticalCells);

				this._applyCells();
			} else {
				// Unable to create cells from non-image texture
				// TODO: Medium-priority - Support cell sheets from smart-textures
				this.log('Cannot create cell-sheet because texture has not loaded an image!', 'warning');
			}
		});
	},

	/** horizontalCells - Sets the number of horizontal cells in the cell sheet. {
		category:"method",
		arguments: [{
			name:"val",
			type:"integer",
			desc:"The integer count of the number of horizontal cells in the cell sheet.",
		}],
	} **/
	horizontalCells: function (val) {
		this._cellColumns = val;
	},

	/** verticalCells - Sets the number of vertical cells in the cell sheet. {
		category:"method",
		arguments: [{
			name:"val",
			type:"integer",
			desc:"The integer count of the number of vertical cells in the cell sheet.",
		}],
	} **/
	verticalCells: function (val) {
		this._cellRows = val;
	},

	/** _applyCells - Sets the x, y, width and height of each sheet cell and stores
	that information in the this._cells array. {
		category:"method",
	} **/
	_applyCells: function () {
		var imgWidth, imgHeight,
			rows, columns,
			cellWidth, cellHeight,
			cellIndex,
			xPos, yPos;

		// Do we have an image to use?
		if (this.image) {
			// Check we have the correct data for a uniform cell layout
			if (this._cellRows && this._cellColumns) {
				imgWidth = this._sizeX;
				imgHeight = this._sizeY;
				rows = this._cellRows;
				columns = this._cellColumns;

				// Store the width and height of a single cell
				cellWidth = this._cellWidth = imgWidth / columns;
				cellHeight = this._cellHeight = imgHeight / rows;

				// Check if the cell width and height are non-floating-point
				if (cellWidth !== parseInt(cellWidth, 10)) {
					this.log('Cell width is a floating-point number! (Image Width ' + imgWidth + ' / Number of Columns ' + columns + ' = ' + cellWidth + ')', 'warning');
				}

				if (cellHeight !== parseInt(cellHeight, 10)) {
					this.log('Cell height is a floating-point number! (Image Height ' + imgHeight + ' / Number of Rows ' + rows + ' = ' + cellHeight, 'warning');
				}

				// Check if we need to calculate individual cell data
				if (rows > 1 || columns > 1) {
					for (cellIndex = 1; cellIndex <= (rows * columns); cellIndex++) {
						yPos = (Math.ceil(cellIndex / columns) - 1);
						xPos = ((cellIndex - (columns * yPos)) - 1);

						// Store the xy in the sheet frames variable
						this._cells[cellIndex] = [(xPos * cellWidth), (yPos * cellHeight), cellWidth, cellHeight];
					}
				} else {
					// The cell data shows only one cell so just store the whole image data
					this._cells[1] = [0, 0, this._sizeX, this._sizeY];
				}
			}
		}
	},

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }