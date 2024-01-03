import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const flagSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.beginPath();
		ctx.moveTo(-entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, 0);
		ctx.lineTo(0, -entity._bounds2d.y2);
		ctx.lineTo(-entity._bounds2d.x2, 0);
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
