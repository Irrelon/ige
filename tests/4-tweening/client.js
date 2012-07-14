var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj;

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
							var self = this;
							ige.tween.start(
								this._translate,
								{
									x: (Math.random() * 1200) - 600,
									y: (Math.random() * 600) - 300
								},
								7000,
								{
									easing:'outElastic',
									afterTween: function () {
										self.newTween();
									}
								}
							);

							ige.tween.start(
								this._rotate,
								{
									z: (Math.random() * 360) * Math.PI / 180
								},
								7000,
								{
									easing:'outElastic'
								}
							);
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

					for (var i = 0; i < 100; i++) {
						self.obj[0] = new RandomTweener()
							.id('fairy' + i)
							.depth(i)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.drawBounds(false)
							.mouseOver(function () {
								this.highlight(true);
								this.drawBounds(true);
								this.drawBoundsData(true);
							})
							.mouseOut(function () {
								this.highlight(false);
								this.drawBounds(false);
								this.drawBoundsData(false);
							})
							.mount(self.scene1);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }