import { igeFilters } from "@/engine/utils/igeFilters";
import type { IgeSmartFilter } from "@/types/IgeSmartFilter";

export const colorOverlay: IgeSmartFilter = function (canvas, ctx, originalImage, texture, data) {
	// Set the composite operation and draw the colour over the top
	ctx.globalCompositeOperation = "source-atop";

	ctx.fillStyle = data.color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

igeFilters.registerFilter("colorOverlay", colorOverlay);
