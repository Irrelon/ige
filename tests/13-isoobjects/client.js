var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			Player, x;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/buildings/bank1.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					Player = IgeCuboid.extend({
						init: function () {
							this._super();

							// Setup the control system
							ige.input.map('walkLeft', ige.input.key.left);
							ige.input.map('walkRight', ige.input.key.right);
							ige.input.map('walkUp', ige.input.key.up);
							ige.input.map('walkDown', ige.input.key.down);
						},

						tick: function (ctx) {
							if (ige.input.action('walkLeft')) {
								this.translateBy(-2, 0, 0);
							} else if (ige.input.action('walkRight')) {
								this.translateBy(2, 0, 0);
							} else if (ige.input.action('walkUp')) {
								this.translateBy(0, -2, 0);
							} else if (ige.input.action('walkDown')) {
								this.translateBy(0, 2, 0);
							} else {

							}

							this._super(ctx);
						}
					});

					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige)
						.camera.translateTo(-100, -50, 0);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(0)
						.isometric(true)
						.mount(self.scene1);

					// Create an entity
					// Plinth 1
					x = -140;
					self.obj[0] = new IgeCuboid()
						.id(1)
						.isometric(true)
						.depth(0)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.size3d(160, 240, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[1] = new IgeCuboid()
						.id(2)
						.isometric(true)
						.depth(1)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[2] = new IgeCuboid()
						.id(3)
						.isometric(true)
						.depth(2)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[3] = new IgeCuboid()
						.id(4)
						.isometric(true)
						.depth(4)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.size3d(40, 160, 40)
						.opacity(0.95)
						.isometric(true);

					// Center column
					self.obj[4] = new IgeCuboid()
						.id(5)
						.isometric(true)
						.depth(5)
						.mount(self.tileMap1)
						.translateTo(0, 0, 0)
						.size3d(40, 380, 120)
						.opacity(0.95)
						.isometric(true);

					// Plinth 2
					x = 140;
					self.obj[5] = new IgeCuboid()
						.id(6)
						.isometric(true)
						.depth(6)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.size3d(160, 240, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[6] = new IgeCuboid()
						.id(7)
						.isometric(true)
						.depth(7)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[7] = new IgeCuboid()
						.id(8)
						.isometric(true)
						.depth(8)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.size3d(40, 40, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[8] = new IgeCuboid()
						.id(9)
						.isometric(true)
						.depth(9)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.size3d(40, 160, 40)
						.opacity(0.95)
						.isometric(true);

					// Big slab on top
					self.obj[9] = new IgeCuboid()
						.id(10)
						.isometric(true)
						.depth(10)
						.mount(self.tileMap1)
						.size3d(360, 10, 20)
						.translateTo(0, 0, 120)
						.opacity(0.95);

					// Building
					self.obj[10] = new IgeCuboid()
						.id(11)
						.isometric(true)
						.depth(11)
						.mount(self.tileMap1)
						.translateTo(0, 300, 0)
						.size3d(80, 80, 40)
						.opacity(0.95);

					self.obj[11] = new IgeCuboid()
						.id(12)
						.isometric(true)
						.depth(12)
						.mount(self.tileMap1)
						.translateTo(0, 300, 40)
						.size3d(70, 70, 40)
						.opacity(0.95);

					self.obj[12] = new IgeCuboid()
						.id(13)
						.isometric(true)
						.depth(13)
						.mount(self.tileMap1)
						.translateTo(0, 300, 80)
						.size3d(10, 10, 120)
						.opacity(0.95)
						.isometric(true);

					self.obj[13] = new IgeCuboid()
						.id(14)
						.isometric(true)
						.depth(14)
						.mount(self.tileMap1)
						.translateTo(0, 300, 200)
						.size3d(200, 200, 10)
						.opacity(0.95)
						.isometric(true);

					self.obj[14] = new Player()
						.id(15)
						.isometric(true)
						.depth(15)
						.mount(self.tileMap1)
						.translateTo(300, 300, 0)
						.size3d(20, 20, 80)
						.opacity(0.95)
						.isometric(true);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }