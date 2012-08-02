var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Enable networking
		ige.addComponent(IgeSocketIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);

		this.log('Creating front buffer...');
		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Ask the engine to start
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				self.setupScene();
			}
		});
	},

	/**
	 * Create the basic engine elements of the game that we will need
	 * such as a background image and a tile map to add buildings to etc.
	 */
	setupScene: function () {
		// Create the scene that the main game items
		// will reside on
		this.mainScene = new IgeScene2d()
			.id('mainScene');

		// Create the main viewport and tell it to "look"
		// at gameScene with auto-sizing enabled to fill the
		// browser window
		this.vp1 = new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(this.mainScene)
			.drawBounds(false) // Switch this to true to draw all bounding boxes
			.drawBoundsData(true) // Switch to true (and flag above) to see bounds data
			.mount(ige);

		// Create the tile map
		this.tileMap1 = new IgeTileMap2d()
			.id('tileMap1')
			.layer(2)
			.tileWidth(40)
			.tileHeight(40)
			.drawGrid(40)
			.highlightOccupied(false)
			.translateTo(0, 0, 0)
			.mount(this.mainScene);

		this.log('Scene setup complete!');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }