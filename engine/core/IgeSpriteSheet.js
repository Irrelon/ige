/**
 * Creates a new sprite sheet that cuts an image up into
 * arbitrary sections.
 */
var IgeSpriteSheet = IgeTexture.extend({
	classId: 'IgeSpriteSheet',
	IgeSpriteSheet: true,

	init: function (url, cells) {
		this._spriteCells = cells;

		IgeTexture.prototype.init.call(this, url);
	},
	
	_textureLoaded: function () {
		if (this.image) {
			// Store the cell sheet image
			this._sheetImage = this.image;
			var i, cells = this._spriteCells;

			if (!cells) {
				// Try to automatically determine cells
				this.log('No cell data provided for sprite sheet, attempting to automatically detect sprite bounds...');
				cells = this.detectCells(this._sheetImage);
			}

			// Cells in the sheets always start at index
			// 1 so move all the cells one forward
			for (i = 0; i < cells.length; i++) {
				this._cells[i + 1] = cells[i];

				if (this._checkModulus) {
					// Check cell for division by 2 modulus warnings
					if (cells[i][2] % 2) {
						this.log('This texture\'s cell definition defines a cell width is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
					}

					if (cells[i][3] % 2) {
						this.log('This texture\'s cell definition defines a cell height is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
					}
				}
			}
		} else {
			// Unable to create cells from non-image texture
			// TODO: Low-priority - Support cell sheets from smart-textures
			this.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
		}
		
		IgeTexture.prototype._textureLoaded.call(this);
	},

	/**
	 * Uses the sprite sheet image pixel data to detect distinct sprite
	 * bounds.
	 * @param img
	 * @return {Array} An array of cell bounds.
	 */
	detectCells: function (img) {
		// Create a temp canvas
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d'),
			pixels,
			x, y,
			newRect,
			spriteRects = [];

		canvas.width = img.width;
		canvas.height = img.height;

		// Draw the sheet to the canvas
		ctx.drawImage(img, 0, 0);

		// Read the pixel data
		pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Loop the pixels and find non-transparent one
		for (y = 0; y < canvas.height; y++) {
			for (x = 0; x < canvas.width; x++) {
				// Check if the pixel is not transparent
				if (!pixels.isTransparent(x, y)) {
					// We found a non-transparent pixel so
					// is it in a rect we have already defined?
					if (!this._pixelInRects(spriteRects, x, y)) {
						// The pixel is not already in a rect,
						// so determine the bounding rect for
						// the new sprite whose pixel we've found
						newRect = this._determineRect(pixels, x, y);

						if (newRect) {
							spriteRects.push(newRect);
						} else {
							this.log('Cannot automatically determine sprite bounds!', 'warning');
							return [];
						}
					}
				}
			}
		}

		return spriteRects;
	},

	_pixelInRects: function (rects, x, y) {
		var rectIndex,
			rectCount = rects.length,
			rect;

		for (rectIndex = 0; rectIndex < rectCount; rectIndex++) {
			rect = rects[rectIndex];

			// Check if the x, y is inside this rect
			if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
				// The x, y is inside this rect
				return true;
			}
		}

		return false;
	},

	_determineRect: function (pixels, x, y) {
		var pixArr = [{x: x, y: y}],
			rect = {x: x, y: y, width: 1, height: 1},
			currentPixel;

		while (pixArr.length) {
			// De-queue front item
			currentPixel = pixArr.shift();

			// Expand rect to include pixel position
			if (currentPixel.x > rect.x + rect.width) {
				rect.width = currentPixel.x - rect.x + 1;
			}

			if (currentPixel.y > rect.y + rect.height) {
				rect.height = currentPixel.y - rect.y + 1;
			}

			if (currentPixel.x < rect.x) {
				rect.width += rect.x - currentPixel.x;
				rect.x = currentPixel.x;
			}

			if (currentPixel.y < rect.y) {
				rect.height += rect.y - currentPixel.y;
				rect.y = currentPixel.y;
			}

			// Check surrounding pixels
			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y - 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y - 1})
			}

			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y})
			}

			if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x - 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x - 1, y: currentPixel.y + 1})
			}

			if (!pixels.isTransparent(currentPixel.x, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x, y: currentPixel.y + 1})
			}

			if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y + 1)) {
				// Mark pixel so we dont use it again
				pixels.makeTransparent(currentPixel.x + 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({x: currentPixel.x + 1, y: currentPixel.y + 1})
			}
		}

		return [rect.x, rect.y, rect.width, rect.height];
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
		// IDs are automatically generated from texture urls
		//str += ".id('" + this.id() + "');";

		return str;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSpriteSheet; }