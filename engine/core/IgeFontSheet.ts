import { IgeTexture } from "./IgeTexture";
import { IgeSmartTexture } from "@/types/IgeSmartTexture";
import { ige } from "@/engine/instance";

/* TODO: URGENT - Make this alignment stuff work inside the bounds of the entity it is attached to
 *    so that bottom-right aligns to the lower-right point of the bounding box of the entity
 *    whilst maintaining the current text-alignment as well
* */

/**
 * Creates a new font sheet. A font sheet is an image that contains
 * letters and numbers rendered to specifications. It allows you to
 * use and render text fonts without the font actually existing on
 * the target system that the engine is running in.
 */
export class IgeFontSheet extends IgeTexture {
	classId = "IgeFontSheet";
	_sheetImage?: ImageBitmap | OffscreenCanvas;
	_lineHeightModifier: number = 0;
	_fontData: any;

	_charCodeMap: any;

	_charPosMap: any;

	_measuredWidthMap: any;

	_pixelWidthMap: any;

	constructor (id: string, urlOrObject?: string | IgeSmartTexture) {
		super(id, urlOrObject);

		// Set the _noDimensions flag which tells any entity
		// that assigns this texture that the texture has an
		// unknown width/height, so it should not get its
		// dimension data from the texture
		this._noDimensions = true;

		// Set a listener for when the texture loads
		this.on("loaded", () => {
			if (!this.image) {
				return;
			}

			this._sheetImage = this.image;
			this._fontData = this.decodeHeader();
			this._charCodeMap = this._fontData.characters.charCodes;
			this._charPosMap = this._fontData.characters.charPosition;
			this._measuredWidthMap = this._fontData.characters.measuredWidth;
			this._pixelWidthMap = this._fontData.characters.pixelWidth;

			if (this._fontData) {
				const header = this._fontData.font;
				this.log("Loaded font sheet for font: " + header.fontName + " @ " + header.fontSize + header.fontSizeUnit + " in " + header.fontColor);
			} else {
				this.log("Could not load data header for font sheet: " + this.image.src, "error");
			}
		});
	}

	decodeHeader () {
		// Create a temporary canvas
		const canvas = new OffscreenCanvas(2, 2),
			ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

		if (this.image === undefined) {
			throw new Error("Image not loaded")
		}

		// Set canvas width to match font sheet image and
		// height to 1 as we have 1 line of header data
		canvas.width = this.image.width;
		canvas.height = 1;

		// Draw the font sheet to the canvas
		ctx.drawImage(this.image, 0, 0);

		// Decode the font sheet pixel-encoded data
		return this._decode(canvas, 0, 0, this.image.width);
	}

	_decode (canvas: OffscreenCanvas, x: number, y: number, maxX: number): any {
		const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D,
			imageData = ctx.getImageData(x, y, maxX, canvas.height).data

		let run = true,
			quadCode,
			i = 0,
			jsonString = "";

		while (run) {
			quadCode = String(imageData[i]) + " " + String(imageData[i + 1]) + " " + String(imageData[i + 2]);
			if (quadCode === "3 2 1") {
				// We have scanned the terminal code
				// so exit the loop
				run = false;
				return JSON.parse(jsonString);
			} else {
				jsonString += String.fromCharCode(imageData[i]) + String.fromCharCode(imageData[i + 1]) + String.fromCharCode(imageData[i + 2]);
			}
			i += 4;

			if (i > imageData.length) {
				run = false;
				console.log("Image JSON Decode Error!");
			}
		}
	}

	lineHeightModifier (val?: number) {
		if (typeof (val) !== "undefined") {
			this._lineHeightModifier = val;
		}
	}

	/**
	 * Returns the width in pixels of the text passed in the
	 * argument.
	 * @param {string} text The text to measure.
	 * @returns {number}
	 */
	measureTextWidth (text) {
		if (this._loaded) {
			const charCodeMap = this._charCodeMap,
				measuredWidthMap = this._measuredWidthMap;

			let characterIndex,
				charIndex,
				lineArr: string[] = [],
				lineIndex,
				measuredWidth,
				maxWidth = 0;

			// Handle multi-line text
			if (text.indexOf("\n") > -1) {
				// Split each line into an array item
				lineArr = text.split("\n");
			} else {
				// Store the text as a single line
				lineArr.push(text);
			}

			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				// Calculate the total width of the line of text
				measuredWidth = 0;
				for (characterIndex = 0; characterIndex < lineArr[lineIndex].length; characterIndex++) {
					charIndex = charCodeMap[lineArr[lineIndex].charCodeAt(characterIndex)];
					measuredWidth += measuredWidthMap[charIndex] || 0;
				}

				if (measuredWidth > maxWidth) {
					maxWidth = measuredWidth;
				}
			}

			// Store the width of this line so we can align it correctly
			return measuredWidth;
		}

