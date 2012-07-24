var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.translateTo(0, -360);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(10)
						.isometric(true)
						.mount(self.scene1);

					// Create an entity
					self.obj[0] = new IgeEntity()
						.id('fairy1')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.translateToTile(0, 0)
						.widthByTile(1)
						.heightByTile(1);

					self.obj[1] = new IgeEntity()
						.id('fairy2')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.translateToTile(1, 0)
						.widthByTile(1)
						.heightByTile(1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }