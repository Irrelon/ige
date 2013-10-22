var IgeCuboidSmartTexture = {
	render: function (ctx, entity) {
		var poly = entity.localIsoBoundsPoly();
		
		ctx.strokeStyle = '#a200ff';
		
		poly.render(ctx);
	}
};