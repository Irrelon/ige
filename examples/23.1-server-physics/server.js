var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		var self = this;

		// Add the server-side game methods / event handlers
		this.implement(ServerNetworkEvents);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 10)
			.box2d.createWorld();

		// Add the networking component
		ige.addComponent(IgeNetIoComponent)
			// Define a network command
			.network.define('test', self._onTest)
			// Start the network server
			.network.start(2000, function () {
				// Networking has started so start the game engine
				ige.start(function (success) {
					// Check if the engine started successfully
					if (success) {
						// Add the network stream component
						ige.network.addComponent(IgeStreamComponent)
							.stream.sendInterval(60) // Send a stream update once every 60 milliseconds
							.stream.start(); // Start the stream

						// Accept incoming network connections
						ige.network.acceptConnections(true);

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

						// Create the room boundaries in box2d
						new Floor()
							.id('floor')
							.translateTo(0, 50, 0)
							.width(880)
							.height(20)
							.drawBounds(true)
							.box2dBody({
								type: 'static',
								allowSleep: true,
								fixtures: [{
									shape: {
										type: 'rectangle'
									}
								}]
							})
							.streamMode(1)
							.mount(self.scene1);

						setInterval(self.newObject, 500);
					}
				});
			});
	},

	newObject: function () {
		var objType = Math.floor(Math.random() * 2),
			x = Math.floor(Math.random() * 400) - 200,
			y = -350;

		if (objType === 0) {
			new Circle()
				.translateTo(x, y, 0)
				.drawBounds(true)
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
				.streamMode(1)
				.lifeSpan(10000)
				.mount(ige.$('scene1'));
		}

		if (objType === 1) {
			new Square()
				.translateTo(x, y, 0)
				.drawBounds(true)
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
				.streamMode(1)
				.lifeSpan(10000)
				.mount(ige.$('scene1'));
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }