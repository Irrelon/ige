var Rotator = IgeEntity.extend({
	classId:'Rotator',

	init: function (speed) {
		IgeEntity.prototype.init.call(this);

		if (speed !== undefined) {
			this._rSpeed = speed;
		} else {
			this._rSpeed = 0;
		}
	},
	
	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context.
	 */
	update: function (ctx, tickDelta) {
		// Rotate this entity by 0.1 degrees.
		//this.rotateBy(0, 0, (this._rSpeed * ige._tickDelta) * Math.PI / 180);
		if (this._rSpeed) {
			this._rotate.z += (this._rSpeed * ige._tickDelta) * Math.PI / 180;
			this.cacheDirty(true);
		}
		
		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.update.call(this, ctx, tickDelta);
	},

	/**
	 * Called every time the entity requires rendering to a viewport.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }