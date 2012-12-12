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

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 0)
			.box2d.createWorld()
			.box2d.start();

		// Start the engine
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
					.depth(0)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0, 0)
					//.drawGrid(10)
					.drawBounds(false)
					.autoSection(20)
					.loadMap(BackgroundLayer1)
					.mount(self.scene1);

				self.staticObjectLayer1 = new IgeTextureMap()
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
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: true,
						gravitic: true,
						fixedRotation: true,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'polygon',
								data: new IgePoly2d()
									.addPoint(-0.5, 0.2)
									.addPoint(0.5, 0.2)
									.addPoint(0.5, 0.8)
									.addPoint(-0.5, 0.8)
							}
						}]
					})
					.id('player1')
					.setType(0)
					.translateTo(480, 300, 0)
					.drawBounds(false)
					.mount(self.scene1);

				// Create the room boundaries in box2d
				new IgeEntityBox2d()
					.translateTo(420, 130, 0)
					.width(880)
					.height(20)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(420, 510, 0)
					.width(880)
					.height(20)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(-30, 320, 0)
					.width(20)
					.height(400)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(870, 320, 0)
					.width(20)
					.height(400)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(440, 160, 0)
					.width(80)
					.height(40)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(780, 160, 0)
					.width(160)
					.height(40)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(80, 160, 0)
					.width(200)
					.height(40)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(60, 200, 0)
					.width(80)
					.height(40)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(180, 360, 0)
					.width(80)
					.height(40)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

				new IgeEntityBox2d()
					.translateTo(300, 395, 0)
					.width(80)
					.height(30)
					.drawBounds(true)
					//.mount(self.scene1)
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle'
							}
						}]
					});

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