var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			overFunc, outFunc;

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

						self.obj[0] = new IgeEntity()
							.depth(10)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.drawBounds(false)
							.drawBoundsData(false)
							.mount(self.scene1);
						
						// fairy would straightly move to the target location if nothing else is defined
						self.obj[0]._translate.tween()
							.stepBy({
								x: 200,
								y: 300
							}, 1000, 'inOutSine')
							.stepBy({
								x: -200,
								y: -300
							}, 1000, 'inOutSine')
							.repeatMode(1, -1)
							.beforeStep(function() {
								// but we don't want her to just move there, we want her to jump there
								// The clue: Both tweens (vertical and horizontal movement) are running
								// the same time, looking like if the fairy jumped from a cliff!
								self.obj[0]._jumpTween();
							})
							.start();
						
						//the function of the fairy's vertical jump tween
						self.obj[0]._jumpTween = function() {
							self.obj[0]._translate.tween()
							.stepBy({
								y: -150
							}, 500, 'outSine')
							.stepBy({
								y: 150
							}, 500, 'inSine')
							.start();
						};
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }