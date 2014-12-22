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

		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 0)
			.box2d.createWorld()
			.box2d.start();

		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
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

				// Create the texture maps and load their map data
				self.backgroundLayer1 = new IgeTextureMap()
					.id('backMap1')
					.depth(0)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0, 0)
					//.drawGrid(10)
					.drawBounds(false)
					.loadMap(BackgroundLayer1)
					.autoSection(20)
					.mount(self.scene1);

				self.staticObjectLayer1 = new IgeTextureMap()
					.id('backMap2')
					.depth(1)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0, 0)
					//.drawGrid(10)
					.drawBounds(false)
					.mount(self.scene1)
					.autoSection(20)
					.loadMap(StaticObjectLayer1);

				// Create a new character, add the player component
				// and then set the type (setType() is defined in
				// gameClasses/Character.js) so that the entity has
				// defined animation sequences to use.
				self.player1 = new Character()
					.addComponent(PlayerComponent)
					.id('player1')
					.setType(0)
					.translateTo(480, 300, 0)
					.drawBounds(false)
					.mount(self.scene1);

				// Translate the camera to the initial player position
				self.vp1.camera.lookAt(self.player1);

				// Tell the camera to track our player character with some
				// tracking smoothing (set to 20)
				self.vp1.camera.trackTranslate(self.player1, 20);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }