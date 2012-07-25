var image = {
	render: function (ctx, entity) {
		if (entity.ui && entity.ui.progress) {
			var progress = entity.ui.progress;
			
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			
			// Check the value is not out of range
			if (progress['val'] > progress['max']) {
				progress['val'] = progress['max'];
			}
			
			if (progress['val'] < progress['min']) {
				progress['val'] = progress['min'];
			}
			
			// Draw bar fill
			if (progress['fill']) {
				ctx.fillStyle = progress['fill'].color || '#000000';
				ctx.fillRect(0, 0, entity._width, entity._height);
			}
			
			// Draw bar
			if (progress['bar']) {
				var inverval = entity._width / (progress['max'] - progress['min']);
				var barWidth = (progress['val'] - progress['min']) * inverval;
				
				ctx.fillStyle = progress['bar'].color || '#fff600';
				ctx.fillRect(0, 0, barWidth, entity._height);
			}
			
			// Draw bar border
			if (progress['border']) {
				ctx.strokeStyle = progress['border'].color || '#ffffff';
				ctx.strokeRect(0, 0, entity._width, entity._height);
			}
			
			// Draw bar text centered
			if (progress['text']) {
				ctx.translate(entity._width / 2, entity._height / 2);
				ctx.fillStyle = progress['text'].color || '#ffffff';
				ctx.fillText(progress['text'].pre + String(progress.val) + progress['text'].post, 0, 0);
			}
		}
	}
}