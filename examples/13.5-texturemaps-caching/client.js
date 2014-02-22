var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

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
			.box2d.createWorld()
			.box2d.start();

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
						.drawMouse(true)
						.mount(self.mainScene);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.addComponent(IgeMouseZoomComponent)
						.mouseZoom.enabled(true)
						.depth(1)
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);
					
					//self.vp1.camera.scaleTo(0.5, 0.5, 0.5);

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
									type: 'rectangle',
									data: {
										width: 10,
										height: 10
									}
								}
							}]
						})
						.id('player1')
						.setType(0)
						.drawBounds(false)
						.drawBoundsData(false)
						.isometric(true) // Set to use isometric movement
						.translateTo(0, 0, 0)
						.mount(self.objectLayer);

					// Translate the camera to the initial player position
					self.vp1.camera.lookAt(self.player1);

					// Tell the camera to track our player character with some
					// tracking smoothing (set to 20)
					self.vp1.camera.trackTranslate(self.player1, 100);
					
					// Set the camera to round it's translate value to avoid sub-pixel rendering
					self.vp1.camera.trackTranslateRounding(true);

					// Load the Tiled map data and handle the return data
					ige.addComponent(IgeTiledComponent)
						.tiled.loadJson(tiledExample1, function (layerArray, layersById) {
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
							var i, destTileX = - 1, destTileY = -1,
								tileChecker = function (tileData, tileX, tileY) {
									// If the map tile data is set, don't path along it
									return !tileData;
								};

							for (i = 0; i < layerArray.length; i++) {
								// Before we mount the layer we will adjust the size of
								// the layer's tiles because Tiled calculates tile width
								// based on the line from the left-most point to the
								// right-most point of a tile whereas IGE calculates the
								// tile width as the length of one side of the tile square.
								layerArray[i]
									.tileWidth(40)
									.tileHeight(40)
									.drawBounds(false)
									.drawBoundsData(false)
									.autoSection(20)
									.drawSectionBounds(true)
									.mount(self.backScene);
							}

							// Or if we wanted to only use the "DirtLayer" from the example
							// map data, we could do this:
							//layersById.DirtLayer.mount(self.mainScene);

							// Create static box2d objects from the dirt layer
							ige.box2d.staticsFromMap(layersById.DirtLayer);

							// Create a path-finder
							self.pathFinder = new IgePathFinder()
								.neighbourLimit(100); // Set a low limit to only accept simple paths

							// Create a bunch of AI characters that will walk around the screen
							// using the path finder to find their way around. When they complete
							// a path they will choose a new random destination and path to it.
							// All the AI character code is in the gameClasses/CharacterAi.js
							for (i = 0; i < 20; i++) {
								// Pick a random tile for the entity to start on
								while (destTileX < 0 || destTileY < 0 || !layersById.DirtLayer.map._mapData[destTileY] || !tileChecker(layersById.DirtLayer.map._mapData[destTileY][destTileX])) {
									destTileX = Math.random() * 20 | 0;
									destTileY = Math.random() * 20 | 0;
								}

								new CharacterAi(layersById.DirtLayer, self.pathFinder)
									.id('aiEntity_' + i)
									.drawBounds(false)
									.drawBoundsData(false)
									.isometric(true) // Set to use isometric movement
									.mount(self.objectLayer)
									.translateToTile(destTileX, destTileY, 0);

								destTileX = -1;
								destTileY = -1;
							}
						});

					// Add the box2d debug painter entity to the
					// scene to show the box2d body outlines
					ige.box2d.enableDebug(self.objectLayer);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }