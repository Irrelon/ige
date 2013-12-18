var image = {
	render: function (ctx, entity) {
		ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
		ctx.beginPath();
		ctx.arc(0, 0, entity._bounds2d.x2, 0, 2 * Math.PI, false);
		ctx.fill();
	}
};