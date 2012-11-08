var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			Player, x;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/buildings/bank1.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige)
						.camera.translateTo(-50, 30, 0);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(0)
						.drawBounds(false)
						.drawBoundsData(false)
						.isometricMounts(true)
						.mount(self.scene1);

					// Create an entity
					// Plinth 1
					x = -140;
					self.obj[0] = new IgeEntity()
						.id(1)
						.isometric(true)
						.depth(0)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.size3d(160, 240, 40)
						.opacity(0.95);

					self.obj[1] = new IgeEntity()
						.id(2)
						.isometric(true)
						.depth(1)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95);

					self.obj[2] = new IgeEntity()
						.id(3)
						.isometric(true)
						.depth(2)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95);

					self.obj[3] = new IgeEntity()
						.id(4)
						.isometric(true)
						.depth(4)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.size3d(40, 160, 40)
						.opacity(0.95);

					// Center column
					self.obj[4] = new IgeEntity()
						.id(5)
						.isometric(true)
						.depth(5)
						.mount(self.tileMap1)
						.translateTo(0, 0, 0)
						.size3d(40, 380, 120)
						.opacity(0.95);

					// Plinth 2
					x = 140;
					self.obj[5] = new IgeEntity()
						.id(6)
						.isometric(true)
						.depth(6)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.size3d(160, 240, 40)
						.opacity(0.95);

					self.obj[6] = new IgeEntity()
						.id(7)
						.isometric(true)
						.depth(7)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95);

					self.obj[7] = new IgeEntity()
						.id(8)
						.isometric(true)
						.depth(8)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95);

					self.obj[8] = new IgeEntity()
						.id(9)
						.isometric(true)
						.depth(9)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.size3d(40, 160, 40)
						.opacity(0.95);

					// Big slab on top
					self.obj[9] = new IgeEntity()
						.id(10)
						.isometric(true)
						.depth(10)
						.mount(self.tileMap1)
						.size3d(360, 10, 20)
						.translateTo(0, 0, 120)
						.opacity(0.95);

					// Building
					self.obj[10] = new IgeEntity()
						.id(11)
						.isometric(true)
						.depth(11)
						.mount(self.tileMap1)
						.translateTo(0, 300, 0)
						.size3d(80, 80, 40)
						.opacity(0.95);

					self.obj[11] = new IgeEntity()
						.id(12)
						.isometric(true)
						.depth(12)
						.mount(self.tileMap1)
						.translateTo(0, 300, 40)
						.size3d(70, 70, 40)
						.opacity(0.95);

					self.obj[12] = new IgeEntity()
						.id(13)
						.isometric(true)
						.depth(13)
						.mount(self.tileMap1)
						.translateTo(0, 300, 80)
						.size3d(10, 10, 120)
						.opacity(0.95);

					self.obj[13] = new IgeEntity()
						.id(14)
						.isometric(true)
						.depth(14)
						.mount(self.tileMap1)
						.translateTo(0, 300, 200)
						.size3d(200, 200, 10)
						.opacity(0.95);

					self.obj[14] = new IgeEntity()
						.addComponent(IgeVelocityComponent)
						.addComponent(PlayerComponent)
						.id(15)
						.isometric(true)
						.depth(15)
						.mount(self.tileMap1)
						.translateTo(300, 300, 0)
						.size3d(20, 20, 80)
						.opacity(0.95);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }