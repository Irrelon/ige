var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

		// Enable networking
		ige.addComponent(IgeNetIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);
		gameTexture[2] = new IgeCellSheet('../assets/textures/tiles/tilea5b.png', 8, 16);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);
			ige.viewportDepth(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Start the networking (you can do this elsewhere if it
					// makes sense to connect to the server later on rather
					// than before the scene etc are created... maybe you want
					// a splash screen or a menu first? Then connect after you've
					// got a username or something?
					ige.network.start('http://localhost:2000', function () {
						ige.network.addComponent(IgeStreamComponent)
							.stream.renderLatency(160) // Render the simulation 160 milliseconds in the past
							// Create a listener that will fire whenever an entity
							// is created because of the incoming stream data
							.stream.on('entityCreated', function (entity) {
								this.log('Stream entity created with ID: ' + entity.id());
								if (entity._classId === 'Mover') {
									// Track this entity with the camera
									//self.vp1.camera.trackTranslate(entity, 10);
								}
							});
					});

					// Create the scene
					self.mainScene = new IgeScene2d()
						.id('mainScene')
						.translateTo(0, 0, 0)
						.drawBounds(false)
						.drawBoundsData(false);

					self.backScene = new IgeScene2d()
						.id('backScene')
						.depth(0)
						.drawBounds(false)
						.drawBoundsData(false)
						.mount(self.mainScene);

					self.objectLayer = new IgeTileMap2d()
						.id('objectLayer')
						.depth(1)
						.isometricMounts(true)
						.drawBounds(false)
						.drawBoundsData(false)
						.tileWidth(40)
						.tileHeight(40)
						.mount(self.mainScene);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.id('vp1')
						.depth(1)
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);

					/*// Let's create a character, then set the camera to follow him!
					self.player1 = new Character()
						.addComponent(PlayerComponent)
						.id('player1')
						.setType(0)
						.drawBounds(false)
						.drawBoundsData(false)
						.isometric(true) // Set to use isometric movement
						.translateTo(0, 0, 0)
						.mount(self.objectLayer);*/

					/*// Translate the camera to the initial player position
					self.vp1.camera.lookAt(self.player1);

					// Tell the camera to track our player character with some
					// tracking smoothing (set to 20)
					self.vp1.camera.trackTranslate(self.player1, 20);*/

					// Load the Tiled map data and handle the return data
					ige.addComponent(IgeTiledComponent)
						.tiled.loadJson(tiledExample1 /* you can also use a url: 'maps/example.js'*/, function (layerArray, layersById) {
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
									.tileWidth(40)
									.tileHeight(40)
									.autoSection(20)
									//.isometricMounts(false)
									.drawBounds(false)
									.drawBoundsData(false)
									.mount(self.backScene);
							}
						});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }