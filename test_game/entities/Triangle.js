import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
export class Triangle extends IgeEntity {
    constructor() {
        super();
        this.classId = 'Triangle';
        this.data("glowColor", "#00ff00")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(textures.getTextureById("triangle"));
            this.registerNetworkClass();
        }
    }
}
