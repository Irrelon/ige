import { ige } from "@/engine/instance";
import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { InfoWindow } from "./InfoWindow";
export class MessageWindow extends InfoWindow {
    constructor(options = {}) {
        super(options);
        this.classId = "MessageWindow";
        this._msgs = [];
        ige.network.on("msg", (data) => {
            this.addMsg(data.msg);
        });
        this._options = options;
    }
    addMsg(msg) {
        this._msgs.push(new IgeUiLabel()
            .layer(1)
            .font(this._options.messageFont || "8px Verdana")
            .height(15)
            .width(this.width())
            .left(0)
            .textAlignX(0)
            .textAlignY(1)
            .textLineSpacing(15)
            .color(this._options.messageColor || "#7bdaf1")
            .value(msg)
            .mount(this));
    }
    tick(ctx, dontTransform = false) {
        // Loop children and re-position then
        const arr = this._children;
        const arrCount = arr.length;
        let currentY = 5;
        const width = this.width();
        for (let i = 0; i < arrCount; i++) {
            const item = arr[i];
            if (item.classId !== "Tab") {
                const itemY = item._bounds2d.y;
                item.top(currentY);
                item.width(width);
                currentY += itemY;
            }
        }
        // Now do the super-class tick
        super.tick(ctx, dontTransform);
    }
}
