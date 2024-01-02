import { IgeEntity } from "./IgeEntity.js";
import { IgeVelocityComponent } from "../components/IgeVelocityComponent.js";
import { arrPull } from "../utils.js";

export class IgeParticle extends IgeEntity {
	classId = "IgeParticle";
	_emitter;
	constructor(emitter) {
		super();
		this.noAabb(true);
		// Setup the particle default values
		this._emitter = emitter;
		this.addComponent("velocity", IgeVelocityComponent);
	}
	destroy() {
		// Remove ourselves from the emitter
		if (this._emitter !== undefined) {
			arrPull(this._emitter._particles, this);
		}
		return super.destroy();
	}
}
