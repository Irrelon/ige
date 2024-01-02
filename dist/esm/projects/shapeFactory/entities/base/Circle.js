import { GameEntity } from "./GameEntity.js"
import { isClient } from "../../../../engine/clientServer.js"
import { registerClass } from "../../../../engine/igeClassStore.js"
import { ige } from "../../../../engine/instance.js"
export class Circle extends GameEntity {
    classId = "Circle";
    constructor() {
        super();
        this.data("glowColor", "#c852ff").width(50).height(50);
        if (isClient) {
            this.texture(ige.textures.get("circleSmartTexture"));
        }
    }
}
registerClass(Circle);
