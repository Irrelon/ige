import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
import { registerClass } from "@/engine/igeClassStore";
import { Building } from "./Building";
export class Triangle extends Building {
    constructor() {
        super();
        this.classId = 'Triangle';
        this.data("glowColor", "#00ff00")
            .layer(1)
            .width(50)
            .height(50);
        if (isClient) {
            this.texture(ige.textures.get("triangleSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
registerClass(Triangle);
