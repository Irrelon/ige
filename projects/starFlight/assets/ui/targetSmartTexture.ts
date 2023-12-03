import { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const targetSmartTexture: IgeSmartTexture = {
	render: function (ctx, entity) {
		if (entity._targetEntity) {
			ctx.save();
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			const targetEntityWidth = entity._targetEntity._width;
			const targetEntityWidth2 = targetEntityWidth / 2;

			const width = entity._bounds2d.x;
			const height = entity._bounds2d.y;
			const xLength = width / 3;
			const yLength = height / 3;
			let radius = 0;
			let brightness = 0;
			const minBrightness = 0.1;
			const maxBrightness = 0.3;

			ctx.translate(-width / 2, -width / 2);

			// Draw interaction radius rings
			if (entity._actionData) {
				if (entity._actionData.scan) {
					radius = entity._actionData.scan.radius + targetEntityWidth2;
					if (entity._distance <= radius) {
						brightness = maxBrightness;
					} else {
						brightness = minBrightness;
					}

					ctx.strokeStyle = '#007482';
					ctx.fillStyle = 'rgba(0, 116, 130, ' + brightness + ')';

					ctx.beginPath();
					ctx.arc(
						width / 2,
						height / 2,
						radius,
						0,
						Math._PI2,
						true
					);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}

				if (entity._actionData.mine) {
					radius = entity._actionData.mine.radius + targetEntityWidth2;
					if (entity._distance <= radius) {
						brightness = maxBrightness;
					} else {
						brightness = minBrightness;
					}

					ctx.strokeStyle = '#826500';
					ctx.fillStyle = 'rgba(130, 101, 0, ' + brightness + ')';

					ctx.beginPath();
					ctx.arc(
						width / 2,
						height / 2,
						radius,
						0,
						Math._PI2,
						true
					);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}

				if (entity._actionData.attack) {
					radius = entity._actionData.attack.radius + targetEntityWidth2;
					if (entity._distance <= radius) {
						brightness = maxBrightness;
					} else {
						brightness = minBrightness;
					}

					ctx.strokeStyle = '#820000';
					ctx.fillStyle = 'rgba(130, 0, 0, ' + brightness + ')';

					ctx.beginPath();
					ctx.arc(
						width / 2,
						height / 2,
						radius,
						0,
						Math._PI2,
						true
					);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}

				if (entity._actionData.transport) {
					radius = entity._actionData.transport.radius + targetEntityWidth2;
					if (entity._distance <= radius) {
						brightness = maxBrightness;
					} else {
						brightness = minBrightness;
					}

					ctx.strokeStyle = '#680082';
					ctx.fillStyle = 'rgba(104, 0, 130, ' + brightness + ')';

					ctx.beginPath();
					ctx.arc(
						width / 2,
						height / 2,
						radius,
						0,
						Math._PI2,
						true
					);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
				}
			}

			// Draw LOCK square
			ctx.strokeStyle = '#ff0000';

			ctx.beginPath();
			ctx.moveTo(0, yLength);
			ctx.lineTo(0, 0);
			ctx.lineTo(xLength, 0);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(width - xLength, 0);
			ctx.lineTo(width, 0);
			ctx.lineTo(width, yLength);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(width, height - yLength);
			ctx.lineTo(width, height);
			ctx.lineTo(width - xLength, height);
			ctx.stroke();

			ctx.beginPath();
			ctx.moveTo(xLength, height);
			ctx.lineTo(0, height);
			ctx.lineTo(0, height - yLength);
			ctx.stroke();

			ctx.translate(width / 2, - 10);
			ctx.fillStyle = '#ff0000';
			ctx.font = 'Verdana bold 8px';
			ctx.fillText('LOCK', 0, 0);
			ctx.restore();
		}
	}
};
