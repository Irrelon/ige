var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			x;

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

					// Create the physics world "ground"
					ige.cannon.createFloor(0, 0, 1);

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
					x = -140;
					self.obj[0] = new IgeEntityCannon()
						.id(1)
						.isometric(true)
						.depth(0)
						.mount(self.tileMap1)
						.translateTo(0, 0, 0)
						.bounds3d(160, 240, 40)
						.opacity(0.95)
						.cannonBody({
							type: 'static',
							mass: 0,
							fixtures: [{
								shape: {
									type: 'box'
								}
							}]
						});

					self.obj[14] = new IgeEntityCannon()
						.addComponent(IgeVelocityComponent)
						.addComponent(PlayerComponent)
						.id(15)
						.isometric(true)
						.depth(15)
						.mount(self.tileMap1)
						.translateTo(150, 90, 0)
						.bounds3d(40, 40, 10)
						.opacity(0.95)
						.cannonBody({
							type: 'dynamic',
							mass: 1,
							angularDamping: 1.0,
							linearDamping: 0.05,
							allowSleep: true,
							sleepSpeedLimit: 0.1,
							sleepTimeLimit: 1000,
							fixtures: [{
								shape: {
									type: 'box'
								}
							}]
						});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }