import { IgeEntity } from "../../../engine/core/IgeEntity.js";
import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
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
