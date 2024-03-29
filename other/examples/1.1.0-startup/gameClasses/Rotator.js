import { isServer } from "../../../engine/clientServer.js";
import { IgeEntity } from "../../../engine/core/IgeEntity.js";
import { ige } from "../../../engine/instance.js";

export class Rotator extends IgeEntity {
	constructor (speed) {
		super();
		this.classId = "Rotator";
		this._rSpeed = 0;
		if (speed !== undefined) {
			this._rSpeed = speed;
		} else {
			this._rSpeed = 0;
		}
	}
	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick (ctx) {
		if (isServer) {
			// Rotate this entity by 0.1 degrees.
			this.rotateBy(0, 0, (this._rSpeed * ige.engine._tickDelta * Math.PI) / 180);
		}
		// Call the IgeEntity (super-class) tick() method
		super.tick(ctx);
	}
}
