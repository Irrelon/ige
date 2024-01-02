"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triangleSmartTexture = void 0;
exports.triangleSmartTexture = {
	render: function (ctx, entity) {
		ctx.beginPath();
		ctx.moveTo(-entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(0, -entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.fillStyle = entity.data("fillColor") || "#ffffff";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = entity.data("glowSize");
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fill();
		for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
			ctx.fill();
		}
	}
};
