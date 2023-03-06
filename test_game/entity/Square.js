import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
export class Square extends IgeEntity {
    constructor() {
        super();
        this.classId = 'Square';
        this.data("glowColor", "#00d0ff")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(textures.getTextureById("square"));
        }
    }
}
