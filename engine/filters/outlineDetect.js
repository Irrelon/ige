IgeFilters.outlineDetect = function (canvas, ctx, originalImage, texture, data) {
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
				0, 1, 0,
				1,  -4, 1,
				0, 1, 0
			]
		),
		0,
		0
	);
};