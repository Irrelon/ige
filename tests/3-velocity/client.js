var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.scene1 = new IgeScene2d();
					self.scene1.mount(ige);

					self.obj[0] = tempObj = new IgeEntity();
					tempObj.addComponent(IgeVelocityComponent);
					tempObj.velocity.x(0.01);
					tempObj.depth(1);
					tempObj.geometry.x = 100;
					tempObj.geometry.y = 100;
					tempObj.texture(gameTexture[0]);
					tempObj.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }