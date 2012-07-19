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
							this.input.map('walkLeft', this.input.key.left);
							this.input.map('walkRight', this.input.key.right);
							this.input.map('walkUp', this.input.key.up);
							this.input.map('walkDown', this.input.key.down);
						},

						tick: function (ctx) {
							if (this.input.action('walkLeft')) {
								this.translateBy(-2, 0, 0);
							} else if (this.input.action('walkRight')) {
								this.translateBy(2, 0, 0);
							} else if (this.input.action('walkUp')) {
								this.translateBy(0, -2, 0);
							} else if (this.input.action('walkDown')) {
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
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(0)
						.isometric(true)
						.drawBounds(false)
						.drawBoundsData(false)
						.mount(self.scene1);

					// Create an entity
					self.obj[0] = new IgeCuboid()
						.id(1)
						.isometric(true)
						.mount(self.tileMap1)
						.translateTo(0, 0, 0)
						.size3d(160, 240, 30)
						.opacity(0.95)
						.isometric(true);

					self.obj[1] = new IgeCuboid()
						.id(2)
						.isometric(true)
						.mount(self.obj[0])
						.translateTo(0, 0, 0)
						.size3d(40, 40, 40)
						.opacity(0.95)
						.isometric(true);

					self.obj[14] = new Player()
						.id(15)
						.isometric(true)
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