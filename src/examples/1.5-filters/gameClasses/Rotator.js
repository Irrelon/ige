var Rotator = IgeEntity.extend({
	classId:'Rotator',

	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Rotate this entity by 0.1 degrees.
		//this.rotateBy(0, 0, (0.1 * ige._tickDelta) * Math.PI / 180);

		// Call the IgeEntity (super-class) tick() method
		IgeEntity.prototype.tick.call(this, ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }