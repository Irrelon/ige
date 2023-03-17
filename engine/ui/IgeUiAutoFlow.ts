import IgeUiElement from "../core/IgeUiElement";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";

export class IgeUiAutoFlow extends IgeUiElement {
	classId = "IgeUiAutoFlow";

	constructor () {
		super();
		this._currentHeight = 0;
	}

	tick (ctx: IgeCanvasRenderingContext2d) {
		// Loop children and re-position then
		let arr = this._children,
			arrCount = arr.length, i,
			item, itemY, currentY = 0;

		for (i = 0; i < arrCount; i++) {
			item = arr[i];
			itemY = item._bounds2d.y;

			item.top(currentY);

			currentY += itemY;
		}

		// Now do the super-class tick
		super.tick(ctx);
	}
}