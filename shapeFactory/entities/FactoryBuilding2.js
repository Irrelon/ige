import { registerClass } from "@/engine/igeClassStore";
import { isClient } from "@/engine/clientServer";
import { UiRequiresProducesDisplay } from "./UiRequiresProducesDisplay";
import { Building } from "./base/Building";
import { ige } from "@/engine/instance";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
export class FactoryBuilding2 extends Building {
    constructor(tileX = NaN, tileY = NaN, produces, requires = []) {
        super();
        this.classId = "FactoryBuilding2";
        this.tileXDelta = -1;
        this.tileYDelta = -1;
        this.tileW = 3;
        this.tileH = 3;
        this.tileX = tileX;
        this.tileY = tileY;
        this._produces = produces;
        this._requires = requires;
        this.layer(10);
        this.isometric(ige.data("isometric"));
        this.width(132);
        this.height(160);
        this.bounds3d(70, 80, 70);
        if (isClient) {
            this.uiResourceDisplay = new UiRequiresProducesDisplay(produces, requires).mount(this);
            this.texture(ige.textures.get("factory2"));
            this._textureOffset = new IgePoint2d(16, -10);
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
registerClass(FactoryBuilding2);
