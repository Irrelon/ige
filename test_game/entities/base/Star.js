import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/services/clientServer.js";
import { registerClass } from "../../../engine/services/igeClassStore.js";
import { Building } from "./Building.js";
export class Star extends Building {
    constructor() {
        super();
        this.classId = 'Star';
        this.data("glowColor", "#00ff00")
            .depth(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("star"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Star);
