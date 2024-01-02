import { Building } from "./Building.js"
import { isClient } from "../../../../engine/clientServer.js"
import { registerClass } from "../../../../engine/igeClassStore.js"
import { ige } from "../../../../engine/instance.js"
export class Flag extends Building {
    classId = "Flag";
    constructor() {
        super();
        this.data("glowColor", "#ffcc00").layer(1).width(10).height(20);
        if (isClient) {
            this.texture(ige.textures.get("flagSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Flag);
