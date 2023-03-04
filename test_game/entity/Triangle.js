import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
export class Triangle extends IgeEntity {
    constructor() {
        super();
        this.classId = 'Triangle';
        this.data("glowColor", "#00ff00")
            .depth(1)
            .width(50)
            .height(50)
            .texture(textures.getTextureById("triangle"));
    }
}
