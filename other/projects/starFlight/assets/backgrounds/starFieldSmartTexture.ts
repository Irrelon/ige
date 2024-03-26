import { ige } from "@/engine/exports";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const starFieldSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		let sf = this._starField,
			starCount = this._starCount,
			stars,
			sfPoint,
			camera = ige.engine._currentCamera,
			camTranslate = camera._translate,
			finalPointX,
			finalPointY,
			multipleX,
			multipleY,
			i;

		if (!this._started) {
			starCount = this._starCount = entity.data("stars") || 100;

			// Set the max dimensions
			this._starField = {};

			sf = this._starField;
			sf.maxDim = Math.max(entity._bounds2d.x, entity._bounds2d.y);

			// First run so generate some random positions and speeds
			sf.stars = [];
			stars = sf.stars;

			for (i = 0; i < starCount; i++) {
				stars[i] = [
					Math.floor(Math.random() * sf.maxDim), // x position
					Math.floor(Math.random() * sf.maxDim), // y position
					0.1 + parseFloat((Math.random() * 0.7).toFixed(1)), // speed,
					Math.ceil(Math.random() * 2) // size
				];
			}

			this._started = true;
		} else {
			// Render starfield
			stars = sf.stars;

			for (i = 0; i < starCount; i++) {
				sfPoint = stars[i];

				finalPointX = sfPoint[0] - camTranslate.x * sfPoint[2];
				finalPointY = sfPoint[1] - camTranslate.y * sfPoint[2];
				multipleX = Math.floor(finalPointX / sf.maxDim);
				multipleY = Math.floor(finalPointY / sf.maxDim);

				finalPointX -= sf.maxDim * multipleX;
				finalPointY -= sf.maxDim * multipleY;

				ctx.fillStyle = "rgba(255,255,255," + sfPoint[2] + ")";
				ctx.fillRect(
					finalPointX + camTranslate.x - sf.maxDim / 2,
					finalPointY + camTranslate.y - sf.maxDim / 2,
					sfPoint[3],
					sfPoint[3]
				);
			}
		}
	}
};
