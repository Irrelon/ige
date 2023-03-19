import { IgeSmartTexture } from "@/types/IgeSmartTexture";

const circle: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.beginPath();
		ctx.arc(0, 0, entity._bounds2d.x2, 0, 2 * Math.PI);
		ctx.fillStyle = "#ffffff";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = 40;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fill();
	}
};

export default circle;