		return -1;
	}

	render (ctx, entity) {
		if (entity._renderText && this._loaded) {
			const _ctx = ctx,
				text = entity._renderText,
				charCodeMap = this._charCodeMap,
				charPosMap = this._charPosMap,
				measuredWidthMap = this._measuredWidthMap,
				pixelWidthMap = this._pixelWidthMap,
				masterX = 0,
				masterY = 0,
				lineWidth: number[] = [],
				lineHeight = (this._sizeY - 2)

			let lineText,
				lineArr: string[] = [],
				lineIndex,
				characterIndex,
				renderX = 0,
				renderY = 0,
				renderStartX = 0,
				renderStartY = 0,
				singleLineWidth = 0,
				totalWidth = 0,
				charIndex;

			// Handle multi-line text
			if (text.indexOf("\n") > -1) {
				// Split each line into an array item
				lineArr = text.split("\n");
			} else {
				// Store the text as a single line
				lineArr.push(text);
			}

			const totalHeight = (lineHeight * lineArr.length);

			// TODO: Y-based alignment doesn't work at the moment. Fix it!
			// Handle text alignment y
			switch (entity._textAlignY) {
				case 0: // Align top
					renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));//0;
					break;

				case 1: // Align middle
					renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));
					break;

				case 2: // Align bottom
					renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));//-((lineHeight) * (lineArr.length)) - (entity._textLineSpacing * (lineArr.length - 1));
					break;
			}

			// Calculate the total text width of each line
			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				lineText = lineArr[lineIndex];
				for (characterIndex = 0; characterIndex < lineText.length; characterIndex++) {
					charIndex = charCodeMap[lineText.charCodeAt(characterIndex)];
					singleLineWidth += measuredWidthMap[charIndex] || 0;
				}

				// Store the width of this line so we can align it correctly
				lineWidth[lineIndex] = singleLineWidth;

				if (singleLineWidth > totalWidth) {
					totalWidth = singleLineWidth;
				}

				singleLineWidth = 0;
			}

			// Handle text cached alignment x
			switch (entity._textAlignX) {
				case 0: // Align left
					renderStartX = -entity._bounds2d.x2;
					break;

				case 1: // Align center
					renderStartX = -totalWidth / 2;
					break;

				case 2: // Align right
					renderStartX = entity._bounds2d.x2 - totalWidth;
					break;
			}

			/*_ctx.strokeStyle = '#ff0000';
			_ctx.strokeRect(renderStartX, renderStartY, totalWidth, totalHeight);*/

			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				lineText = lineArr[lineIndex];
				renderY = (lineHeight * lineIndex) + (entity._textLineSpacing * (lineIndex));

				// Handle text alignment x
				switch (entity._textAlignX) {
					case 0: // Align left
						renderX = -entity._bounds2d.x2;
						break;

					case 1: // Align center
						renderX = -lineWidth[lineIndex] / 2;
						break;

					case 2: // Align right
						renderX = entity._bounds2d.x2 - lineWidth[lineIndex];
						break;
				}

				for (characterIndex = 0; characterIndex < lineText.length; characterIndex++) {
					charIndex = charCodeMap[lineText.charCodeAt(characterIndex)];

					_ctx.drawImage(
						this.image,
						charPosMap[charIndex], // texture x
						2, // texture y
						pixelWidthMap[charIndex], // texture width
						this._sizeY - 2, // texture height
						Math.floor(masterX + renderX), // render x TODO: Performance - Cache these?
						Math.floor(masterY + renderStartY + renderY), // render y
						pixelWidthMap[charIndex], // render width
						(this._sizeY - 2) // render height
					);

					// Check if we should overlay with a colour
					if (entity._colorOverlay) {
						_ctx.save();
						// Set the composite operation and draw the colour over the top
						_ctx.globalCompositeOperation = "source-atop";

						_ctx.fillStyle = entity._colorOverlay;
						_ctx.fillRect(
							Math.floor(masterX + renderX), // render x TODO: Performance - Cache these?
							Math.floor(masterY + renderStartY + renderY), // render y
							pixelWidthMap[charIndex], // render width
							(this._sizeY - 2) // render height
						);
						_ctx.restore();
					}

					renderX += measuredWidthMap[charIndex] || 0;

					ige.metrics.drawCount++;
				}

				renderX = 0;
			}
		}
	}

	destroy () {
		this.image = undefined;
		this.script = undefined;

		return this;
	}
}
