import { IgeUiElement } from "../core/IgeUiElement.js"
import { registerClass } from "../utils/igeClassStore.js"
export class IgeUiInlineFlow extends IgeUiElement {
    classId = "IgeUiInlineFlow";
    tick(ctx, dontTransform = false) {
        // Loop children and re-position them
        const arr = this._children;
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
