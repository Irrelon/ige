var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			i, overFunc, outFunc;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					var Rotator = IgeEntity.extend({
						classId: 'Rotator',

						tick: function (ctx) {
							this.rotateBy(0, 0, 0.001 * ige._tickDelta * Math.PI / 180);
							IgeEntity.prototype.tick.call(this, ctx);
						}
					});

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

					self.obj[0] = new Rotator()
						.id('mt1')
						.depth(1)
						.width(20)
						.height(20)
						.translateBy(0, 0, 0)
						.texture(gameTexture[0])
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.drawBounds(false)
						.drawBoundsData(false)
						.mount(self.scene1);

					for (i = 1; i < 20; i++) {
						self.obj[i] = new Rotator()
							.depth(1)
							.width(20)
							.height(20)
							.translateBy(0, 15, 0)
							.texture(gameTexture[0])
							.mouseOver(overFunc)
							.mouseOut(outFunc)
							.drawBounds(false)
							.drawBoundsData(false)
							.mount(self.obj[i - 1]);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }