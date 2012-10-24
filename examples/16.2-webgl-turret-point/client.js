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

					self.vp1.camera.translateTo(0, 200, 500);

					ige.input.mapAction('rotateLeft', ige.input.key.left);
					ige.input.mapAction('rotateRight', ige.input.key.right);
					ige.input.mapAction('rotateLeft', ige.input.key.a);
					ige.input.mapAction('rotateRight', ige.input.key.d);

					// Create a mouse entity


					// Create a ship entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('ship0')
						.translateTo(0, 0, 0)
						.rotateTo(0, Math.radians(0), 0)
						.scaleTo(10, 10, 10)
						.material(new THREE.MeshFaceMaterial())
						.model(modelSpaceFrigate6)
						.addBehaviour('keyboardControl', function () {
							if (ige.input.actionState('rotateLeft')) {
								// Rotate the ship counter-clockwise
								this.rotateBy(0, 0, Math.radians(0.1 * ige.tickDelta));
							}

							if (ige.input.actionState('rotateRight')) {
								// Rotate the ship clockwise
								this.rotateBy(0, 0, Math.radians(-0.1 * ige.tickDelta));
							}
						})
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
							var projector = new THREE.Projector(),
								camera = self.vp1.camera._threeObj,
								mousePoint = ige.mousePos(),
								vector = new THREE.Vector3(
									((mousePoint.x + (window.innerWidth / 2)) / window.innerWidth) * 2 - 1,
									-((mousePoint.y + (window.innerHeight / 2)) / window.innerHeight) * 2 + 1,
									0
								),
								ray;
							//console.log(mousePoint.y, (mousePoint.y + (window.innerHeight / 2)));
							//console.log(vector.x, vector.y);

							projector.unprojectVector(vector, camera);
							//console.log(vector.x, vector.y);
							ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
							//console.log(ray);
							//ige.stop();
								//directionVector = {x: m[12] - mousePoint.x, y: (-m[13] - (m2[14] / m2[13]) - (mousePoint.y))},
								//rotateZ = Math.atan2(directionVector.x, directionVector.y);

							//this.rotateTo(0, 0, rotateZ - this._parent._rotate.z);
							this._parent.translateTo(ray.direction.x, ray.direction.y, 0);
						})
						.mount(self.obj[0]);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }