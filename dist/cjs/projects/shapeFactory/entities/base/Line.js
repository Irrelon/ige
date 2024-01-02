"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Line = void 0;
const GameEntity_1 = require("./GameEntity");
const clientServer_1 = require("../../../../engine/clientServer.js");
const IgeRect_1 = require("../../../../engine/core/IgeRect.js");
const igeClassStore_1 = require("../../../../engine/igeClassStore.js");
const instance_1 = require("../../../../engine/instance.js");
class Line extends GameEntity_1.GameEntity {
    constructor(x1, y1, x2, y2) {
        super();
        this.classId = "Line";
        if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
            this.setLine(x1, y1, x2, y2);
        }
    }
    setLine(x1, y1, x2, y2) {
        this._initVals = new IgeRect_1.IgeRect(x1, y1, x2, y2);
        this.data("glowColor", "#ff9100")
            .layer(0)
            .width(x2 - x1)
            .height(y2 - y1)
            .translateTo(x2 / 2 + x1 / 2, y2 / 2 + y1 / 2, 0);
        if (clientServer_1.isClient) {
            this.texture(instance_1.ige.textures.get("lineSmartTexture"));
        }
    }
}
exports.Line = Line;
(0, igeClassStore_1.registerClass)(Line);
