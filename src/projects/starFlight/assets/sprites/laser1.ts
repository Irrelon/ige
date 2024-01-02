import { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const laserSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		if (entity._fromEntity && entity._toEntity) {
			ctx.strokeStyle = "#ff0000";

			ctx.beginPath();
			ctx.moveTo(entity._fromEntity._translate.x, entity._fromEntity._translate.y);
			ctx.lineTo(entity._toEntity._translate.x + entity._scanX, entity._toEntity._translate.y + entity._scanY);
			ctx.stroke();
		}
	}
};
