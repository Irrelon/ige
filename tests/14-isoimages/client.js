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
						.mode(1)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(10)
						.mount(self.scene1);

					// Create an entity
					self.obj[0] = new IgeCuboid()
						.mode(1)
						.depth(0)
						.width(40)
						.height(40)
						.origin(0, 0, 0)
						.mount(self.tileMap1)
						.texture(gameTexture[0])
						.widthByTile(1)
						.heightByTile(1)
						.size3d(40, 40, 120)
						.translateToTile(0, 0, 0)
						.opacity(0.9);

					self.obj[0] = new IgeCuboid()
						.mode(1)
						.depth(0)
						.width(40)
						.height(40)
						.origin(0, 0, 0)
						.mount(self.tileMap1)
						.texture(gameTexture[0])
						.widthByTile(1)
						.heightByTile(1)
						.size3d(40, 40, 120)
						.translateToTile(1, 0, 0)
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