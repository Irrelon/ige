var image = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.fillStyle = '#0090ff';
		ctx.beginPath();
		ctx.moveTo(0, -entity.bounds.bounds2d().y2);
		ctx.lineTo(entity.bounds.bounds2d().x2, entity.bounds.bounds2d().y2);
		ctx.lineTo(0, entity.bounds.bounds2d().y2 - 5);
		ctx.lineTo(-entity.bounds.bounds2d().x2, entity.bounds.bounds2d().y2);
		ctx.lineTo(0, -entity.bounds.bounds2d().y2);
		ctx.fill();
	}
};