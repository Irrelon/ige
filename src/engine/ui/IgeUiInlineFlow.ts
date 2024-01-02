import { IgeUiElement } from "@/engine/core/IgeUiElement";
import { registerClass } from "@/engine/igeClassStore";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export class IgeUiInlineFlow extends IgeUiElement {
	classId = "IgeUiInlineFlow";

	tick(ctx: IgeCanvasRenderingContext2d, dontTransform = false) {
		// Loop children and re-position them
		const arr = this._children as IgeUiElement[];
		const arrCount = arr.length;
		let currentX = 0;

		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];
			const itemX = item._bounds2d.x;
			item.left(currentX);
			currentX += itemX;
		}

		// call the super-class tick
		super.tick(ctx, dontTransform);
	}
}

registerClass(IgeUiInlineFlow);
