import { IgeEntity } from "../../../engine/core/IgeEntity.js"
import { ige } from "../../../engine/instance.js"
import { isClient } from "../../../engine/clientServer.js"
export class Grid extends IgeEntity {
    classId = "Grid";
    spacing = 100;
    constructor() {
        super();
        this.width(1000);
        this.height(1000);
        if (isClient) {
            this.texture(ige.textures.get("gridSmartTexture"));
        }
    }
}
