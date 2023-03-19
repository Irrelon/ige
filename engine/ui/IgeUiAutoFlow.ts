import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class IgeUiAutoFlow extends IgeUiElement {
	classId = "IgeUiAutoFlow";

	_currentHeight: number = 0;

	tick (ctx: IgeCanvasRenderingContext2d) {
		// Loop children and re-position then
		const arr = (this._children as IgeUiElement[]);
		const arrCount = arr.length;

		let currentY = 0;

		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];
			const itemY = item._bounds2d.y;

			item.top(currentY);

			currentY += itemY;
		}

		// Now do the super-class tick
		super.tick(ctx);
	}
}
