var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.globalSmoothing(true);

		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Create the scene
				self.mainScene = new IgeScene2d()
					.id('mainScene');

				self.objectScene = new IgeScene2d()
					.id('objectScene')
					.depth(0)
					.drawBounds(false)
					.mount(self.mainScene);

				self.uiScene = new IgeScene2d()
					.id('uiScene')
					.depth(1)
					.drawBounds(false)
					.ignoreCamera(true) // We don't want the UI scene to be affected by the viewport's camera
					.mount(self.mainScene);

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.id('vp1')
					.autoSize(true)
					.scene(self.mainScene)
					.drawMouse(true)
					.drawBounds(true)
					.mount(ige);

				// Create an isometric tile map
				self.tileMap1 = new IgeTileMap2d()
					.id('tileMap1')
					.tileWidth(40)
					.tileHeight(40)
					.drawGrid(3)
					.drawMouse(true)
					.drawBounds(false)
					.mount(self.objectScene);

				// Define a function that will be called when the
				// mouse cursor moves over one of our entities
				overFunc = function () {
					this.highlight(true);
					this.drawBounds(true);
					this.drawBoundsData(true);
				};

				// Define a function that will be called when the
				// mouse cursor moves away from one of our entities
				outFunc = function () {
					this.highlight(false);
					this.drawBounds(false);
					this.drawBoundsData(false);
				};

				self.player = new Character()
					.id('player')
					.addComponent(PlayerComponent)
					.drawBounds(false)
					.drawBoundsData(false)
					.setType(3)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.mount(self.tileMap1);

				// Create a UI entity so we can test if clicking the entity will stop
				// event propagation down to moving the player. If it's working correctly
				// the player won't move when the entity is clicked.
				self.button1 = new IgeUiEntity()
					.id('testUiEntity')
					.depth(1)
					.backgroundColor('#474747')
					.top(0)
					.left(0)
					.width('100%')
					.height(30)
					.borderTopColor('#666666')
					.borderTopWidth(1)
					.backgroundPosition(0, 0)
					.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
					.mouseOut(function () {this.backgroundColor('#474747'); ige.input.stopPropagation(); })
					.mouseMove(function () { ige.input.stopPropagation(); })
					.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
					.mount(self.uiScene);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }