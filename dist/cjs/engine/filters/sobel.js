"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sobel = void 0;
const convolute_1 = require("./convolute");
const igeFilters_1 = require("../igeFilters");
const sobel = function (canvas, ctx, originalImage, texture, data) {
	let strength = 1,
		loop;
	if (data && data.value) {
		strength = data.value;
	}
	for (loop = 0; loop < strength; loop++) {
		const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		if (!imgData) return;
		// Apply the filter and then put the new pixel data
		const imageData = (0, convolute_1.convoluteHelper)(imgData, [-1, -1, 1, -2, 0, 2, -1, 1, 1], true);
		if (!imageData) return;
		ctx.putImageData(imageData, 0, 0);
	}
};
exports.sobel = sobel;
igeFilters_1.igeFilters.registerFilter("sobel", exports.sobel);
