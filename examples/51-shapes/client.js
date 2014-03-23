var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		var self = this;
		//ige.input.debug(true);
		
		//ige.addComponent(IgeEditorComponent);
		ige.addComponent(IgeGamePadComponent);
		
		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 0)
			.box2d.createWorld()
			.box2d.mode(0)
			.box2d.start();

		// Load our textures
		self.obj = [];

		// Load the fairy texture and store it in the gameTexture object
		self.gameTexture = {
			fonts: {
				'default': new IgeFontSheet('./assets/textures/fonts/verdana_20px.png')
			},
			shapes: {
				square: new IgeTexture('./assets/textures/smartTextures/square.js')
			}
		};

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph('IgeBaseScene');

					// Create player
					self.player = new Player()
						.id('player')
						.depth(1)
						.texture(self.gameTexture.shapes.square)
						.translateTo(0, 0, 0)
						.mount(ige.$('baseScene'));
					
					self.spawnTarget();
				}
			});
		});
	},
	
	spawnTarget: function () {
		setTimeout(function () {
			new Square()
				.translateTo(
					(Math.random() * ige._aabb.width) - ige._bounds2d.x2,
					(Math.random() * ige._aabb.height) - ige._bounds2d.y2,
					0
				)
				.mount(ige.$('baseScene'))
				.ready();
		}, 500);
		
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }