var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function () {
		// Start the network server
		ige.addComponent(IgeSocketIoComponent);
		ige.network.start(2000);

		var texture1 = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Start the game engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Accept incoming connections
				ige.network.acceptConnections(true);

				// Main scene
				var scene1 = new IgeScene2d(),
					// Main Viewport
					vp1 = new IgeViewport()
						.scene(scene1)
						.mount(ige),
					// Some entities
					entity1 = new IgeEntity()
						.texture(texture1)
						.mount(scene1),
					entity2 = new IgeUiEntity()
						.left(0)
						.middle(10)
						.mount(scene1);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }