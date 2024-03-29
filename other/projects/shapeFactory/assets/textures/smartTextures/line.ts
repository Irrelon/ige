import { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const lineSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.beginPath();
		ctx.lineCap = "round";
		if (entity.isometric()) {
			const p1 = new IgePoint3d(-entity._bounds2d.x2, -entity._bounds2d.y2, 0).toIso();
			const p2 = new IgePoint3d(entity._bounds2d.x2, entity._bounds2d.y2, 0).toIso();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
		} else {
			ctx.moveTo(-entity._bounds2d.x2, -entity._bounds2d.y2);
			ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
		}
		ctx.lineWidth = 24;
		ctx.strokeStyle = "#003a65";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = entity.data("glowSize");
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.stroke();

		for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
			ctx.stroke();
		}
	}
};
