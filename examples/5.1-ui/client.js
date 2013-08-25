var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		// Setup the tweening component on the engine
		ige.addComponent(IgeTweenComponent);

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');
		gameTexture[1] = new IgeCellSheet('../assets/textures/ui/icon_entity.png', 2, 1);
		gameTexture[2] = new IgeFontSheet('../assets/textures/fonts/verdana_12pt.png', 0);
		gameTexture[3] = new IgeFontSheet('../assets/textures/fonts/verdana_10pt.png', 0);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the main parent scene
					self.mainScene = new IgeScene2d()
						.id('mainScene');

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.drawBounds(false)
						.drawBoundsData(false)
						.drawCompositeBounds(false)
						.scene(self.mainScene)
						.camera.translateTo(200, 0, 0)
						//.camera.scaleTo(0.2, 0.2, 0.2)
						//.camera.rotateTo(0, 0, Math.radians(10))
						.mount(ige);

					// Create the sprite scene
					self.spriteScene = new IgeScene2d()
						.id('spriteScene')
						.depth(0)
						.mount(self.mainScene);

					// Create an entity
					self.obj[0] = new IgeEntity()
						.id('randomFairy1')
						.depth(1)
						.width(100)
						.height(100)
						.translateTo(450, 0, 0)
						.texture(gameTexture[0])
						.mouseOver(function () { this.highlight(true); this.drawBoundsData(true); })
						.mouseOut(function () { this.highlight(false); this.drawBoundsData(false); })
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.spriteScene);

					// Create the UI scene
					self.uiScene = new IgeScene2d()
						.id('uiScene')
						.depth(1)
						.ignoreCamera(true)
						.mount(self.mainScene);

					// Create a new UI entity
					self.obj[1] = new IgeUiEntity()
						.id('topBar')
						.depth(10)
						.backgroundColor('#474747')
						.left(0)
						.top(0)
						.width('100%')
						.height(30)
						.borderBottomColor('#666666')
						.borderBottomWidth(1)
						.backgroundPosition(0, 0)
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.uiScene);

					self.obj[2] = new IgeUiEntity()
						.id('leftBar')
						.depth(0)
						.backgroundColor('#282828')
						.left(0)
						.top(30)
						.width(50)
						.height('100%', false, -60)
						.borderRightColor('#666666')
						.borderRightWidth(1)
						.mouseOver(function () { this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
						.mouseOut(function () { this.backgroundColor('#282828'); ige.input.stopPropagation(); })
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.uiScene);

					self.obj[3] = new IgeUiEntity()
						.id('rightBar')
						.depth(0)
						.backgroundColor('#282828')
						.right(0)
						.top(30)
						.width(250)
						.height('100%', false, -60)
						.borderLeftColor('#666666')
						.borderLeftWidth(1)
						.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
						.mouseOut(function () {this.backgroundColor('#282828'); ige.input.stopPropagation(); })
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.uiScene);

					self.obj[4] = new IgeUiEntity()
						.id('entityButton')
						.depth(10)
						.center(0)
						.top(6)
						.width(40)
						.height(40)
						.cell(1)
						.backgroundImage(gameTexture[1], 'no-repeat')
						.mouseOver(function () { this.cell(2); ige.input.stopPropagation(); })
						.mouseOut(function () { this.cell(1); ige.input.stopPropagation(); })
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.obj[2]);

					self.obj[5] = new IgeUiEntity()
						.id('bottomBar')
						.depth(1)
						.backgroundColor('#474747')
						.left(0)
						.bottom(0)
						.width('100%')
						.height(30)
						.borderTopColor('#666666')
						.borderTopWidth(1)
						.backgroundPosition(0, 0)
						.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
						.mouseOut(function () {this.backgroundColor('#474747'); ige.input.stopPropagation(); })
						.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
						.mount(self.uiScene);

					var i, txBox;

					for (i = 0; i < 30; i++) {
						txBox = new IgeUiTextBox()
							.id('textBox' + i)
							.fontSheet(gameTexture[3])
							.backgroundColor('#000000')
							.borderColor('#ffffff')
							.borderWidth(1)
							.borderRadius(5)
							.left(100 + (320 * Math.floor(i / 15)))
							.middle(-210 + (30 * i) - (450 * Math.floor(i / 15)))
							.width(300)
							.height(24)
							//.cache(true)
							.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
							.mount(self.uiScene)
							.value('Type text to see text input!');

						if (i === 0) {
							txBox.focus(true);
						}
					}

					// Define some menu item methods
					var overFunc = function () {
							ige.input.stopPropagation();
							this.backgroundColor('#666666');
							this.open();
						},
						outFunc = function () {
							ige.input.stopPropagation();
							this.backgroundColor('');
							this.close();
						},
						upFunc = function () {
							ige.input.stopPropagation();
							console.log('Clicked' + this.menuData().text);
						};

					// Create a menu - menus are still in alpha and don't work yet
					/*self.obj[7] = new IgeUiMenu()
						.id('menu1')
						.depth(100)
						.fontSheet(gameTexture[3])
						.left(0)
						.top(0)
						.width(100)
						.height(30)
						.borderColor('#ffffff')
						//.borderWidth(1)
						.menuData([{
							text:'File',
							width: 34,
							mouseOver: overFunc,
							mouseOut: outFunc,
							mouseUp: upFunc,
							items: [{
								text: 'New...',
								width: 40,
								mouseUp: upFunc
							}, {
								text: 'Open...',
								width: 40,
								mouseUp: upFunc
							}, {
								text: 'Save',
								width: 40,
								mouseUp: upFunc
							}, {
								text: 'Save as...',
								width: 40,
								mouseUp: upFunc
							}]
						}, {
							text:'Multi',
							width: 40,
							mouseOver: overFunc,
							mouseOut: outFunc,
							mouseUp: upFunc,
							items: [{
								text: 'Child1',
								width: 40,
								mouseUp: upFunc,
								items: [{
									text: 'Child1_1',
									width: 40,
									mouseUp: upFunc
								}, {
									text: 'Child1_2',
									width: 40,
									mouseUp: upFunc
								}]
							}]
						}])
						.mount(self.uiScene);*/
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }