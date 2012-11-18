var image = {
	render: function (ctx, entity) {
		ctx.fillStyle = '#ff5a00';

		// Move to top-left of the entity draw space
		ctx.translate(-entity._geometry.x2, -entity._geometry.y2);

		// Draw a rectangle
		ctx.fillRect(0, 0, entity._geometry.x, entity._geometry.y);
	}
};