"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCuboid = void 0;
const IgeEntity_1 = require("../core/IgeEntity.js");
const IgeTexture_1 = require("../core/IgeTexture.js");
const IgeCuboidSmartTexture_1 = require("../textures/IgeCuboidSmartTexture.js");
class IgeCuboid extends IgeEntity_1.IgeEntity {
    constructor() {
        super();
        this.classId = "IgeCuboid";
        this.bounds3d(40, 40, 40);
        const tex = new IgeTexture_1.IgeTexture("igeCuboidSmartTexture", IgeCuboidSmartTexture_1.IgeCuboidSmartTexture);
        this.texture(tex);
    }
}
exports.IgeCuboid = IgeCuboid;
