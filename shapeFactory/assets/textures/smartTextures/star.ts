import { IgeSmartTexture } from "@/types/IgeSmartTexture";
import { fillColorByResourceType } from "../../../services/resource";
import { Building } from "../../../entities/base/Building";

export const starSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		let rot = Math.PI / 2 * 3;
		const cx = 0;
		const cy = 0;

		const outerRadius = entity._bounds2d.x2;
		const innerRadius = entity._bounds2d.x2 / 2;
		const spikes = 5;
		const step = Math.PI / spikes;

		ctx.beginPath();
		ctx.moveTo(cx, cy - outerRadius);
		for (let i = 0; i < spikes; i++) {
			let x = cx + Math.cos(rot) * outerRadius;
			let y = cy + Math.sin(rot) * outerRadius;
			ctx.lineTo(x, y);
			rot += step;

			x = cx + Math.cos(rot) * innerRadius;
			y = cy + Math.sin(rot) * innerRadius;
			ctx.lineTo(x, y);
			rot += step;
		}
		ctx.lineTo(cx, cy - outerRadius);
		ctx.closePath();

		ctx.fillStyle = entity.data("fillColor") || "#ffffff";
		ctx.shadowColor = entity.data("glowColor");
		ctx.shadowBlur = entity.data("glowSize");
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.fill();

		for (let i = 0; i < entity.data("glowIntensity") || 0; i++) {
			ctx.fill();
		}

		const buildingEntity = entity as Building;

		if (buildingEntity._requires) {
			buildingEntity._requires.forEach((resourceEntry) => {
				ctx.beginPath();
				ctx.fillStyle = fillColorByResourceType[resourceEntry.type];
				ctx.arc(0, 0, 5, 0, 2 * Math.PI);
				ctx.fill();
			});
		}

		if (buildingEntity._produces) {
			ctx.beginPath();
			ctx.fillStyle = fillColorByResourceType[buildingEntity._produces];
			ctx.arc(0, 0, 5, 0, 2 * Math.PI);
			ctx.fill();
		}
	}
};
