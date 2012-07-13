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
		gameTexture[1] = new IgeCellSheet('../assets/textures/ui/icon_entity.png', 2, 1);

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
								this._translate,
								{
									x: (Math.random() * 1200) - 600,
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

					// Create the main parent scene
					self.scene1 = new IgeScene2d();
					self.vp1.scene(self.scene1);

					// Create the sprite scene
					self.scene2 = new IgeScene2d().depth(0);
					self.scene2.mount(self.scene1);

					// Create an entity
					self.obj[0] = new RandomTweener()
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene2);

					// Create the UI scene
					self.scene3 = new IgeSceneUi().depth(1);

					// Set the main viewport's scene
					self.scene3.mount(self.scene1);

					// Create a new UI entity
					// TODO: Make the entities change background color when mouseover
					self.obj[1] = new IgeUiEntity()
						.depth(0)
						.backgroundColor('#474747')
						.left(0)
						.top(0)
						.width('100%')
						.height(30)
						.borderBottomColor('#666666')
						//.borderRadius(25)
						.borderBottomWidth(1)
						.backgroundPosition(0, 0)
						//.backgroundImage(gameTexture[0], 'repeat-x')
						//.backgroundSize(20, 20)
						.mount(self.scene3);

					self.obj[2] = new IgeUiEntity()
						.depth(0)
						.backgroundColor('#282828')
						.left(0)
						.top(30)
						.width(50)
						.height('100%', -30)
						.borderRightColor('#666666')
						.borderRightWidth(1)
						.borderRadius(0)
						.mount(self.scene3);

					self.obj[3] = new IgeUiEntity()
						.depth(10)
						.center(0)
						.top(6)
						.width(40)
						.height(40)
						.cell(2)
						.backgroundImage(gameTexture[1], 'no-repeat')
						.mount(self.obj[2]);

				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }