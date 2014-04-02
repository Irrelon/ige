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

					for (i = 0; i < 10; i++) {
						self.obj[i] = new IgeEntity()
							.id('fairy' + i)
							.depth(i)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.drawBounds(false)
							.drawBoundsData(false)
							.opacity(0)
							.mount(self.scene1);

						self.obj[i]._translate.tween()
							.stepTo({
								x: 100 + (i * 20),
								y: 0 + (i * 20)
							}, 1000, 'inOutSine')
							.stepTo({
								x: 0,
								y: -100 - (i * 20)
							}, 1000, 'inOutSine')
							.stepTo({
								x: -100 - (i * 20),
								y: 100 + (i * 20)
							}, 1000, 'inOutSine')
							.beforeStep(function (tween, step) {
								console.log('beforeStep', step);
							})
							.afterStep(function (tween, step) {
								console.log('afterStep', step);
							})
							.repeatMode(1, -1)
							.startTime(ige._currentTime + i)
							.start();

						self.obj[i].tween()
							.properties({
								_opacity: 0.6
							})
							.duration(2000)
							.start();
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }