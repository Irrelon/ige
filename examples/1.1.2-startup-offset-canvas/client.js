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
		self.gameTexture.fairy = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Load a smart texture
		self.gameTexture.simpleBox = new IgeTexture('../assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// We don't call this because we are going to provide our own canvas
			//ige.createFrontBuffer(true);

			// Provide our own canvas to the engine
			ige.canvas(document.getElementById('myOwnCanvas'), true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Load the base scene data
					ige.addGraph('IgeBaseScene');
					
					// Create an entity that will follow the mouse
					self.mouseEnt = new IgeEntity()
						.id('mouseEnt')
						.layer(2)
						.width(20)
						.height(20)
						.texture(self.gameTexture.simpleBox)
						.mount(ige.$('baseScene'));
					
					self.mousePosText = new IgeFontEntity()
						.layer(6)
						.textAlignX(1)
						.colorOverlay('#ffffff')
						.nativeFont('26pt Arial')
						.nativeStroke(5)
						.nativeStrokeColor('#333333')
						.textLineSpacing(0)
						.width(300)
						.height(40)
						.translateTo(0, 100, 0)
						.cache(false)
						.mount(ige.$('baseScene'));
					
					ige.input.on('mouseMove', function () {
						self.mouseEnt.translateToPoint(ige.mousePos());
						self.mousePosText.text('X: ' + self.mouseEnt._translate.x + ', Y: ' + self.mouseEnt._translate.y);
					});

					// Create an entity and mount it to the scene
					self.obj[0] = new Rotator()
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(self.gameTexture.fairy)
						.translateTo(0, 0, 0)
						.mouseEventsActive(true)
						.mount(ige.$('baseScene'));
					
					self.obj[0].on('mouseOver', function () {
						this.highlight(true);
						console.log('on');
					});
					
					self.obj[0].on('mouseOut', function () {
						this.highlight(false);
						console.log('off');
					});

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new Rotator()
						.id('fairy2')
						.depth(1)
						.width(50)
						.height(50)
						.texture(self.gameTexture.fairy)
						.translateTo(0, 50, 0)
						.mount(self.obj[0]);

					// Create a third rotator entity and mount
					// it to the first on at 0, -50 relative to the
					// parent, but assign it a smart texture!
					self.obj[2] = new Rotator()
						.id('simpleBox')
						.depth(1)
						.width(50)
						.height(50)
						.texture(self.gameTexture.simpleBox)
						.translateTo(0, -50, 0)
						.mount(self.obj[0]);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }