var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			x, TickEntity;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/buildings/bank1.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.isometric(true)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(10)
						.mount(self.scene1);

					// Create an entity
					self.obj[0] = new IgeCuboid()
						.isometric(true)
						.origin(0, 0, 0)
						.mount(self.tileMap1)
						.widthByTile(0.8)
						.heightByTile(0.8)
						.size3d(40, 40, 40)
						.translateToTile(0, 0, 0)
						.texture(gameTexture[0])
						.opacity(0.9);

					self.obj[0] = new IgeCuboid()
						.isometric(true)
						.origin(0, 0, 0)
						.mount(self.tileMap1)
						.widthByTile(0.8)
						.heightByTile(0.8)
						.size3d(40, 40, 40)
						.translateToTile(1, 0, 0)
						.texture(gameTexture[0])
						.opacity(0.9);
				}
			});
		});
	},

	cords: function () {
		for (var i = 0; i < this.obj.length; i++) {
			this.obj[i].cords();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }