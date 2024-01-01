"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiningParticle = void 0;
const instance_1 = require("../../../../../engine/instance.js");
const IgeParticle_1 = require("../../../../../engine/core/IgeParticle.js");
const utils_1 = require("../../../../../engine/utils.js");
class MiningParticle extends IgeParticle_1.IgeParticle {
    constructor(emitter) {
        super(emitter);
        this.classId = "MiningParticle";
        // Setup the particle default values
        this.texture(instance_1.ige.textures.get("explosions1"))
            .cell(39)
            .width(15)
            .height(15)
            .layer(1)
            .category("MiningParticle");
        /*self.addComponent(IgeTextureAnimationComponent);
         self.animation
         .define('smoke', self.animation.generateFrameArray(32, 71), 25, -1)
         .cell(1);*/
        //self.animation.start('smoke');
    }
    destroy() {
        // Remove ourselves from the emitter
        if (this._emitter !== undefined) {
            (0, utils_1.arrPull)(this._emitter._particles, this);
        }
        //this.animation.stop();
        return super.destroy();
    }
}
exports.MiningParticle = MiningParticle;
