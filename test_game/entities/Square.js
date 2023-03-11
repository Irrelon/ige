import { textures } from "../services/textures.js";
import { isClient } from "../../engine/services/clientServer.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
import { GameEntity } from "./GameEntity.js";
export class Square extends GameEntity {
    constructor() {
        super();
        this.classId = 'Square';
        this.data("glowColor", "#00d0ff")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(textures.getTextureById("square"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Square);
