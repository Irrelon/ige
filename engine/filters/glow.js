/*Filters.glow = function(pixels, passes, image, glowPasses){
	for(var i=0; i < passes; i++){
		pixels = Filters.convolute(pixels,
			[1/9,  1/9,  1/9,
				1/9,  1/9,  1/9,
				1/9,  1/9,  1/9 ]);
	}

	var tempCanvas = document.createElement("canvas"),
		glowCanvas = document.createElement("canvas"),
		tCtx = tempCanvas.getContext("2d"),
		gCtx = glowCanvas.getContext("2d");

	tempCanvas.width = glowCanvas.width = pixels.width;
	tempCanvas.height = tempCanvas.height = pixels.height;

	tCtx.putImageData(pixels, 0, 0);
	gCtx.drawImage(image, 0, 0);

	gCtx.globalCompositeOperation = "lighter";

	for(i = 0; i < glowPasses; i++){
		gCtx.drawImage(tempCanvas,0,0);
	}

	return Filters.getPixels(glowCanvas);
}*/
IgeFilters.glow = function (canvas, ctx, originalImage, texture, data) {
	var oneNinth = 1 / 9,
		pixelData,
		tempCanvas,
		tempCtx,
		i;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(originalImage, 0, 0);

	pixelData = ctx.getImageData(
		0,
		0,
		canvas.width,
		canvas.height
	);

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	for (i = 0; i < data.blurPasses; i++) {
		pixelData = IgeFilters._convolute(
			pixelData,
			[
				oneNinth, oneNinth,  oneNinth,
				oneNinth, oneNinth,  oneNinth,
				oneNinth, oneNinth,  oneNinth
			],
			false
		);
	}

	tempCanvas = document.createElement("canvas");
	tempCtx = tempCanvas.getContext('2d');

	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;

	tempCtx.putImageData(pixelData, 0, 0);
	ctx.drawImage(data.glowMask._image, 0, 0);

	ctx.globalCompositeOperation = "lighter";

	for (i = 0; i < data.glowPasses; i++) {
		// Apply the filter and then put the new pixel data
		ctx.drawImage(tempCanvas, 0, 0);
	}
};