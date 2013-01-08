var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		//ige.useManualTicks(true);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeFontSheet('../assets/textures/fonts/eater_26pt.png');
		gameTexture[1] = new IgeFontSheet('../assets/textures/fonts/verdana_10px.png');

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
						.mount(ige);

					// Create an entity
					self.obj[0] = new IgeFontEntity()
						.id('font1')
						.depth(1)
						.width(480)
						.height(110)
						.textAlignX(0)
						.colorOverlay('#ffffff')
						.nativeFont('26pt Arial')
						.nativeStroke(6)
						.nativeStrokeColor('#666666')
						.textLineSpacing(0)
						.text('Align Left\nAnother Line\nAnd one more')
						.center(0)
						.middle(0)
						.mount(self.scene1);

					self.obj[1] = new IgeFontEntity()
						.id('font2')
						.depth(1)
						.width(480)
						.height(110)
						.texture(gameTexture[0])
						.textAlignX(1)
						//.textAlignY(1)
						.colorOverlay('#00ff00')
						.textLineSpacing(-34)
						.text('Align Center\nAnother Line')
						.center(0)
						.middle(110)
						.mount(self.scene1);

					self.obj[2] = new IgeFontEntity()
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

					self.obj[3] = new IgeFontEntity()
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