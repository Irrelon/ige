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
					var RandomTweener = IgeEntity.extend({
						init: function () {
							this._super();
							this.newTween();
						},

						newTween: function () {
							var self = this;
							ige.tween.start(
								this.transform._translate,
								{
									x: (Math.random() * 1000) - 500,
									y: (Math.random() * 600) - 300
								},
								1000,
								{
									easing:'outElastic',
									afterTween: function (gameObject) {
										self.newTween();
									}
								}
							);
						}
					});

					// Create the main viewport
					self.vp1 = new IgeViewport();
					self.vp1.mount(ige);

					// Create the scene
					self.scene1 = new IgeScene2d();
					self.vp1.scene(self.scene1);

					for (var i = 0; i < 100; i++) {
						self.obj[0] = new RandomTweener()
							.depth(i)
							.width(100)
							.height(100)
							.texture(gameTexture[0])
							.mount(self.scene1);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }