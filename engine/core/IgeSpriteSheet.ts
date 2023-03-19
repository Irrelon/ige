import { IgeTexture } from "./IgeTexture";
import { IgeSmartTexture } from "@/types/IgeSmartTexture";
import { IgeImage } from "./IgeImage";
import { IgeCanvas } from "./IgeCanvas";

type IgeTextureCell = [number, number, number, number, string?];
type IgeTextureCellArray = IgeTextureCell[];

/**
 * Creates a new sprite sheet that cuts an image up into
 * arbitrary sections.
 */
export class IgeSpriteSheet extends IgeTexture {
	classId = "IgeSpriteSheet";
	IgeSpriteSheet = true;
	_cells: IgeTextureCellArray = [];
	_spriteCells: IgeTextureCellArray = [];
	_sheetImage?: IgeImage | IgeCanvas;
	_checkModulus?: boolean = false;

	constructor (id?: string, urlOrObject?: string | IgeSmartTexture, cells?: IgeTextureCellArray) {
		super(id, urlOrObject);

		if (cells) {
			this._spriteCells = cells;
		}
	}

	_textureLoaded () {
		if (!this.image) {
			// Unable to create cells from non-image texture
			// TODO: Low-priority - Support cell sheets from smart-textures
			this.log("Cannot create cell-sheet because texture has not loaded an image!", "error");
		} else {
			super._textureLoaded();

			// Store the cell sheet image
			this._sheetImage = this.image;
			let cells = this._spriteCells;

			if (!cells) {
				// Try to automatically determine cells
				this.log("No cell data provided for sprite sheet, attempting to automatically detect sprite bounds...");
				cells = this.detectCells(this._sheetImage);
			}

			// Cells in the sheets always start at index
			// 1 so move all the cells one forward
			for (let i = 0; i < cells.length; i++) {
				this._cells[i + 1] = cells[i];

				if (this._checkModulus) {
					// Check cell for division by 2 modulus warnings
					if (cells[i][2] % 2) {
						this.log("This texture's cell definition defines a cell width is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: " + this._url, "warning", cells[i]);
					}

					if (cells[i][3] % 2) {
						this.log("This texture's cell definition defines a cell height is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: " + this._url, "warning", cells[i]);
					}
				}
			}
		}
	}

	/**
     * Checks if a pixel is completely transparent.
     * @param {ImageData} imageData The image data to check.
     * @param {Number} x X co-ordinate to check.
     * @param {Number} y Y co-ordinate to check.
     * @returns {boolean} True if transparent, false if not.
     */
	isPixelTransparent (imageData: ImageData, x: number, y: number) {
		const pixelStart = (y * imageData.width * 4) + (x * 4);
		return imageData.data[pixelStart + 3] === 0;
	}

	/**
     * Makes a pixel transparent at a particular co-ordinate.
     * @param {ImageData} imageData The image data to modify.
     * @param {Number} x X co-ordinate to modify.
     * @param {Number} y Y co-ordinate to modify.
     * @returns {undefined} Nothing
     */
	makePixelTransparent (imageData: ImageData, x: number, y: number) {
		const pixelStart = (y * imageData.width * 4) + (x * 4);
		imageData.data[pixelStart + 3] = 0;
	}

	/**
     * Reads the pixel value at the passed co-ordinates.
     * @param {ImageData} imageData The image data to read.
     * @param {Number} x X co-ordinate to read from.
     * @param {Number} y Y co-ordinate to read from.
     * @returns {{a: *, r: *, b: *, g: *}} Object with the argb
     * values of the pixel.
     */
	getPixelAt (imageData: ImageData, x: number, y: number) {
		const pixelStart = (y * imageData.width * 4) + (x * 4);

		return {
			"r": imageData.data[pixelStart],
			"g": imageData.data[pixelStart + 1],
			"b": imageData.data[pixelStart + 2],
			"a": imageData.data[pixelStart + 3]
		};
	}

	/**
     * Uses the sprite sheet image pixel data to detect distinct sprite
     * bounds.
     * @param {Image} img The image to detect cells in.
     * @return {Array} An array of cell bounds.
     */
	detectCells (img: IgeImage | IgeCanvas): IgeTextureCellArray {
		// Create a temp canvas
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const spriteRects = [];

		if (!ctx) {
			throw new Error("Couldn't get texture canvas 2d context!");
		}

		canvas.width = img.width;
		canvas.height = img.height;

		// Draw the sheet to the canvas
		ctx.drawImage(img, 0, 0);

		// Read the pixel data
		const pixels: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// Loop the pixels and find non-transparent one
		for (let y = 0; y < canvas.height; y++) {
			for (let x = 0; x < canvas.width; x++) {
				// Check if the pixel is not transparent
				if (!this.isPixelTransparent(pixels, x, y)) {
					// We found a non-transparent pixel so
					// is it in a rect we have already defined?
					if (!this._pixelInRects(spriteRects, x, y)) {
						// The pixel is not already in a rect,
						// so determine the bounding rect for
						// the new sprite whose pixel we've found
						const newRect = this._determineRect(pixels, x, y);

						if (newRect) {
							spriteRects.push(newRect);
						} else {
							this.log("Cannot automatically determine sprite bounds!", "warning");
							return [];
						}
					}
				}
			}
		}

		return spriteRects;
	}

	_pixelInRects (rects: IgeTextureCellArray, x: number, y: number) {
		const rectCount = rects.length;

		let rectIndex;
		let rect;

		for (rectIndex = 0; rectIndex < rectCount; rectIndex++) {
			rect = rects[rectIndex];

			// Check if the x, y is inside this rect
			if (x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3]) {
				// The x, y is inside this rect
				return true;
			}
		}

		return false;
	}

	_determineRect (pixels: ImageData, x: number, y: number): IgeTextureCell {
		const pixArr = [{ x, y }];
		const rect = { x, y, width: 1, height: 1 };

		while (pixArr.length) {
			// De-queue front item
			const currentPixel = pixArr.shift();

			if (!currentPixel) continue;

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
			if (!this.isPixelTransparent(pixels, currentPixel.x - 1, currentPixel.y - 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x - 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x - 1, "y": currentPixel.y - 1 });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x, currentPixel.y - 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x, "y": currentPixel.y - 1 });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x + 1, currentPixel.y - 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x + 1, currentPixel.y - 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x + 1, "y": currentPixel.y - 1 });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x - 1, currentPixel.y)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x - 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x - 1, "y": currentPixel.y });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x + 1, currentPixel.y)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x + 1, currentPixel.y);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x + 1, "y": currentPixel.y });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x - 1, currentPixel.y + 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x - 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x - 1, "y": currentPixel.y + 1 });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x, currentPixel.y + 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x, "y": currentPixel.y + 1 });
			}

			if (!this.isPixelTransparent(pixels, currentPixel.x + 1, currentPixel.y + 1)) {
				// Mark pixel so we don't use it again
				this.makePixelTransparent(pixels, currentPixel.x + 1, currentPixel.y + 1);

				// Add pixel position to queue
				pixArr.push({ "x": currentPixel.x + 1, "y": currentPixel.y + 1 });
			}
		}

		return [rect.x, rect.y, rect.width, rect.height];
	}

	/**
     * Returns the total number of cells in the cell sheet.
     * @return {Number}
     */
	cellCount () {
		return this._cells.length;
	}

	/**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {String}
     */
	stringify () {
		const str = "new " + this.classId + "('" + this.url() + "', " + this._cells.toString() + ")";

		// Every object has an ID, assign that first
		// IDs are automatically generated from texture urls
		//str += ".id('" + this.id() + "');";

		return str;
	}
}
