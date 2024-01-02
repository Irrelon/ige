import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const bulletSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		ctx.strokeStyle = "#ff0000";
		ctx.strokeRect(0, 0, 2, 2);
	}
};
