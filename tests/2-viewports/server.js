var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function () {
		// Start the network server
		ige.addComponent(IgeSocketIoComponent);
		ige.network.start();

		var texture1 = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Start the game engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Accept incoming connections
				ige.network.acceptConnections(true);

				var scene1 = new IgeScene2d();
				var vp1 = new IgeViewport()
					.scene(scene1)
					.mount(ige);

				var entity1 = new IgeEntity()
					.texture(texture1)
					.mount(scene1);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }