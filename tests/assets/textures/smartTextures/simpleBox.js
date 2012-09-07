var image = {
	render: function (ctx, entity) {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(-entity.geometry.x2, -entity.geometry.y2, entity.geometry.x, entity.geometry.y);
	}
};