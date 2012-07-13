var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

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

					// Create an entity
					self.obj[0] = new RandomTweener()
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene1);

					// Create the scene
					self.scene2 = new IgeSceneUi();

					// Set the main viewport's scene
					self.scene2.mount(self.scene1);
					self.vp1.scene(self.scene1);

					// Create a new UI entity
					for (var i = 0; i < 400; i++) {
						self.obj[i] = new IgeUiEntity()
							//.backgroundColor('#ffffff')
							.center(0)
							.middle(0)
							.width(200)
							.height(100)
							.borderColor('#ff0000')
							.borderRadius(0)
							.borderWidth(2)
							.backgroundPosition(0, 0)
							.backgroundImage(gameTexture[0], 'repeat')
							.backgroundSize('100%', '100%')
							.mount(self.scene2);
					}
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }