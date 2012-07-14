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
					// Create the main parent scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						//.drawBounds(true)
						//.drawBoundsData(true)
						.scene(self.scene1)
						.mount(ige);

					// Create the sprite scene
					self.scene2 = new IgeScene2d().depth(0);
					self.scene2.mount(self.scene1);

					// Create an entity
					self.obj[0] = new IgeInteractiveEntity()
						.id('randomFairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mouseOver(function () { this.highlight(true); this.drawBoundsData(true); })
						.mouseOut(function () { this.highlight(false); this.drawBoundsData(false); })
						.mount(self.scene2);

					// Create the UI scene
					self.scene3 = new IgeScene2d()
						.depth(1)
						.mount(self.scene1);

					// Create a new UI entity
					// TODO: Make the entities change background color when mouseover
					self.obj[1] = new IgeUiEntity()
						.id('topBar')
						.depth(1)
						.backgroundColor('#474747')
						.left(0)
						.top(0)
						.width('100%')
						.height(30)
						.borderBottomColor('#666666')
						.borderBottomWidth(1)
						.backgroundPosition(0, 0)
						.mount(self.scene3);

					self.obj[2] = new IgeUiEntity()
						.id('leftBar')
						.depth(0)
						.backgroundColor('#282828')
						.left(0)
						.top(30)
						.width(50)
						.height('100%', -60)
						.borderRightColor('#666666')
						.borderRightWidth(1)
						.mount(self.scene3);

					self.obj[3] = new IgeUiEntity()
						.id('rightBar')
						.depth(0)
						.backgroundColor('#282828')
						.right(0)
						.top(30)
						.width(250)
						.height('100%', -60)
						.borderLeftColor('#666666')
						.borderLeftWidth(1)
						.mount(self.scene3);

					self.obj[4] = new IgeUiEntity()
						.id('entityButton')
						.depth(10)
						.center(0)
						.top(6)
						.width(40)
						.height(40)
						.cell(1)
						.backgroundImage(gameTexture[1], 'no-repeat')
						.mouseOver(function () { this.cell(2); this.dirty(true); })
						.mouseOut(function () { this.cell(1); this.dirty(true); })
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
						.mount(self.scene3);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }