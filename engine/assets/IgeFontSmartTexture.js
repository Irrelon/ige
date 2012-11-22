/**
 * Provides native canvas font rendering supporting multi-line
 * text and alignment options.
 */
var IgeFontSmartTexture = {
	render: function (ctx, entity) {
		if (entity._nativeFont && entity._text) {
			var text = entity._text,
				lineArr = [],
				textSize,
				renderStartY,
				renderY,
				lineHeight,
				i;

			ctx.font = entity._nativeFont;
			ctx.textBaseline = 'middle';

			if (entity._colorOverlay) {
				ctx.fillStyle = entity._colorOverlay;
			}

			// Text alignment
			if (entity._textAlignX === 0) {
				ctx.textAlign = 'left';
				ctx.translate(-entity._geometry.x2, 0);
			}

			if (entity._textAlignX === 1) {
				ctx.textAlign = 'center';
				//ctx.translate(-entity._geometry.x2, 0);
			}

			if (entity._textAlignX === 2) {
				ctx.textAlign = 'right';
				ctx.translate(entity._geometry.x2, 0);
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

			lineHeight = Math.floor(entity._geometry.y / lineArr.length);
			renderStartY = -((lineHeight + (entity._textLineSpacing)) / 2) * (lineArr.length - 1);

			for (i = 0; i < lineArr.length; i++) {
				renderY = renderStartY + (lineHeight * i) + (entity._textLineSpacing * (i));

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