import { igeFilters } from "@/export/exports";
import type { IgeSmartFilter } from "@/export/exports";

export const greyScaleHelper = function (imageData: ImageData): ImageData {
	let arr, arrCount, i, r, g, b, v;

	arr = imageData.data;
	arrCount = arr.length;

	for (i = 0; i < arrCount; i += 4) {
		// Extract pixel colour values
		r = arr[i];
		g = arr[i + 1];
		b = arr[i + 2];

		// CIE luminance for the RGB
		// The human eye is bad at seeing red and blue, so we de-emphasize them.
		v = 0.2126 * r + 0.7152 * g + 0.0722 * b;

		// Set the new pixel colour value
		arr[i] = arr[i + 1] = arr[i + 2] = v;
	}

	return imageData;
};

export const greyScale: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	if (!imgData) return;

	// Apply the filter and then put the new pixel data
	const imageData = greyScaleHelper(imgData);
	if (!imageData) return;

	ctx.putImageData(imageData, 0, 0);
};

igeFilters.registerFilter("greyScale", greyScale);
