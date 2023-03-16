import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/services/clientServer.js";
import { registerClass } from "../../../engine/services/igeClassStore.js";
import { GameEntity } from "./GameEntity.js";
export class Circle extends GameEntity {
    constructor() {
        super();
        this.classId = 'Circle';
        this.data("glowColor", "#c852ff")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("circle"));
        }
    }
}
registerClass(Circle);