/**
 * Creates a new cell sheet. Cell sheets are textures that are
 * automatically split up into individual cells based on a cell
 * width and height.
 */
var IgeCellSheet = IgeTexture.extend({
	classId: 'IgeCellSheet',
	IgeSpriteSheet: true,

	init: function (url, horizontalCells, verticalCells) {
		var self = this;

		self.horizontalCells(horizontalCells || 1);
		self.verticalCells(verticalCells || 1);

		IgeTexture.prototype.init.call(this, url);
	},
	
	_textureLoaded: function () {
		if (this.image) {
			// Store the cell sheet image
			this._sheetImage = this.image;
			this._applyCells();
		} else {
			// Unable to create cells from non-image texture
			// TODO: Low-priority - Support cell sheets from smart-textures
			this.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
		}
		
		IgeTexture.prototype._textureLoaded.call(this);
	},

	/**
	 * Returns the total number of cells in the cell sheet.
	 * @return {Number}
	 */
	cellCount: function () {
		return this.horizontalCells() * this.verticalCells();
	},

	/**
	 * Gets / sets the number of horizontal cells in the cell sheet.
	 * @param {Number=} val The integer count of the number of horizontal cells in the cell sheet.
	 */
	horizontalCells: function (val) {
		if (val !== undefined) {
			this._cellColumns = val;
			return this;
		}

		return this._cellColumns;
	},

	/**
	 * Gets / sets the number of vertical cells in the cell sheet.
	 * @param {Number=} val The integer count of the number of vertical cells in the cell sheet.
	 */
	verticalCells: function (val) {
		if (val !== undefined) {
			this._cellRows = val;
			return this;
		}

		return this._cellRows;
	},

	/**
	 * Sets the x, y, width and height of each sheet cell and stores
	 * that information in the this._cells array.
	 * @private
	 */
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
					this.log('Cell width is a floating-point number! (Image Width ' + imgWidth + ' / Number of Columns ' + columns + ' = ' + cellWidth + ') in file: ' + this._url, 'warning');
				}

				if (cellHeight !== parseInt(cellHeight, 10)) {
					this.log('Cell height is a floating-point number! (Image Height ' + imgHeight + ' / Number of Rows ' + rows + ' = ' + cellHeight + ')  in file: ' + this._url, 'warning');
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

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this.url() + "', " + this.horizontalCells() + ", " + this.verticalCells() + ")";

		// Every object has an ID, assign that first
		// IDs are automatically generated from texture urls
		//str += ".id('" + this.id() + "');";

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }