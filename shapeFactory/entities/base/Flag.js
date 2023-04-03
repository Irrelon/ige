import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { Building } from "./Building.js";
export class Flag extends Building {
    constructor() {
        super();
        this.classId = 'Flag';
        this.data("glowColor", "#ffcc00")
            .depth(1)
            .width(10)
            .height(20);
        if (isClient) {
            this.texture(ige.textures.get("flagSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Flag);
