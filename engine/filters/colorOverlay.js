IgeFilters.colorOverlay = function (canvas, ctx, originalImage, texture, data) {
	if (!texture._filterImageDrawn || !data || !data.cumulative) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(originalImage, 0, 0);
		texture._filterImageDrawn = true;
	}

	// Set the composite operation and draw the colour over the top
	ctx.globalCompositeOperation = 'source-atop';

	ctx.fillStyle = data.color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};