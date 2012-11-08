/**
 * Creates a new sprite sheet that cuts an image up into
 * arbitrary sections.
 */
var IgeSpriteSheet = IgeTexture.extend({
	classId: 'IgeSpriteSheet',
	IgeSpriteSheet: true,

	init: function (url, cells) {
		var self = this;
		this.on('loaded', function () {
			if (self.image) {
				// Store the cell sheet image
				self._sheetImage = this.image;
				var i;

				// Cells in the sheets always start at index
				// 1 so move all the cells one forward
				for (i = 0; i < cells.length; i++) {
					self._cells[i + 1] = cells[i];
				}
			} else {
				// Unable to create cells from non-image texture
				// TODO: Low-priority - Support cell sheets from smart-textures
				self.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
			}
		});

		this._super(url);
	},

	/**
	 * Returns the total number of cells in the cell sheet.
	 * @return {Number}
	 */
	cellCount: function () {
		return this._cells.length;
	},

	/**
	 * Returns the cell index that the passed cell id corresponds
	 * to.
	 * @param {String} id
	 * @return {Number} The cell index that the cell id corresponds
	 * to or -1 if a corresponding index could not be found.
	 */
	cellIdToIndex: function (id) {
		var cells = this._cells,
			i;
		for (i = 1; i < cells.length; i++) {
			if (cells[i][4] === id) {
				// Found the cell id so return the index
				return i;
			}
		}

		return -1;
	},

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {String}
	 */
	stringify: function () {
		var str = "new " + this.classId() + "('" + this.url() + "', " + this._cells.toString() + ")";

		// Every object has an ID, assign that first
		str += ".id('" + this.id() + "');";

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSpriteSheet; }