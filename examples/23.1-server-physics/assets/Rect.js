var image = {
	render: function (ctx, entity) {

		ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx.fillRect(-entity._bounds2d.x2, -entity._bounds2d.y2, entity._bounds2d.x, entity._bounds2d.y);
	}
};