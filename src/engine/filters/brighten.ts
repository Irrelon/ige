import { igeFilters } from "@/engine/utils/igeFilters";
import type { IgeSmartFilter } from "@/types/IgeSmartFilter";

export const brighten: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	// Apply the filter and then put the new pixel data
	ctx.putImageData(
		igeFilters.helper.brightenHelper(ctx.getImageData(0, 0, canvas.width, canvas.height), texture, data),
		0,
		0
	);
};

igeFilters.registerFilter("brighten", brighten);

igeFilters.registerHelper("brightenHelper", function (imageData, texture, data) {
	const adjustment: number = texture.data("IgeFilters.brighten.value") || data.value;

	const arr = imageData.data;
	const arrCount = arr.length;

	for (let i = 0; i < arrCount; i += 4) {
		arr[i] += adjustment;
		arr[i + 1] += adjustment;
		arr[i + 2] += adjustment;
	}

	return imageData;
});
