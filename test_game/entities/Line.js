import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
export class Line extends IgeEntity {
    constructor(x1, y1, x2, y2) {
        super();
        this.classId = 'Line';
        // 0, 0, 250, -50
        // 250, -50, 220, 120
        this.data("glowColor", "#ffea00")
            .depth(0)
            .width(x2 - x1)
            .height(y2 - y1)
            .translateTo((x2 / 2) + (x1 / 2), (y2 / 2) + (y1 / 2), 0);
        if (isClient) {
            this.texture(textures.getTextureById("line"));
            this.registerNetworkClass();
        }
    }
}
