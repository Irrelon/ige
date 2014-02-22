var image = {
	render: function (ctx, entity) {
		ctx.fillStyle = entity._rectColor;

		// Move to top-left of the entity draw space
		ctx.translate(-entity._bounds2d.x2, -entity._bounds2d.y2);

		// Draw a rectangle
		ctx.fillRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
	}
};