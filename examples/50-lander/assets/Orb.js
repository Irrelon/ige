var image = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.fillStyle = '#b400ff';
		ctx.strokeStyle = '#e371ff';
		ctx.beginPath();
		ctx.moveTo(-entity._geometry.x2, -entity._geometry.y2 / 2);
		ctx.lineTo(-entity._geometry.x2 / 2, -entity._geometry.y2);
		ctx.lineTo(entity._geometry.x2 / 2, -entity._geometry.y2);
		ctx.lineTo(entity._geometry.x2, -entity._geometry.y2 / 2);
		ctx.lineTo(entity._geometry.x2, entity._geometry.y2 / 2);
		ctx.lineTo(entity._geometry.x2 / 2, entity._geometry.y2);
		ctx.lineTo(-entity._geometry.x2 / 2, entity._geometry.y2);
		ctx.lineTo(-entity._geometry.x2, entity._geometry.y2 / 2);
		ctx.lineTo(-entity._geometry.x2, -entity._geometry.y2 / 2);
		ctx.fill();
		ctx.stroke();
	}
};