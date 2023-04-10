import { registerClass } from "../../engine/igeClassStore.js";
import { isClient } from "../../engine/clientServer.js";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay.js";
import { Building } from "./base/Building.js";
import { ige } from "../../engine/instance.js";
import { IgePoint2d } from "../../engine/core/IgePoint2d.js";
export class FactoryBuilding1 extends Building {
    constructor(tileX = NaN, tileY = NaN, produces, requires = []) {
        super();
        this.classId = "FactoryBuilding1";
        this.tileXDelta = -1;
        this.tileYDelta = -1;
        this.tileW = 3;
        this.tileH = 3;
        this.tileX = tileX;
        this.tileY = tileY;
        this._produces = produces;
        this._requires = requires;
        this.layer(10);
        this.isometric(true);
        this.width(160);
        this.height(160);
        this.bounds3d(90, 90, 56);
        if (isClient) {
            new UiRequiresProducesDisplay(produces, requires).mount(this);
            this.texture(ige.textures.get("factory1"));
            this._textureOffset = new IgePoint2d(24, -16);
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
registerClass(FactoryBuilding1);
