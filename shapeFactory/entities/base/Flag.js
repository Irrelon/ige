import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { Building } from "./Building";
export class Flag extends Building {
    constructor() {
        super();
        this.classId = 'Flag';
        this.data("glowColor", "#ffcc00")
            .layer(1)
            .width(10)
            .height(20);
        if (isClient) {
            this.texture(ige.textures.get("flagSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Flag);
