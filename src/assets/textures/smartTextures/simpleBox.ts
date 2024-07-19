import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export const image = {
	render: function (ctx: IgeCanvasRenderingContext2d, entity: IgeEntity) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
	}
};
