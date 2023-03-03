import IgeUiElement from "../core/IgeUiElement.js";
class IgeUiAutoFlow extends IgeUiElement {
    constructor(ige) {
        super(ige);
        this.classId = "IgeUiAutoFlow";
        this._currentHeight = 0;
    }
    tick(ctx) {
        // Loop children and re-position then
        var arr = this._children, arrCount = arr.length, i, item, itemY, currentY = 0;
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
export default IgeUiAutoFlow;
