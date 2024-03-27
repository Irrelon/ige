import { IgeUiElement } from "../core/IgeUiElement.js"
import { registerClass } from "../utils/igeClassStore.js";
export class IgeUiAutoFlow extends IgeUiElement {
    classId = "IgeUiAutoFlow";
    _currentHeight = 0;
    tick(ctx) {
        // Loop children and re-position then
        const arr = this._children;
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
registerClass(IgeUiAutoFlow);
