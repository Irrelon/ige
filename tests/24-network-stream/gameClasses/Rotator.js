var Rotator = IgeEntity.extend({
	classId: 'Rotator',

	init: function () {
		this._super();

		var self = this,
			tex;

		if (!ige.isServer) {
			// Define the texture this entity will use
			tex = new IgeTexture('../assets/textures/sprites/fairy.png');

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
	 * so that we can check for the custom1 section handle how we deal
	 * with it.
	 * @param {String} sectionId A string identifying the section to
	 * handle data get / set for.
	 * @param {*=} data If present, this is the data that has been sent
	 * from the server to the client for this entity.
	 * @return {String}
	 */
	streamSectionData: function (sectionId, data) {
		if (sectionId === 'custom1') {
			if (data) {
				// We have been given new data!
				this._customProperty = data;
			} else {
				// Return current data
				return this._customProperty;
			}
		} else {
			return this._super(sectionId, data);
		}
	},

	/**
	 * Called every frame by the engine when this entity is mounted to the
	 * scenegraph.
	 * @param ctx The canvas context to render to.
	 */
	tick: function (ctx) {
		// Only process rotation on the server, the stream will bring
		// transform updates to the client automatically
		if (ige.isServer) {
			// Rotate this entity by 0.1 degrees.
			this.rotateBy(0, 0, (0.1 * ige.tickDelta) * Math.PI / 180);
		}

		// Call the IgeEntity (super-class) tick() method
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Rotator; }