import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
export class Circle extends IgeEntity {
    constructor() {
        super();
        this.classId = 'Circle';
        this.data("glowColor", "#c852ff")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(textures.getTextureById("circle"));
        }
    }
}
registerClass(Circle);
