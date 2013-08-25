var Client = IgeClass.extend({
	classId: 'Client',
	
	init: function () {
		var self = this;
		ige.showStats(1);
		ige.input.debug(true);

		// Load our textures
		self.obj = [];

		// Load the fairy texture and store it in the gameTexture object
		self.gameTexture = {};
		self.gameTexture.fairy = new IgeTexture('./assets/textures/sprites/fairy.png');

		// Load a smart texture
		self.gameTexture.simpleBox = new IgeTexture('./assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create a base the scene to add further scenegraph
					// items to
					self.baseScene = new IgeScene2d()
						.id('baseScene');
			
					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.baseScene)
						.drawBounds(true)
						.mount(ige);
					
					// Add all the items in Scene1 to the scenegraph
					// (see gameClasses/Scene1.js :: addGraph() to see
					// the method being called by the engine and how
					// the items are added to the scenegraph)
					ige.addGraph('Scene1');
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }