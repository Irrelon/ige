IgeFilters.edgeDetect = function (canvas, ctx, originalImage, texture, data) {
	if (!texture._filterImageDrawn || !data || !data.cumulative) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(originalImage, 0, 0);
		texture._filterImageDrawn = true;
	}

	var newData = IgeFilters._convolute(
			ctx.getImageData(
				0,
				0,
				canvas.width,
				canvas.height
			),
			[
				-1,	-1,	-1,	-1,	-1,
				-1,	2,	2,	2,	-1,
				-1,	2,	0,	2,	-1,
				-1,	2,	2,	2,	-1,
				-1,	-1,	-1,	-1,	-1
			],
			true
		),
		arr = newData.data,
		arrCount = arr.length,
		i, r, g, b, v;

	for (i = 0; i < arrCount; i += 4) {
		r = arr[i];
		g = arr[i+1];
		b = arr[i+2];

		v = (r + g + b) / 3;
		v *= 1.1;

		v = v >= data.value ? 255 : 0;

		arr[i] = arr[i+1] = arr[i+2] = v;
	}

	// Apply the filter and then put the new pixel data
	ctx.putImageData(
		newData,
		0,
		0
	);
};