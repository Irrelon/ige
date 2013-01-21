/* TODO: URGENT - Make this alignment stuff work inside the bounds of the entity it is attached to
 * so that bottom-right aligns to the lower-right point of the bounding box of the entity
 * whilst maintaining the current text-alignment as well
* */

/**
 * Creates a new font sheet. A font sheet is an image that contains
 * letters and numbers rendered to specifications. It allows you to
 * use and render text fonts without the font actually existing on
 * the target system that the engine is running in.
 */
var IgeFontSheet = IgeTexture.extend({
	classId: 'IgeFontSheet',

	init: function (url) {
		IgeTexture.prototype.init.call(this, url);

		if (arguments[1]) {
			this.log('Font sheets no longer accept a caching limit value. All font output is now cached by default via the actual font entity - fontEntity.cache(true);', 'warning');
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

	render: function (ctx, entity) {
		if (entity._text && this._loaded) {
			var _ctx = ctx,
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
					renderStartX = -entity._geometry.x2;
					break;

				case 1: // Align center
					renderStartX = -totalWidth / 2;
					break;

				case 2: // Align right
					renderStartX = entity._geometry.x2 -totalWidth;
					break;
			}

			/*_ctx.strokeStyle = '#ff0000';
			_ctx.strokeRect(masterX + (-totalWidth / 2), masterY + renderStartY, totalWidth, totalHeight);*/

			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				lineText = lineArr[lineIndex];
				renderY = (lineHeight * lineIndex) + (entity._textLineSpacing * (lineIndex));

				// Handle text alignment x
				switch (entity._textAlignX) {
					case 0: // Align left
						renderX = -entity._geometry.x2;
					break;

					case 1: // Align center
						renderX = -lineWidth[lineIndex] / 2;
					break;

					case 2: // Align right
						renderX = entity._geometry.x2 -lineWidth[lineIndex];
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
						_ctx.globalCompositeOperation = 'source-atop';

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

					ige._drawCount++;
				}

				renderX = 0;
			}

			// If the entity should get dimension data from the
			// texture, we are now in a position to give it so
			// set the width and height based on the rendered text
			// TODO: This is a throw-back from 1.0.0, is it still valid?
			/*if (entity._dimensionsFromTexture) {
				entity.sizeX(totalWidth);
				entity.sizeY(totalHeight);

				entity._dimensionsFromTexture = true;
				entity.aabb(true);
			}*/
		}
	},

	destroy: function () {
		this.image = null;
		this.script = null;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFontSheet; }