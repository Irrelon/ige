var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Implement our game object definitions (see ClientObjects.js)
		this.implement(ClientObjects);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.viewportDepth(true);

					// Create the scene
					self.scene1 = new IgeScene2d()
						.isometric(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					self.vp2 = new IgeViewport()
						.bottom(10)
						.left(10)
						.width(350)
						.height(200)
						.autoSize(false)
						.borderColor('#ffffff')
						//.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					var tileWidth = 60,
						tileHeight = 60;

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.isometric(true)
						.tileWidth(tileWidth)
						.tileHeight(tileHeight)
						.drawGrid(10)
						.mount(self.scene1);

					// Create an entity
					self.obj[0] = new self.Bank(
						self.tileMap1, // Mount to this object
						0, 0, // tile x and y
						1, 1 // tile width and height
					);
				}
			});
		});

		this.loadTextures();
	},

	loadTextures: function () {
		this.gameTexture.bank = new IgeTexture('../assets/textures/buildings/bank1.png');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }