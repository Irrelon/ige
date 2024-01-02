import { IgeUiElement } from "../core/IgeUiElement.js";
import { registerClass } from "../igeClassStore.js";

export class IgeUiColumn extends IgeUiElement {
	classId = "IgeUiColumn";
	tick(ctx) {
		const maxSize = this.height();
		// Loop children and re-position then
		const arr = this._children;
		const arrCount = arr.length;
		let flowSpace = maxSize;
		let flowSpaceDivisions = 0;
		let currentPosition = 0;
		// Flex resolution algorithm
		// 1) Loop children
		// 2) Find children with fixed width and those with flex, hold those with flex in separate array
		// 3) Final overall width available is total - sum(fixed widths)
		// 4) Loop flex children and assign width based on available space and flex value
		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];
			if (item._uiFlex !== undefined) {
				flowSpaceDivisions += item._uiFlex;
				continue;
			}
			// Remove this non-flex entity's size from available flow space
			flowSpace -= item.height() + item._marginTop + item._marginBottom;
		}
		// Single flow space division is...
		const singleFlowSpaceDivision = flowSpace / flowSpaceDivisions;
		// Loop children again and assign co-ordinate position
		for (let i = 0; i < arrCount; i++) {
			const item = arr[i];
			if (item._uiFlex !== undefined) {
				// Item is flex-based, assign it space based on flex value
				item.height(singleFlowSpaceDivision * item._uiFlex - (item._marginTop + item._marginBottom));
			}
			// Bounds (x, y) is (width, height) in local space
			const itemHeight = item._bounds2d.y;
			item.top(currentPosition + item._marginTop);
			currentPosition += itemHeight + item._marginTop + item._marginBottom;
		}
		// Now do the super-class tick
		super.tick(ctx);
	}
}
registerClass(IgeUiColumn);
