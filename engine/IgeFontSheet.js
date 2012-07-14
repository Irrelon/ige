/* TODO: URGENT - Make this alignment stuff work inside the bounds of the entity it is attached to
 * so that bottom-right aligns to the lower-right point of the bounding box of the entity
 * whilst maintaining the current text-alignment as well
* */
var IgeFontSheet = IgeTexture.extend({
	classId: 'IgeFontSheet',

	init: function (url, cacheCount) {
		this._super(url);

		if (typeof(cacheCount) === 'undefined') {
			// Default to storing one cached text image
			cacheCount = 1;
		}

		if (cacheCount) {
			// Setup an array that will hold cached data
			this._cacheCount = cacheCount;
			this._cacheIndex = -1;
			this._cacheText = {};
			this._cacheIndexes = [];
			this._cacheCanvas = [];

			this._caching = true;
		}

		// Set the _noDimensions flag which tells any entity
		// that assigns this texture that the texture has an
		// unknown width/height so it should not get it's
		// dimension data from the texture
		this._noDimensions = true;

		// Set a listener for when the texture loads
		this.on('loaded', function () {
			if (this.image) {
				// Store the cell sheet image
				this._sheetImage = this.image;

				// Get the font sheet data header
				this._fontData = this.decodeHeader();

				// Cache access to looped data
				this._charCodeMap = this._fontData.characters.charCodes;
				this._charPosMap = this._fontData.characters.charPosition;
				this._measuredWidthMap = this._fontData.characters.measuredWidth;
				this._pixelWidthMap = this._fontData.characters.pixelWidth;

				if (this._fontData) {
					var header = this._fontData.font;
					this.log('Loaded font sheet for font: ' + header.fontName + ' @ ' + header.fontSize + header.fontSizeUnit + ' in ' + header.fontColor);
				} else {
					this.log('Could not load data header for font sheet: ' + this.image.src, 'error');
				}
			}
		});
	},

	decodeHeader: function () {
		// Create a temporary canvas
		var canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');

		// Set canvas width to match font sheet image and
		// height to 1 as we have 1 line of header data
		canvas.width = this.image.width;
		canvas.height = 1;

		// Draw the font sheet to the canvas
		ctx.drawImage(this.image, 0, 0);

		// Decode the font sheet pixel-encoded data
		return this._decode(canvas, 0, 0, this.image.width);
	},

	_decode: function (canvas, x, y, maxX) {
		"use strict";
		var ctx = canvas.getContext('2d'),
			imageData = ctx.getImageData(x, y, maxX, canvas.height).data,
			run = true,
			quadCode,
			i = 0,
			jsonString = '';

		while (run) {
			quadCode = String(imageData[i]) + ' ' + String(imageData[i + 1]) + ' ' + String(imageData[i + 2]);
			if (quadCode === '3 2 1') {
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
				console.log('Image JSON Decode Error!');
			}
		}
	},

	lineHeightModifier: function (val) {
		if (typeof(val) !== 'undefined') {
			this._lineHeightModifier = val;
		}
	},

	render: function (ctx, entity, tickDelta) {
		if (entity._text) {
			var _ctx = ctx,
				cacheIndex,
				text = entity._text,
				lineText,
				lineArr = [],
				lineIndex,
				characterIndex,
				charCodeMap = this._charCodeMap,
				charPosMap = this._charPosMap,
				measuredWidthMap = this._measuredWidthMap,
				pixelWidthMap = this._pixelWidthMap,
				renderX = 0,
				renderY = 0,
				renderStartX = 0,
				renderStartY = 0,
				masterX = 0,
				masterY = 0,
				lineWidth = [],
				lineHeight = (this._sizeY - 2),
				singleLineWidth = 0,
				totalWidth = 0,
				totalHeight,
				charIndex;

			// Handle multi-line text
			if (text.indexOf('\n') > -1) {
				// Split each line into an array item
				lineArr = text.split('\n');
			} else {
				// Store the text as a single line
				lineArr.push(text);
			}

			totalHeight = (lineHeight * lineArr.length);

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
					renderStartX = -totalWidth / 2;//0;
				break;

				case 1: // Align center
					renderStartX = -totalWidth / 2;
				break;

				case 2: // Align right
					renderStartX = -totalWidth / 2;//-totalWidth;
				break;
			}

			// If we have caching enabled, check for the text
			// in cache. If we don't have it, render it
			if (this._caching) {
				// Check for an existing cache of this text
				cacheIndex = this._cacheText[text];
				if (typeof(cacheIndex) !== 'undefined') {
					// We have a cache of this text so just draw it
					// and return
					_ctx.drawImage(
						this._cacheCanvas[cacheIndex],
						0, // texture x
						0, // texture y
						this._cacheCanvas[cacheIndex].width, // texture width
						this._cacheCanvas[cacheIndex].height, // texture height
						renderStartX, // render x TODO: Performance - Cache these?
						renderStartY, // render y
						this._cacheCanvas[cacheIndex].width, // render width
						this._cacheCanvas[cacheIndex].height // render height
					);

					ige._drawCount++;

					return;
				} else {
					// We don't have this text cached so advance
					// the cache index and store this text in the cache
					this._cacheIndex++;

					if (this._cacheIndex >= this._cacheCount) {
						this._cacheIndex = 0;
					}

					// Check if some other text was occupying this index first
					if (this._cacheIndexes[this._cacheIndex]) {
						// Remove old entry
						delete this._cacheText[this._cacheIndexes[this._cacheIndex]];
					}

					// Log which cache index we are using for this text
					this._cacheText[text] = this._cacheIndex;
					this._cacheIndexes[this._cacheIndex] = text;

					// Create a new canvas for this cached text
					this._cacheCanvas[this._cacheIndex] = document.createElement('canvas');
					this._cacheCanvas[this._cacheIndex].width = totalWidth;
					this._cacheCanvas[this._cacheIndex].height = totalHeight;

					_ctx = this._cacheCanvas[this._cacheIndex].getContext('2d');
					_ctx.translate(totalWidth / 2, totalHeight / 2);

					// Handle text alignment x
					switch (entity._textAlignX) {
						case 0: // Align left
							//masterX = -totalWidth / 2;
						break;

						case 1: // Align center
							//masterX = totalWidth / 2;
						break;

						case 2: // Align right
							//masterX = totalWidth / 2;
						break;
					}

					// Handle text alignment y
					switch (entity._textAlignY) {
						case 0: // Align top
							masterY = (entity._textLineSpacing * ((lineArr.length - 1) / 2));//-totalHeight / 2;
						break;

						case 1: // Align middle
							masterY = (entity._textLineSpacing * ((lineArr.length - 1) / 2));
						break;

						case 2: // Align bottom
							masterY = (entity._textLineSpacing * ((lineArr.length - 1) / 2));//totalHeight / 2 + (entity._textLineSpacing * (lineArr.length - 1));
						break;
					}
				}
			}

			//_ctx.strokeStyle = '#ff0000';
			//_ctx.strokeRect(masterX + -(totalWidth / 2), masterY + renderStartY, totalWidth, totalHeight);

			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				lineText = lineArr[lineIndex];
				renderY = (lineHeight * lineIndex) + (entity._textLineSpacing * (lineIndex));

				// Handle text alignment x
				switch (entity._textAlignX) {
					case 0: // Align left
						renderX = -totalWidth / 2;//0;
					break;

					case 1: // Align center
						renderX = -lineWidth[lineIndex] / 2;
					break;

					case 2: // Align right
						renderX = totalWidth / 2-lineWidth[lineIndex];
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
						masterX + renderX, // render x TODO: Performance - Cache these?
						masterY + renderStartY + renderY, // render y
						pixelWidthMap[charIndex], // render width
						(this._sizeY - 2) // render height
					);

					renderX += measuredWidthMap[charIndex] || 0;

					ige._drawCount++;
				}

				renderX = 0;
			}

			// If the entity should get dimension data from the
			// texture, we are now in a position to give it so
			// set the width and height based on the rendered text
			if (entity._dimensionsFromTexture) {
				entity.sizeX(totalWidth);
				entity.sizeY(totalHeight);

				entity._dimensionsFromTexture = true;

				// Recalculate entity aabb
				// TODO: High-priority - Bounds do not work when the text alignment is non-center. Don't we need to set the entity origin? If we do that, the bounds are correct but the font is rendered too far like - double the distance. Uncomment the line below to see the effect. Adjusting the final font position should do it.
				if (entity._textAlignX === 0) {
					entity._transform[9] = 0;
				}

				if (entity._textAlignX === 1) {
					entity._transform[9] = 0.5;
				}

				if (entity._textAlignX === 2) {
					entity._transform[9] = 1;
				}

				if (entity._textAlignY === 0) {
					entity._transform[10] = 0;
				}

				if (entity._textAlignY === 1) {
					entity._transform[10] = 0.5;
				}

				if (entity._textAlignY === 2) {
					entity._transform[10] = 1;
				}

				entity.aabb(true);
			}
		}
	},

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFontSheet; }