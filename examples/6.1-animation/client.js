var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		//ige.debugEnabled(false);
		//ige.debugTiming(false);

		// Load our textures
		var self = this,
			tt, i,
			overFunc, outFunc;

		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Ask the engine to start and wait for a callback with a success flag
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

				overFunc = function () {
					this.highlight(true);
					this.drawBounds(true);
					this.drawBoundsData(true);
				};

				outFunc = function () {
					this.highlight(false);
					this.drawBounds(false);
					this.drawBoundsData(false);
				};

				for (i = 0; i < 1000; i++) {
					// Create a new character
					self.obj[i] = new RandomMovingCharacter()
						.setType(Math.random() * 8 | 0)
						.drawBounds(false)
						.drawBoundsData(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.walkTo(
							(Math.random() * ige._geometry.x) - ige._geometry.x2,
							(Math.random() * ige._geometry.y) - ige._geometry.y2
						)
						.mount(self.scene1);
				}
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }