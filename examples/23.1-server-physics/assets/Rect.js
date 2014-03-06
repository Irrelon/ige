var image = {
	render: function (ctx, entity) {

		ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx.fillRect(-entity.bounds.bounds2d().x2, -entity.bounds.bounds2d().y2, entity.bounds.bounds2d().x, entity.bounds.bounds2d().y);
	}
};