IgeFilters.invert = function (canvas, ctx, originalImage, texture, data) {
	var w, h, canvasData, i;
	w = canvas.width;
	h = canvas.height;

	canvasData = ctx.getImageData(0, 0, w, h);

	for (i = 0; i < w * h * 4; i += 4)  {
		canvasData.data[i] = 255 - canvasData.data[i];
		canvasData.data[i+1] = 255 - canvasData.data[i+1];
		canvasData.data[i+2] = 255 - canvasData.data[i+2];
	}

	ctx.putImageData(canvasData, 0, 0);
};