var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		var self = this;
		ige.showStats(1);
		ige.globalSmoothing(true);
		
		// Enable networking
		ige.addComponent(IgeSocketIoComponent);

		// Load our textures
		self.obj = [];

		// Load the fairy texture and store it in the gameTexture object
		self.gameTextures = new GameTextures();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.network.start('http://localhost:8000', function () {
						// Enable network stream handling
						ige.network.addComponent(IgeStreamComponent)
							.stream.renderLatency(400);
						
						// Create the base scene objects
						new Scene();
						
						// Ask the server to place us on a table
						ige.network.send('findTable');
					});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }