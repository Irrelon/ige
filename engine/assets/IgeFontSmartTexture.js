var IgeFontSmartTexture = {
	render: function (ctx, entity) {
		if (entity._nativeFont && entity._text) {
			// Move to top-left of the entity draw space
			//ctx.translate(-entity._geometry.x2, -entity._geometry.y2);

			ctx.font = entity._nativeFont;

			if (entity._colorOverlay) {
				ctx.fillStyle = entity._colorOverlay;
			}

			// Text alignment
			if (entity._textAlignX === 0) {
				ctx.textAlign = 'left';
			}

			if (entity._textAlignX === 1) {
				ctx.textAlign = 'center';
			}

			if (entity._textAlignX === 2) {
				ctx.textAlign = 'right';
			}

			// Draw text
			ctx.fillText(entity._text, 0, 0);
		}


	}
};