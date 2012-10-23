var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Setup three.js interaction
		ige.renderContext('three');
		ige.addComponent(IgeThree);

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

			// Setup the input system to use events
			// from the three.js renderer canvas
			ige.input.setupListeners(ige.three._canvas);

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

					self.vp1.camera.translateTo(0, 50, 400);

					ige.input.mapAction('mouseX', ige.input.mouse.x);
					ige.input.mapAction('mouseY', ige.input.mouse.y);

					// Create a ship entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('ship0')
						.translateTo(0, 0, 0)
						.rotateTo(0, Math.radians(0), 0)
						.scaleTo(10, 10, 10)
						.material(new THREE.MeshFaceMaterial())
						.model(modelSpaceFrigate6)
						.mount(self.scene1);

					// Mount a turret to the ship entity
					self.obj[1] = new IgeEntity()
						.id('turret1')
						.translateTo(0, -2.6, 1.8)
						.rotateTo(0, 0, Math.radians(0))
						.scaleTo(0.1, 0.1, 0.1)
						.material(new THREE.MeshFaceMaterial())
						.model(modelTurret)
						.addBehaviour('lookAt', function () {
							// Make turret "look" at the mouse position
							var mx = ige.input.actionVal('mouseX'),
								my = ige.input.actionVal('mouseY');

							console.log(mx, my);
						})
						.mount(self.obj[0]);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }