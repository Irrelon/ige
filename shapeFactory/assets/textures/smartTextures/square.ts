import { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const squareSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.fillStyle = entity.data("fillColor") || "#ffffff";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = entity.data("glowSize");
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);

		for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
			ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
		}
	}
};
