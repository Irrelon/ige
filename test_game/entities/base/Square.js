import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/services/clientServer.js";
import { registerClass } from "../../../engine/services/igeClassStore.js";
import { Building } from "./Building.js";
export class Square extends Building {
    constructor() {
        super();
        this.classId = 'Square';
        this.data("glowColor", "#00d0ff")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("square"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Square);
