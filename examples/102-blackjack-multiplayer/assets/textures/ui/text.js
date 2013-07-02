var image = {
	render: function (ctx, entity) {
		// Draw text
		if (entity.asset_text) {
			var at = entity.asset_text;
			ctx.font = at.font || "normal 12px Verdana";
			ctx.textAlign = at.align || 'center';
			ctx.textBaseline = at.baseline || 'middle';
			ctx.fillStyle = at.color || '#000000';
			ctx.fillText(at.value, 0, 0);
		}
	},
}