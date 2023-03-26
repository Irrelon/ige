import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { IgeRect } from "../../../engine/core/IgeRect.js";
import { GameEntity } from "./GameEntity.js";
export class Line extends GameEntity {
    constructor(x1, y1, x2, y2) {
        super();
        this.classId = 'Line';
        if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
            this.setLine(x1, y1, x2, y2);
        }
    }
    setLine(x1, y1, x2, y2) {
        this._initVals = new IgeRect(x1, y1, x2, y2);
        this.data("glowColor", "#ff9100")
            .depth(0)
            .width(x2 - x1)
            .height(y2 - y1)
            .translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);
        if (isClient) {
            this.texture(ige.textures.get("line"));
        }
    }
}
registerClass(Line);
