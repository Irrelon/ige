var Rotator = IgeEntity.extend({
	classId:'Rotator',

	init: function (x, y, z) {
		this._super();
		this._rotationX = x;
		this._rotationY = y;
		this._rotationZ = z;
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Rotate this entity by 0.1 degrees.
		this.rotateBy(
			(this._rotationX * ige.tickDelta) * Math.PI / 180,
			(this._rotationY * ige.tickDelta) * Math.PI / 180,
			(this._rotationZ * ige.tickDelta) * Math.PI / 180
		);

		// Call the IgeEntity (super-class) tick() method
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }