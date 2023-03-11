import { ige } from "../../engine/instance.js";
import { isClient } from "../../engine/services/clientServer.js";
import { registerClass } from "../../engine/services/igeClassStore.js";
import { GameEntity } from "./GameEntity.js";
export class Triangle extends GameEntity {
    constructor() {
        super();
        this.classId = 'Triangle';
        this.data("glowColor", "#00ff00")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("triangle"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Triangle);
