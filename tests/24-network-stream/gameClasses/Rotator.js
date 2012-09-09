var Rotator = IgeEntity.extend({
	classId: 'Rotator',

	init: function () {
		this._super();

		if (!ige.isServer) {
			// Define the texture this entity will use
			var tex = new IgeTexture('../assets/textures/sprites/fairy.png');

			// Wait for the texture to load
			tex.on('loaded', function () {
				self.texture(tex)
					.dimensionsFromCell();
			}, false, true);
		}

		// Define the data sections that will be included in the stream
		this.streamSections(['transform', 'custom1']);
	},

	/**
	 * Override the default IgeEntity class streamSectionData() method
	 * so that we can check for the custom1 section and return our
	 * own data to be included in the stream for that section.
	 * @param sectionId
	 * @return {*}
	 */
	streamSectionData: function (sectionId) {
		if (sectionId === 'custom1') {
			return this._customProperty;
		} else {
			return this._super(sectionId);
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Rotate this entity by 0.1 degrees.
		this.rotateBy(0, 0, (0.1 * ige.tickDelta) * Math.PI / 180);

		// Call the IgeEntity (super-class) tick() method
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }