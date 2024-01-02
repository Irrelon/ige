export const video = {
	render: function (ctx, entity) {
		if (entity._videoElement) {
			ctx.drawImage(entity._videoElement, 0, 0, 400, 300, 0, 0, 200, 150);
		}
	}
};
