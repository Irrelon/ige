"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlagBuilding = void 0;
const Building_1 = require("./base/Building");
const clientServer_1 = require("../../../engine/clientServer.js");
const igeClassStore_1 = require("../../../engine/igeClassStore.js");
const instance_1 = require("../../../engine/instance.js");
class FlagBuilding extends Building_1.Building {
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
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("flag"));
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
exports.FlagBuilding = FlagBuilding;
(0, igeClassStore_1.registerClass)(FlagBuilding);
