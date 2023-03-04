import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
export class Circle extends IgeEntity {
    constructor() {
        super();
        this.classId = 'Circle';
        this.data("glowColor", "#c852ff")
            .depth(1)
            .width(50)
            .height(50)
            .texture(textures.getTextureById("circle"));
    }
}
