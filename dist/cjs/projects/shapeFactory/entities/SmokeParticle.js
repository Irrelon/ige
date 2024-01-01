"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmokeParticle = void 0;
const IgeParticle_1 = require("@/engine/core/IgeParticle");
const instance_1 = require("@/engine/instance");
class SmokeParticle extends IgeParticle_1.IgeParticle {
    constructor(emitter) {
        super(emitter);
        this.classId = 'SmokeParticle';
        // Setup the particle default values
        this.texture(instance_1.ige.textures.get("smoke"))
            .cell(1)
            .width(50)
            .height(50)
            .drawBounds(false)
            .drawBoundsData(false);
    }
}
exports.SmokeParticle = SmokeParticle;
