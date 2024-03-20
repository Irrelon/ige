import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const IgeCuboidSmartTexture: IgeSmartTexture = {
	render: (ctx, entity) => {
		const poly = entity.bounds3dPolygon();
		ctx.strokeStyle = "#a200ff";
		poly.render(ctx);
	}
};
