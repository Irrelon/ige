IgeFilters.sobel = function (canvas, ctx, originalImage, texture, data) {
	var strength = 1,
		loop;

	if (data && data.value) {
		strength = data.value;
	}

	for (loop = 0; loop < strength; loop++) {
		// Apply the filter and then put the new pixel data
		ctx.putImageData(
			IgeFilters._convolute(
				ctx.getImageData(
					0,
					0,
					canvas.width,
					canvas.height
				),
				[
					-1, -1,  1,
					-2,  0, 2,
					-1, 1,  1
				],
				true
			),
			0,
			0
		);
	}

	//IgeFilters._invert(canvas, ctx);
};

IgeFilters._invert = function (canvas, ctx) {
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