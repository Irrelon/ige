var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			overFunc, outFunc, i;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);

					// Define a function that will be called when the
					// mouse cursor moves over one of our entities
					overFunc = function () {
						this.highlight(true);
						this.drawBounds(true);
						this.drawBoundsData(true);
					};

					// Define a function that will be called when the
					// mouse cursor moves away from one of our entities
					outFunc = function () {
						this.highlight(false);
						this.drawBounds(false);
						this.drawBoundsData(false);
					};

					// Create 100 random tweening entities and add
					// mouse over and mouse out event listeners to
					// them based on the functions we defined above,
					// then add them to the scene!
					for (i = 0; i < 100; i++) {
						self.obj[0] = new RandomTweener()
							.id('fairy' + i)
							.depth(i)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.drawBounds(false)
							.drawBoundsData(false)
							.mouseOver(overFunc)
							.mouseOut(outFunc)
							.mount(self.scene1);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }