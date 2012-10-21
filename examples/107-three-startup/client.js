var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
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

			// Setup the shaders
			//var shaders = new IgeWebGlShaderBasic(ige._ctx);

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

					self.vp1.camera.translateTo(0, 50, 200);

					// Create an entity and mount it to the scene
					self.obj[0] = new Rotator(0, 0, -0.1)
						.id('fairy0')
						.depth(1)
						.width(100)
						.height(100)
						//.texture(gameTexture[0])
						.translateTo(0, -50, 0)
						.rotateTo(0, 0, 0)
						.scaleTo(10, 10, 10)
						.material(new THREE.MeshFaceMaterial())
						.mesh('models/space_frigate_6.json')
						.mount(self.scene1);

					self.obj[1] = new Rotator(0, 0, 0.1)
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.translateTo(0, 50, 0)
						.rotateTo(0, 0, 0)
						.material(new THREE.MeshPhongMaterial({
							color: 0xa1592f,
							shininess: 1,
							specular: 10
						}))
						.mesh('models/fan.json')
						.mount(self.scene1);

					for (var k = 0; k < 100; k++) {
						new Rotator(0, 0, Math.random())
							.depth(1)
							.width(100)
							.height(100)
							.translateTo((Math.random() * 800) - 400, -50, 0)
							.rotateTo(0, 0, 0)
							.scaleTo(10, 10, 10)
							.material(new THREE.MeshFaceMaterial())
							.mesh('models/space_frigate_6.json')
							// TODO: Make models load in the ClientConfig.js file so we can pre-load them
							// TODO: Cache models so we only load one of a kind and then re-use the mesh
							.mount(self.scene1);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }