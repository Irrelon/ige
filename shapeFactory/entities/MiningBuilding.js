import { registerClass } from "../../engine/igeClassStore.js";
import { Star } from "./base/Star.js";
import { isClient } from "../../engine/clientServer.js";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay.js";
import { ige } from "../../engine/instance.js";
export class MiningBuilding extends Star {
    constructor(tileX = NaN, tileY = NaN, produces, requires = []) {
        super();
        this.classId = "MiningBuilding";
        this.tileX = tileX;
        this.tileY = tileY;
        this._produces = produces;
        this._requires = requires;
        this.layer(10);
        this.isometric(true);
        this.width(80);
        this.height(100);
        this.bounds3d(40, 40, 50);
        if (isClient) {
            new UiRequiresProducesDisplay(produces, requires).mount(this);
            this.texture(ige.textures.get("mine"));
        }
    }
    streamCreateConstructorArgs() {
        return [this.tileX, this.tileY, this._produces, this._requires];
    }
    _mounted(obj) {
        super._mounted(obj);
        if (!isNaN(this.tileX) && !isNaN(this.tileY)) {
            this.occupyTile(this.tileX + this.tileXDelta, this.tileY + this.tileYDelta, this.tileW, this.tileH);
        }
    }
}
registerClass(MiningBuilding);
