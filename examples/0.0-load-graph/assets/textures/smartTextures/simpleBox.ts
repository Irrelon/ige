import { IgeSmartTexture } from "../../../../../types/IgeSmartTexture";

const simpleBox: IgeSmartTexture = {
	render: function (ige, ctx, entity) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
	}
};

export default simpleBox;
