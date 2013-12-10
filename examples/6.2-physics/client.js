var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 10)
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

				self.ball1 = new IgeEntityBox2d()
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: false,
						gravitic: true,
						fixedRotation: false,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'circle',
								data: {
									// The position of the fixture relative to the body
									x: 0,
									y: 0
								}
							}
						}]
					})
					.id('ball1')
					.translateTo(4, -300, 0)
					.drawBounds(true)
					.mount(self.scene1);

				self.ball2 = new IgeEntityBox2d()
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: false,
						gravitic: true,
						fixedRotation: false,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'circle'
							}
						}]
					})
					.id('ball2')
					.translateTo(0, -400, 0)
					.drawBounds(true)
					.mount(self.scene1);

				self.square1 = new IgeEntityBox2d()
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: false,
						gravitic: true,
						fixedRotation: false,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'rectangle'
							}
						}]
					})
					.id('square1')
					.translateTo(-40, -470, 0)
					.drawBounds(true)
					.mount(self.scene1);

				self.square2 = new IgeEntityBox2d()
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: false,
						gravitic: true,
						fixedRotation: false,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'rectangle'
							}
						}]
					})
					.id('square2')
					.translateTo(90, -560, 0)
					.drawBounds(true)
					.mount(self.scene1);

				// Create the room boundaries in box2d
				new IgeEntityBox2d()
					.translateTo(0, 50, 0)
					.width(880)
					.height(20)
					.drawBounds(true)
					.mount(self.scene1)
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

				// Add the box2d debug painter entity to the
				// scene to show the box2d body outlines
				ige.box2d.enableDebug(self.scene1);
				
				ige.addComponent(IgeEditorComponent);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }