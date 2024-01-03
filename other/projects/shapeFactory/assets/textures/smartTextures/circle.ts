import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const circleSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.beginPath();
		ctx.arc(0, 0, entity._bounds2d.x2, 0, 2 * Math.PI);
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
