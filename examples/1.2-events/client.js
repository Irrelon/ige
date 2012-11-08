var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		// Load the fairy texture and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Load a smart texture
		gameTexture[1] = new IgeTexture('../assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create a new eventing class and an event listener
					var evClass = new IgeEventingClass(),
						testListener = function () { console.log('Test event fired');},
						ev;

					// Turn on the event listener
					ev = evClass.on('test', testListener);

					// Fire the new event - listener should fire
					evClass.emit('test');

					// Turn off the event listener
					evClass.off('test', ev);

					// Fire the new event again - listener should not fire this time
					evClass.emit('test');
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }