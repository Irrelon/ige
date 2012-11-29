var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 0)
			.box2d.createWorld()
			.box2d.start();

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
			// Start the network server
			.network.start(2000, function () {
				// Start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(120) // Send a stream update once every 30 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming connections
						ige.network.acceptConnections(true);

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
							.id('vp1')
							.depth(1)
							.autoSize(true)
							.scene(self.mainScene)
							.drawBounds(true)
							.drawBoundsData(true)
							.mount(ige);

						// Load the Tiled map data and handle the return data
						ige.addComponent(IgeTiledComponent)
							.tiled.loadJson(tiledExample1, function (layerArray, layersById) {
								var i, destTileX = - 1, destTileY = -1,
									tileChecker = function (tileData, tileX, tileY) {
										// If the map tile data is set, don't path along it
										return !tileData;
									};

								// Create static box2d objects from the dirt layer
								ige.box2d.staticsFromMap(layersById.DirtLayer);

								// Create a path-finder
								self.pathFinder = new IgePathFinder()
									.neighbourLimit(1000); // Set a high limit because we are using a large map

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
										.streamMode(1)
										.translateToTile(destTileX, destTileY, 0);

									destTileX = -1;
									destTileY = -1;
								}
							});
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }