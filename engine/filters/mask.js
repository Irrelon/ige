IgeFilters.mask = function (canvas, ctx, originalImage, texture, data) {
	var w = canvas.width,
		h = canvas.height;

	ctx.clearRect(0, 0, w, h);

	ctx.save();
	ctx.beginPath();
	ctx.rect(data.x, data.y, data.w, data.h);
	ctx.clip();

	// draw texture inside clipping region
	ctx.drawImage(originalImage, 0, 0, w, h);

	ctx.restore();
};