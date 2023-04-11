import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { GameEntity } from "./GameEntity";
export class Circle extends GameEntity {
    constructor() {
        super();
        this.classId = 'Circle';
        this.data("glowColor", "#c852ff")
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("circleSmartTexture"));
        }
    }
}
registerClass(Circle);
