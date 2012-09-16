var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);
		gameTexture[2] = new IgeCellSheet('../assets/textures/tiles/tilea5b.png', 8, 16);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 0)
			.box2d.createWorld();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.translateTo(0, 0, 0)
						.drawBounds(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(false)
						.mount(ige);

					ige.addComponent(IgeTiledComponent)
						.tiled.loadJson('maps/example.js', function (layerArray, layersById) {
							// The return data from the tiled component are two arguments,
							// the first is an array of IgeTextureMap instances, each one
							// representing one of the Tiled map's layers. The ID of each
							// instance is the same as the name assigned to the Tiled
							// layer it represents. The second argument contains the same
							// instances but each instance is stored in a property that is
							// named after the layer it represents so instead of having to
							// loop the array you can simply pick the layer you want via
							// the name assigned to it like layersById['layer name']

							// We can add all our layers to our main scene by looping the
							// array or we can pick a particular layer via the layersById
							// object. Let's give an example:
							var i;
							for (i = 0; i < layerArray.length; i++) {
								// Before we mount the layer we will adjust the size of
								// the layer's tiles because Tiled calculates tile width
								// based on the line from the left-most point to the
								// right-most point of a tile whereas IGE calculates the
								// tile width as the length of one side of the tile square.
								layerArray[i].tileWidth(50)
									.tileHeight(50)
									.mount(self.scene1);
							}

							// Or if we wanted to only use the "DirtLayer" from the example
							// map data, we could do this (the layer has already been mounted
							// from the loop above so this will not do anything unless that
							// loop is commented out):
							layersById.DirtLayer.mount(self.scene1);
						});

					// Now that we have our Tiled map data loaded and being rendered
					// we want to be able to walk around our new map. Let's create a
					// character, then set the camera to follow him!
					self.player1 = new Character()
						.addComponent(PlayerComponent)
						.box2dBody({
							type: 'dynamic',
							linearDamping: 0.0,
							angularDamping: 0.1,
							allowSleep: true,
							bullet: true,
							gravitic: true,
							fixedRotation: true,
							fixtures: [{
								density: 1.0,
								friction: 0.5,
								restitution: 0.2,
								shape: {
									type: 'polygon',
									data: new IgePoly2d()
										.addPoint(-0.5, 0.2)
										.addPoint(0.5, 0.2)
										.addPoint(0.5, 0.8)
										.addPoint(-0.5, 0.8)
								}
							}]
						})
						.id('player1')
						.setType(0)
						.translateTo(480, 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					// Translate the camera to the initial player position
					self.vp1.camera.lookAt(self.player1);

					// Tell the camera to track our player character with some
					// tracking smoothing (set to 20)
					self.vp1.camera.trackTranslate(self.player1, 20);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }