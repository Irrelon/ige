/**
 * Provides native canvas font rendering supporting multi-line
 * text and alignment options.
 */
var IgeFontSmartTexture = {
	measureTextWidth: function (text, entity) {
		if (entity._nativeFont) {
			var lineArr = [],
				lineIndex,
				measuredWidth,
				maxWidth = 0,
				canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d');
			
			// Handle multi-line text
			if (text.indexOf('\n') > -1) {
				// Split each line into an array item
				lineArr = text.split('\n');
			} else {
				// Store the text as a single line
				lineArr.push(text);
			}

			ctx.font = entity._nativeFont;
			ctx.textBaseline = 'middle';

			if (entity._nativeStroke) {
				ctx.lineWidth = entity._nativeStroke;

				if (entity._nativeStrokeColor) {
					ctx.strokeStyle = entity._nativeStrokeColor;
				} else {
					ctx.strokeStyle = entity._colorOverlay;
				}
			}
			
			for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
				// Measure text
				measuredWidth = ctx.measureText(lineArr[lineIndex]).width;
				
				if (measuredWidth > maxWidth) {
					maxWidth = measuredWidth;
				}
			}
			
			return maxWidth;
		}
		
		return -1;
	},
	
	render: function (ctx, entity) {
		if (entity._nativeFont && entity._renderText) {
			var text = entity._renderText,
				lineArr = [],
				textSize,
				renderStartY,
				renderY,
				lineHeight,
				i;

			ctx.font = entity._nativeFont;

			if (entity._colorOverlay) {
				ctx.fillStyle = entity._colorOverlay;
			}

			// Text alignment
			if (entity._textAlignX === 0) {
				ctx.textAlign = 'left';
				ctx.translate(-entity._bounds2d.x2, 0);
			}

			if (entity._textAlignX === 1) {
				ctx.textAlign = 'center';
				//ctx.translate(-entity._bounds2d.x2, 0);
			}

			if (entity._textAlignX === 2) {
				ctx.textAlign = 'right';
				ctx.translate(entity._bounds2d.x2, 0);
			}

			if (entity._nativeStroke) {
				ctx.lineWidth = entity._nativeStroke;

				if (entity._nativeStrokeColor) {
					ctx.strokeStyle = entity._nativeStrokeColor;
				} else {
					ctx.strokeStyle = entity._colorOverlay;
				}
			}

			// Handle multi-line text
			if (text.indexOf('\n') > -1) {
				// Split each line into an array item
				lineArr = text.split('\n');
			} else {
				// Store the text as a single line
				lineArr.push(text);
			}

			// vertical text alignment
			if (entity._textAlignY === 0) {
				ctx.textBaseline = 'top';
				renderStartY = -(entity._bounds2d.y / 2);
			}
			if (entity._textAlignY === 1) {
				ctx.textBaseline = 'middle';
				renderStartY = -(entity._textLineSpacing / 2) * (lineArr.length - 1);
			}
			if (entity._textAlignY === 2) {
				ctx.textBaseline = 'bottom';
				renderStartY = entity._bounds2d.y / 2 - entity._textLineSpacing * (lineArr.length - 1);
			}
			// Justified - lines spaced out evenly according to height
			if (entity._textAlignY === 3) {
				ctx.textBaseline = 'middle';
				lineHeight = Math.floor(entity._bounds2d.y / lineArr.length);
				renderStartY = -((lineHeight + (entity._textLineSpacing)) / 2) * (lineArr.length - 1);
			}

			for (i = 0; i < lineArr.length; i++) {
				if (entity._textAlignY === 3) {
					renderY = renderStartY + (lineHeight * i) + (entity._textLineSpacing * (i));
				} else {
					renderY = renderStartY + entity._textLineSpacing * i;
				}

				// Measure text
				textSize = ctx.measureText(lineArr[i]);

				// Check if we should stroke the text too
				if (entity._nativeStroke) {
					ctx.strokeText(lineArr[i], 0, renderY);
				}

				// Draw text
				ctx.fillText(lineArr[i], 0, renderY);
			}
		}
	}
};