"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Triangle = void 0;
const Building_1 = require("./Building");
const clientServer_1 = require("../../../../engine/clientServer.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const instance_1 = require("../../../../engine/instance.js");
class Triangle extends Building_1.Building {
    constructor() {
        super();
        this.classId = "Triangle";
        this.data("glowColor", "#00ff00").layer(1).width(50).height(50);
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("triangleSmartTexture"));
            this.registerNetworkClass();
        }
    }
}
exports.Triangle = Triangle;
(0, igeClassStore_1.registerClass)(Triangle);
