"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.igeFilterColorOverlay = void 0;
const igeFilters_1 = require("../utils/igeFilters.js");
const igeFilterColorOverlay = function (canvas, ctx, originalImage, texture, data) {
    // Set the composite operation and draw the colour over the top
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
exports.igeFilterColorOverlay = igeFilterColorOverlay;
igeFilters_1.igeFilters.registerFilter("igeFilterColorOverlay", exports.igeFilterColorOverlay);
