var image = {
	render: function (ctx, entity) {

		ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
		ctx.fillRect(-entity.geometry.x2, -entity.geometry.y2, entity.geometry.x, entity.geometry.y);
	}
};