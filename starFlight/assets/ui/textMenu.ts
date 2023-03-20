import { IgeSmartTexture } from "@/types/IgeSmartTexture";

export const textMenu: IgeSmartTexture = {
	render: function (ctx, entity) {
		const te = entity._targetEntity;
		const menu = entity._actionList;

		ctx.fillStyle = '#101010';
		ctx.strokeStyle = '#3f3f3f';

		ctx.fillRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);
		ctx.strokeRect(0, 0, entity._bounds2d.x, entity._bounds2d.y);

		// Display menu header
		ctx.font = "10px Verdana";
		ctx.fillStyle = '#ffffff';
		ctx.strokeStyle = '#ffffff';
		ctx.fillText('TARGET INTERACTION MENU', entity._bounds2d.x / 2, 10);
		ctx.beginPath();
		ctx.moveTo(10, 19);
		ctx.lineTo(entity._bounds2d.x - 10, 19);
		ctx.stroke();

		// Display text menu items
		ctx.textAlign = 'left';
		ctx.fillStyle = '#00c0ff';

		let offsetY = 0;
		let index = 1;
		for (const i in menu) {
			const menuText = menu[i];
			ctx.fillText('(' + index + ') ' + menuText, 10, 34 + offsetY);
			offsetY += 14;
			index++;
		}
	}
};
