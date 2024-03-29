var Server = IgeClass.extend({
	classId: "Server",
	Server: true,

	init: function (options) {
		var self = this;
		ige.timeScale(1);

		// Define an object to hold references to our player entities
		this.players = {};

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
						ige.components.network.define("playerEntity", self._onPlayerEntity);

						ige.components.network.define("playerControlLeftDown", self._onPlayerLeftDown);
						ige.components.network.define("playerControlRightDown", self._onPlayerRightDown);
						ige.components.network.define("playerControlThrustDown", self._onPlayerThrustDown);

						ige.components.network.define("playerControlLeftUp", self._onPlayerLeftUp);
						ige.components.network.define("playerControlRightUp", self._onPlayerRightUp);
						ige.components.network.define("playerControlThrustUp", self._onPlayerThrustUp);

						ige.components.network.on("connect", self._onPlayerConnect); // Defined in ./gameClasses/ServerNetworkEvents.js
						ige.components.network.on("disconnect", self._onPlayerDisconnect); // Defined in ./gameClasses/ServerNetworkEvents.js

						// Add the network stream component
						ige.components.network
							.addComponent(IgeStreamComponent)
							.stream.sendInterval(30) // Send a stream update once every 30 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.components.network.acceptConnections(true);

						// Create the scene
						self.mainScene = new IgeScene2d().id("mainScene");

						// Create the scene
						self.scene1 = new IgeScene2d().id("scene1").mount(self.mainScene);

						// Create the main viewport and set the scene
						// it will "look" at as the new scene1 we just
						// created above
						self.vp1 = new IgeViewport()
							.id("vp1")
							.autoSize(true)
							.scene(self.mainScene)
							.drawBounds(true)
							.mount(ige);
					}
				});
			});
	}
});

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = Server;
}
