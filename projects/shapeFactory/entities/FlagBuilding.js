import { registerClass } from "../../../engine/igeClassStore.js";
import { isClient } from "../../../engine/clientServer.js";
import { ige } from "../../../engine/instance.js";
import { Building } from "./base/Building.js";
export class FlagBuilding extends Building {
    constructor(tileX = NaN, tileY = NaN) {
        super();
        this.classId = "FlagBuilding";
        this.tileX = tileX;
        this.tileY = tileY;
        this.layer(1);
        this.width(30);
        this.height(30);
        //this.data("glowColor", "#ffcc00");
        //this.data("glowSize", 30);
        //this.data("glowIntensity", 1);
        if (isClient) {
            this.texture(ige.textures.get("flag"));
            this.registerNetworkClass();
        }
        if (this.isometric()) {
            this.bounds3d(10, 10, 20);
        }
    }
    streamCreateConstructorArgs() {
        return [this.tileX, this.tileY];
    }
    _mounted(obj) {
        super._mounted(obj);
        if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
            this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
        }
    }
}
registerClass(FlagBuilding);