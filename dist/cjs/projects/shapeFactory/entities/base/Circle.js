"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Circle = void 0;
const instance_1 = require("@/engine/instance");
const clientServer_1 = require("@/engine/clientServer");
const igeClassStore_1 = require("@/engine/igeClassStore");
const GameEntity_1 = require("./GameEntity");
class Circle extends GameEntity_1.GameEntity {
    constructor() {
        super();
        this.classId = 'Circle';
        this.data("glowColor", "#c852ff")
            .width(50)
            .height(50);
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("circleSmartTexture"));
        }
    }
}
exports.Circle = Circle;
(0, igeClassStore_1.registerClass)(Circle);