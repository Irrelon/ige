"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerTexture = void 0;
exports.PlayerTexture = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.strokeStyle = "rgba(255, 0, 0, 1)";
		ctx.beginPath();
		ctx.moveTo(0, -entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(0, entity._bounds2d.y2 - 5);
		ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(0, -entity._bounds2d.y2);
		ctx.stroke();
	}
};
