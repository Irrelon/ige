var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Enable networking
		ige.addComponent(IgeSocketIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Ask the engine to start
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Start the networking (you can do this elsewhere if it
				// makes sense to connect to the server later on rather
				// than before the scene etc are created... maybe you want
				// a splash screen or a menu first? Then connect after you've
				// got a username or something?
				ige.network.start('http://localhost:2000', function () {
					// Enable chat - notice we do that here AFTER the network
					// has started. This is because the chat component registers
					// a number of new network commands and they will fail if
					// the client has not yet started the network and received
					// the list of accepted network commands from the server.
					ige.addComponent(IgeChatComponent);
				});
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }