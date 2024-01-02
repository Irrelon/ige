export const igeButton = {
	render: function (ctx, entity) {
		const ui = entity.data("ui");
		if (ui) {
			if (ui["fill"]) {
				ctx.fillStyle = ui["fill"].color || "#000000";
				ctx.fillRect(
					Math.floor(-entity._bounds2d.x2),
					Math.floor(-entity._bounds2d.y2),
					entity._bounds2d.x,
					entity._bounds2d.y
				);
			}
			// Draw bar border
			if (ui["border"]) {
				ctx.strokeStyle = ui["border"].color || "#ffffff";
				ctx.strokeRect(
					Math.floor(-entity._bounds2d.x2),
					Math.floor(-entity._bounds2d.y2),
					entity._bounds2d.x,
					entity._bounds2d.y
				);
			}
			// Draw bar text centered
			if (ui["text"]) {
				ctx.font = ui["text"].font || "normal 12px Verdana";
				ctx.textAlign = ui["text"].align || "center";
				ctx.textBaseline = ui["text"].baseline || "middle";
				ctx.fillStyle = ui["text"].color || "#ffffff";
				ctx.fillText(ui["text"].value, 0, 0);
			}
		}
	}
};
