var image = {
	render: function (ctx, entity) {
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		var finalText = entity._valueLabel;
		var finalText2 = 0;
		if (typeof(entity._valueLabel2) != 'undefined' && entity._valueLabel2 != entity._valueLabel) {
			finalText2 = entity._valueLabel2;
		}
		if (!finalText) { finalText = '0'; } // convert zero to string

		// Draw bounding box
		var boundingHeight = 13;
		var boundingY = 0;
		if (finalText2) {
			boundingHeight += 13;
			boundingY = -6.5;
		}
		
		ctx.globalAlpha = entity._valueLabelBackOpacity || 0.8;
		ctx.fillStyle = entity._valueLabelBackColor || '#000000';
		ctx.fillRect(0, boundingY, 20, boundingHeight);
		
		ctx.translate(this.width / 2, this.height / 2);
		
		ctx.globalAlpha = entity._valueLabelOpacity || 0.8;
		ctx.fillStyle = '#ffffff';
		ctx.fillText(finalText, 0, boundingY);
		
		if (finalText2) {
			ctx.fillStyle = '#ffffff';
			ctx.fillText(finalText2, 0, boundingY + 13);
		}
	},
	width: 20,
	height: 15,
}