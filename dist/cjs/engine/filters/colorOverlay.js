"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorOverlay = void 0;
const igeFilters_1 = require("../igeFilters");
const colorOverlay = function (canvas, ctx, originalImage, texture, data) {
	// Set the composite operation and draw the colour over the top
	ctx.globalCompositeOperation = "source-atop";
	ctx.fillStyle = data.color;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};
exports.colorOverlay = colorOverlay;
igeFilters_1.igeFilters.registerFilter("colorOverlay", exports.colorOverlay);
