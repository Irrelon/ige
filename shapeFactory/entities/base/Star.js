import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { registerClass } from "../../../engine/igeClassStore.js";
import { Building } from "./Building.js";
export class Star extends Building {
    constructor() {
        super();
        this.classId = 'Star';
        this.data("glowColor", "#00ff00")
            .depth(1)
            .width(60)
            .height(60);
        if (isClient) {
            this.texture(ige.textures.get("star"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Star);
