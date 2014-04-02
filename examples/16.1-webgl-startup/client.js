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

				self.vp1.camera.translateTo(0, 50, 400);

				// Create a ship entity and mount it to the scene
				self.obj[0] = new Rotator(0, 0, -0.1)
					.id('ship0')
					//.texture(gameTexture[0])
					.translateTo(-200, -50, 0)
					.rotateTo(0, 0, 0)
					.scaleTo(10, 10, 10)
					.material(new THREE.MeshFaceMaterial())
					.model(modelSpaceFrigate6)
					.mount(self.scene1);

				// Create another ship entity and mount it to
				// the scene as well, this one will have a turret
				// mounted to it as below
				self.obj[1] = new Rotator(0, 0.1, 0)
					.id('ship1')
					//.texture(gameTexture[0])
					.translateTo(200, -50, 0)
					.rotateTo(0, 35 * Math.PI / 180, 0)
					.scaleTo(10, 10, 10)
					.material(new THREE.MeshFaceMaterial())
					.model(modelSpaceFrigate6)
					.mount(self.scene1);

				// Mount a turret to the second ship entity
				self.obj[2] = new IgeEntity()
					.id('turret1')
					.translateTo(0, 0, 1.8)
					.rotateTo(0, 0, 0)
					.scaleTo(0.1, 0.1, 0.1)
					.material(new THREE.MeshFaceMaterial())
					.model(modelTurret)
					.mount(self.obj[1]);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }