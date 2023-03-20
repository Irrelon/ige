import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { Building } from "./Building.js";
export class Triangle extends Building {
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
