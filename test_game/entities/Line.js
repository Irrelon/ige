import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
import IgeRect from "../../engine/core/IgeRect.js";
export class Line extends IgeEntity {
    constructor(x1, y1, x2, y2) {
        super();
        this.classId = 'Line';
        this._initVals = new IgeRect(x1, y1, x2, y2);
        this.data("glowColor", "#ffea00")
            .depth(0)
            .width(x2 - x1)
            .height(y2 - y1)
            .translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);
        if (isClient) {
            this.texture(textures.getTextureById("line"));
        }
    }
    streamCreateData(allGood = false) {
        return [this._initVals.x, this._initVals.y, this._initVals.width, this._initVals.height];
    }
}
registerClass(Line);
