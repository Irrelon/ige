import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { Building } from "./Building.js";
export class Flag extends Building {
    constructor() {
        super();
        this.classId = 'Flag';
        this.data("glowColor", "#002aff")
            .depth(1)
            .width(10)
            .height(20);
        if (isClient) {
            this.texture(ige.textures.get("flag"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Flag);
