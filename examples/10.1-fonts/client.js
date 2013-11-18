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
						.addComponent(IgeMousePanComponent)
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mousePan.enabled(true)
						.mount(ige);

					// Create an entity
					self.obj[0] = new IgeFontEntity()
						.id('font1')
						.depth(1)
						.width(213)
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
						.cache(true)
						.id('font4')
						.depth(1)
						.width(110)
						.height(50)
						.texture(gameTexture[1])
						.textAlignX(0)
						//.textAlignY(1)
						.textLineSpacing(-10)
						.autoWrap(true)
						.text('Verdana 10px and this is not a native font :)')
						.center(0)
						.top(0)
						.mount(self.scene1);
					
					console.log(self.obj[0].measureTextWidth());
					console.log(self.obj[3].measureTextWidth('hello'));
					
					var myTween = {
						x: 100
					};
					
					myTween.tween()
						.stepTo({x: 300}, 1000)
						.stepTo({x: 100}, 1000)
						.afterChange(function () {
							self.obj[3].width(myTween.x);
						})
						.start();
					
					var text = [],
						textInt = true;
					
					text[0] = 'hello';
					text[1] = 'goodbye';
					
					setInterval(function () {
						textInt = !textInt;
						self.obj[2].text(text[Number(textInt)]);
					}, 500);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }