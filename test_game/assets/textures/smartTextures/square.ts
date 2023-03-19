import { IgeSmartTexture } from "@/types/IgeSmartTexture";

const square: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.fillStyle = "#ffffff";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = 40;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
	}
};

export default square;
