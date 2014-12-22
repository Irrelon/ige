IgeFilters.sharpen = function (canvas, ctx, originalImage, texture, data) {		
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
				[  0, -1,  0,
					-1,  5, -1,
					0, -1,  0 ]
			),
			0,
			0
		);
	}
};