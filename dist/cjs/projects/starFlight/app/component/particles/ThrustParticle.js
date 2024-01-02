"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrustParticle = void 0;
const instance_1 = require("../../../../../engine/instance.js");
const IgeParticle_1 = require("../../../../../engine/core/IgeParticle.js");
const utils_1 = require("../../../../../engine/utils.js");
class ThrustParticle extends IgeParticle_1.IgeParticle {
	constructor(emitter) {
		super(emitter);
		this.classId = "ThrustParticle";
		// Setup the particle default values
		this.texture(instance_1.ige.textures.get("explosions1"))
			.cell(9)
			.width(15)
			.height(15)
			.layer(2)
			.depth(2)
			.category("thrustParticle");
	}
	destroy() {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			(0, utils_1.arrPull)(this._emitter._particles, this);
		}
		return super.destroy();
	}
}
exports.ThrustParticle = ThrustParticle;
