var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			overFunc, outFunc, i;

		this.obj = [];

		// Setup the tweening component on the engine
		ige.addComponent(IgeTweenComponent);

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Define a random-moving entity
					var RandomTweener = IgeInteractiveEntity.extend({
						init: function () {
							this._super();
							this.newTween();
						},

						newTween: function () {
							var self = this,
								tempScale = (Math.random() * 2);

							this.translate().tween()
								.duration(7000)
								.properties({
									x: (Math.random() * ige.geometry.x) - ige.geometry.x2,
									y: (Math.random() * ige.geometry.y) - ige.geometry.y2
								})
								.easing('outElastic')
								.afterTween(function () {
									self.newTween();
								})
								.start();

							this.rotate().tween()
								.duration(7000)
								.properties({z: (Math.random() * 360) * Math.PI / 180})
								.easing('outElastic')
								.start();
						}
					});

					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
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

					for (i = 0; i < 200; i++) {
						self.obj[0] = new RandomTweener()
							.id('fairy' + i)
							.depth(i)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.drawBounds(false)
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