var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;
		ige.timeScale(1);

		// Define an object to hold references to our player entities
		this.players = {};
		
		// Define an array to hold our tile data
		this.tileData = [];

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Create some network commands we will need
						ige.network.define('gameTiles', function (data, clientId, requestId) {
							console.log('Client gameTiles command received from client id "' + clientId + '" with data:', data);
							
							// Send the tile data back
							ige.network.response(requestId, self.tileData);
						});
						
						ige.network.define('playerEntity', self._onPlayerEntity);

						ige.network.define('playerControlLeftDown', self._onPlayerLeftDown);
						ige.network.define('playerControlRightDown', self._onPlayerRightDown);
						ige.network.define('playerControlUpDown', self._onPlayerUpDown);
						ige.network.define('playerControlDownDown', self._onPlayerDownDown);

						ige.network.define('playerControlLeftUp', self._onPlayerLeftUp);
						ige.network.define('playerControlRightUp', self._onPlayerRightUp);
						ige.network.define('playerControlUpUp', self._onPlayerUpUp);
						ige.network.define('playerControlDownUp', self._onPlayerDownUp);

						ige.network.on('connect', self._onPlayerConnect); // Defined in ./gameClasses/ServerNetworkEvents.js
						ige.network.on('disconnect', self._onPlayerDisconnect); // Defined in ./gameClasses/ServerNetworkEvents.js

						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(30) // Send a stream update once every 30 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.network.acceptConnections(true);

						// Create the scene
						self.mainScene = new IgeScene2d()
							.id('mainScene');

						self.backgroundScene = new IgeScene2d()
							.id('backgroundScene')
							.mount(self.mainScene);
						
						self.foregroundScene = new IgeScene2d()
							.id('foregroundScene')
							.mount(self.mainScene);

						// Create the main viewport and set the scene
						// it will "look" at as the new scene1 we just
						// created above
						self.vp1 = new IgeViewport()
							.id('vp1')
							.autoSize(true)
							.scene(self.mainScene)
							.drawBounds(true)
							.mount(ige);
						
						// Generate some random data for our background texture map
						// this data will be sent to the client when the server receives
						// a "gameTiles" network command
						var rand, x, y;
						for (x = 0; x < 20; x++) {
							for (y = 0; y < 20; y++) {
								rand = Math.ceil(Math.random() * 4);
								self.tileData[x] = self.tileData[x] || [];
								
								// We assign [0, rand] here as we are assuming that the
								// tile will use the textureIndex 0. If you assign different
								// textures to the client-side textureMap then want to use them
								// you will need to alter the 0 to whatever texture you want to use
								self.tileData[x][y] = [0, rand];
							}
						}
					}
				});
			});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }