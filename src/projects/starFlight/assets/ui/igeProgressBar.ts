import { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const igeProgressBar: IgeSmartTexture = {
	render: function (ctx, entity) {
		if (entity.ui && entity.ui.progress) {
			const progress = entity.ui.progress;

			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			// Check the value is not out of range
			if (progress["val"] > progress["max"]) {
				progress["val"] = progress["max"];
			}

			if (progress["val"] < progress["min"]) {
				progress["val"] = progress["min"];
			}

			// Draw bar fill
			if (progress["fill"]) {
				ctx.fillStyle = progress["fill"].color || "#000000";
				ctx.fillRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
			}

			// Draw bar
			if (progress["bar"]) {
				const inverval = entity._bounds2d.x / (progress["max"] - progress["min"]);
				const barWidth = (progress["val"] - progress["min"]) * inverval;

				ctx.fillStyle = progress["bar"].color || "#fff600";
				ctx.fillRect(0, 0, barWidth, entity._bounds2d.y);
			}

			// Draw bar border
			if (progress["border"]) {
				ctx.strokeStyle = progress["border"].color || "#ffffff";
				ctx.strokeRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
			}

			// Draw bar text centered
			if (progress["text"]) {
				ctx.translate(entity._bounds2d.x / 2, entity._bounds2d.y / 2);
				ctx.fillStyle = progress["text"].color || "#ffffff";
				ctx.fillText(progress["text"].pre + String(progress.val) + progress["text"].post, 0, 0);
			}
		}
	}
};
