"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeCuboid = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
class IgeCuboid extends exports_1.IgeEntity {
    constructor() {
        super();
        this.classId = "IgeCuboid";
        this.bounds3d(40, 40, 40);
        const tex = new exports_2.IgeTexture("igeCuboidSmartTexture", exports_3.IgeCuboidSmartTexture);
        this.texture(tex);
    }
}
exports.IgeCuboid = IgeCuboid;
