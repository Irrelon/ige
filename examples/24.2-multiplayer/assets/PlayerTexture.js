var image = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.strokeStyle = entity._playerColor;
		ctx.beginPath();
		ctx.moveTo(0, -entity._bounds2d.y2);
		ctx.lineTo(entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(0, entity._bounds2d.y2 - 5);
		ctx.lineTo(-entity._bounds2d.x2, entity._bounds2d.y2);
		ctx.lineTo(0, -entity._bounds2d.y2);
		ctx.stroke();
	}
};