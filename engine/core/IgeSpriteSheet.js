// TODO: Write this class
var IgeSpriteSheet = IgeTexture.extend({
	classId: 'IgeSpriteSheet',
	IgeSpriteSheet: true,

	init: function (url, horizontalCells, verticalCells) {
		this._super(url);
		this._cellCountX = 0;
		this._cellCountY = 0;

		this.horizontalCells(horizontalCells);
		this.verticalCells(verticalCells);

		this._applyCells();
	},

	/** horizontalCells - Sets the number of horizontal cells in the sprite sheet. {
		category:"method",
		arguments: [{
			name:"val",
			type:"integer",
			desc:"The integer count of the number of horizontal cells in the sprite sheet.",
		}],
	} **/
	horizontalCells: function (val) {
		this._cellCountX = val;
	},

	/** verticalCells - Sets the number of vertical cells in the sprite sheet. {
		category:"method",
		arguments: [{
			name:"val",
			type:"integer",
			desc:"The integer count of the number of vertical cells in the sprite sheet.",
		}],
	} **/
	verticalCells: function (val) {
		this._cellCountY = val;
	},

	_applyCells: function () {
		var cell,
			imgWidth, imgHeight,
			rows, columns,
			cellWidth, cellHeight,
			cellIndex,
			xPos, yPos,
			sectionArr,
			sectionCount,
			sectionIndex,
			section,
			sectionBounds;

		// We always define a cells array and if no actual cell
		// operation is require we just store the cords 0, 0, width, height
		this._cells = [];

		// Do we have cell data?
		if (this._cell) {
			// Do we have an image to use?
			if (this.image) {
				if (this._cell.sections) {
					// Perform a cell by sectioning off bits of the
					// texture with arbitrary section dimensions

					/* A section array looks like this:
						sections = [{
							index: 1, // The cell index (base 1)
							aabb: [0, 0, 200, 100] // x, y, width, height
						}];
					*/
					sectionArr = this._cell.sections;
					sectionCount = sectionArr.length;

					for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
						section = sectionArr[sectionIndex];
						this._cells[section.index] = section.aabb;
					}
				}
			}
		} else {
			// No cell data so just store the whole image data
			this._cells[1] = [0, 0, this._sizeX, this._sizeY];
		}
	},

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTexture; }