import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { Building } from "./Building";
export class Star extends Building {
    classId = 'Star';
    constructor() {
        super();
        this.data("glowColor", "#00ff00")
            .layer(1)
            .width(60)
            .height(60);
        if (isClient) {
            this.texture(ige.textures.get("starSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Star);