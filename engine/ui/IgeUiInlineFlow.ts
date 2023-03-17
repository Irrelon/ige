import IgeUiElement from "../core/IgeUiElement";

export class IgeUiInlineFlow extends IgeUiElement {
	classId = "IgeUiInlineFlow";

	tick (ctx) {
		// Loop children and re-position them
		let arr = this._children,
			arrCount = arr.length, i,
			item, itemX, currentX = 0;

		for (i = 0; i < arrCount; i++) {
			item = arr[i];
			itemX = item._bounds2d.x;
			item.left(currentX);
			currentX += itemX;
		}

		// call the super-class tick
		super.tick(ctx);
	}
}