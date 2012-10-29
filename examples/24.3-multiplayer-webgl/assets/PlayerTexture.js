var image = {
	render: function (ctx, entity) {
		// Draw the player entity
		ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
		ctx.beginPath();
		ctx.moveTo(0, -entity.geometry.y2);
		ctx.lineTo(entity.geometry.x2, entity.geometry.y2);
		ctx.lineTo(0, entity.geometry.y2 - 5);
		ctx.lineTo(-entity.geometry.x2, entity.geometry.y2);
		ctx.lineTo(0, -entity.geometry.y2);
		ctx.stroke();
	}
};