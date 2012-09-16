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
			ige.viewportDepth(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.mainScene = new IgeScene2d()
						.id('mainScene')
						.translateTo(0, 0, 0)
						.drawBounds(false);

					self.backScene = new IgeScene2d()
						.id('backScene')
						.depth(0)
						.mount(self.mainScene);

					self.objectScene = new IgeScene2d()
						.id('objectScene')
						.depth(1)
						.isometricMounts(true)
						.mount(self.mainScene);

					// Add the box2d debug painter entity to the
					// scene
					ige.box2d.enableDebug(self.objectScene);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.depth(1)
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.mount(ige);

					// Create a second viewport
					self.vp2 = new IgeViewport()
						.id('vp2')
						.depth(2)
						.autoSize(false)
						.left(10)
						.top(10)
						.width(300)
						.height(150)
						.scene(self.mainScene)
						.drawBounds(false)
						.mount(ige);

					// Create the room boundaries in box2d
					new IgeEntityBox2d()
						.id('testBox')
						.translateTo(200, 200, 0)
						.width(40)
						.height(40)
						.drawBounds(true)
						//.mount(self.scene1)
						.box2dBody({
							type: 'static',
							allowSleep: true,
							fixtures: [{
								shape: {
									type: 'rectangle'
								}
							}]
						});

					// Let's create a character, then set the camera to follow him!
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
									type: 'rectangle'
								}
							}]
						})
						.id('player1')
						.setType(0)
						.drawBounds(false)
						.isometric(true) // Set to use isometric movement
						.translateTo(0, 0, 0)
						.mount(self.objectScene);

					// Translate the camera to the initial player position
					self.vp1.camera.lookAt(self.player1);
					self.vp2.camera.lookAt(self.player1);

					// Tell the camera to track our player character with some
					// tracking smoothing (set to 20)
					self.vp1.camera.trackTranslate(self.player1, 20);
					self.vp2.camera.trackTranslate(self.player1, 20);

					// Load the Tiled map data and handle the return data
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
								layerArray[i]
									.tileWidth(50)
									.tileHeight(50)
									.renderArea(0, 0, 20, 20) // Set the area of the map to render by default
									.trackTranslate(self.player1) // Use this entity as the center of the render area
									//.isometricMounts(false)
									.mount(self.backScene);
							}

							// Or if we wanted to only use the "DirtLayer" from the example
							// map data, we could do this:
							//layersById.DirtLayer.mount(self.mainScene);
						});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }