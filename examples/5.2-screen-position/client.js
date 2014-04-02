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
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(self.gameTexture.fairy)
						.translateTo(0, 0, 0)
						.mount(self.scene1)
						.mouseOver(function () {
							var infoBox = document.getElementById('infoBox');
							if (!infoBox) {
								var infoBox = document.createElement('div');
								
								infoBox.id = 'infoBox';
								infoBox.style.display = 'block';
								infoBox.style.position = 'absolute';
								infoBox.style.width = '200px';
								infoBox.style.height = '140px';
								infoBox.style.marginLeft = '-100px';
								infoBox.style.marginTop = '-70px';
								infoBox.style.backgroundColor = '#333333';
								
								document.body.appendChild(infoBox);
							}
							
							// Get the screen position of the entity
							var entScreenPos = this.screenPosition();
							
							// Position the infobox and set content
							infoBox.style.top = entScreenPos.y + 'px';
							infoBox.style.left = entScreenPos.x + 'px';
							infoBox.innerHTML = this.id();
						})
						.mouseOut(function () {
							var infoBox = document.getElementById('infoBox');
							if (infoBox) {
								infoBox.parentNode.removeChild(infoBox);
							}
						});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }