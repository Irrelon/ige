var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		ige.input.debug(true);

		// Load the fairy texture and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Load a smart texture
		gameTexture[1] = new IgeTexture('../assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					self.vp1.camera.translateTo(100, 20, 0);
					self.vp1.camera.scaleTo(2, 2, 2);

					// Create an entity and mount it to the scene
					self.obj[0] = new Rotator()
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.translateTo(0, 0, 0)
						.rotateTo(0, 0, Math.radians(180))
						.mount(self.scene1);

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new Rotator()
						.id('fairy2')
						.depth(1)
						.width(50)
						.height(50)
						.texture(gameTexture[0])
						.translateTo(0, 50, 0)
						.rotateTo(0, 0, Math.radians(90))
						.mouseMove(function () {
							// Get the mouse position relative to the center
							// of this entity
							var mp = this.mousePos();

							// Convert the mouse position from the entity's
							// local co-ordinates to the world co-ordinates
							this.localToWorldPoint(mp);

							// Move the "mouse" entity to the new world
							// co-ordinates
							self.obj[2].translateTo(mp.x, mp.y, 0);
						})
						.mount(self.obj[0]);

					// Create a simplebox entity and mount it to the
					// main scene
					self.obj[2] = new IgeEntity()
						.id('mouse')
						.depth(2)
						.width(10)
						.height(10)
						.texture(gameTexture[1])
						.translateTo(0, 0, 0)
						.mount(self.scene1);

					// Add some watch variables
					ige.watch("ige.mousePos().x");
					ige.watch("ige.mousePos().y");

					ige.watch("ige._currentViewport.mousePos().x");
					ige.watch("ige._currentViewport2.mousePos().y");

					ige.watch("ige.$('fairy2').mousePos().x");
					ige.watch("ige.$('fairy2').mousePos().y");
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }