import { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { isClient } from "@/engine/clientServer";
export class Grid extends IgeEntity {
    constructor() {
        super();
        this.classId = "Grid";
        this.spacing = 100;
        this.width(1000);
        this.height(1000);
        if (isClient) {
            this.texture(ige.textures.get("gridSmartTexture"));
        }
    }
}
