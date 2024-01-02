"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Flag = void 0;
const Building_1 = require("./Building");
const clientServer_1 = require("../../../../engine/clientServer.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const instance_1 = require("../../../../engine/instance.js");
class Flag extends Building_1.Building {
    constructor() {
        super();
        this.classId = "Flag";
        this.data("glowColor", "#ffcc00").layer(1).width(10).height(20);
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("flagSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
exports.Flag = Flag;
(0, igeClassStore_1.registerClass)(Flag);
