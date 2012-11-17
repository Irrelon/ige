var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeFontSheet('../assets/textures/fonts/eater_26pt.png', 3);
		gameTexture[1] = new IgeFontSheet('../assets/textures/fonts/verdana_10px.png', 1);

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
							this.rotateBy(0, 0, (0.1 * ige._tickDelta) * Math.PI / 180);
							this._super(ctx);
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
						.mount(ige);

					// Create an entity
					new IgeFontEntity()
						.id('font1')
						.depth(1)
						.width(480)
						.height(110)
						.texture(gameTexture[0])
						.textAlignX(0)
						//.textAlignY(0)
						.textLineSpacing(-34)
						.text('Align Left\nAnother Line')
						.center(0)
						.middle(0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('font2')
						.depth(1)
						.width(480)
						.height(110)
						.texture(gameTexture[0])
						.textAlignX(1)
						//.textAlignY(1)
						.textLineSpacing(-34)
						.text('Align Center\nAnother Line')
						.center(0)
						.middle(110)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('font3')
						.depth(1)
						.width(480)
						.height(110)
						.texture(gameTexture[0])
						.textAlignX(2)
						//.textAlignY(2)
						.textLineSpacing(-34)
						.text('Align Right\nAnother Line')
						.center(0)
						.middle(220)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('font4')
						.depth(1)
						.width(200)
						.height(30)
						.texture(gameTexture[1])
						.textAlignX(1)
						//.textAlignY(1)
						.textLineSpacing(0)
						.text('Verdana 10px')
						.center(0)
						.top(0)
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }