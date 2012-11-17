var image = {
	render: function (ctx, entity) {
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(-entity._geometry.x2, -entity._geometry.y2, entity._geometry.x, entity._geometry.y);
	}
};