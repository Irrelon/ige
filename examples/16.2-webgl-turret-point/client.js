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

				self.vp1.camera.translateTo(0, 0, 500);

				ige.input.mapAction('rotateLeft', ige.input.key.left);
				ige.input.mapAction('rotateRight', ige.input.key.right);
				ige.input.mapAction('rotateLeft', ige.input.key.a);
				ige.input.mapAction('rotateRight', ige.input.key.d);

				self.plane = new IgeEntity()
					.id('plane')
					.translateTo(0, 0, 0)
					.rotateTo(0, 0, 0)
					.scaleTo(1, 1, 1)
					.mesh(new THREE.PlaneGeometry(window.innerWidth * 2, window.innerHeight * 2))
					.mount(self.scene1);

				// Create a ship entity and mount it to the scene
				self.obj[0] = new IgeEntity()
					.id('ship0')
					.translateTo(0, 250, 0)
					.rotateTo(0, Math.radians(0), 0)
					.scaleTo(4, 4, 4)
					.material(new THREE.MeshFaceMaterial())
					.model(modelSpaceFrigate6)
					.addBehaviour('keyboardControl', ShipControl)
					.mount(self.scene1);

				// Mount a turret to the ship entity
				self.obj[1] = new IgeEntity()
					.id('turret1')
					.translateTo(0, -2.6, 1.8)
					.rotateTo(0, 0, Math.radians(0))
					.scaleTo(0.2, 0.2, 0.2)
					.material(new THREE.MeshFaceMaterial())
					.model(modelTurret)
					.addBehaviour('mouseAim', TurretMouseAim)
					.mount(self.obj[0]);

				self.vp1.camera.trackTranslate(self.obj[0], 10);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }