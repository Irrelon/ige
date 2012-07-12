var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj;

		this.obj = [];

		// Setup the tweening component on the engine
		ige.addComponent(IgeTweenComponent);

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the main viewport
					self.vp1 = new IgeViewport();
					self.vp1.mount(ige);

					// Create the scene
					self.scene1 = new IgeScene2d();
					self.vp1.scene(self.scene1);

					self.obj[0] = tempObj = new IgeEntity();
					tempObj.depth(1);
					tempObj.geometry.x = 100;
					tempObj.geometry.y = 100;
					tempObj.texture(gameTexture[0]);
					tempObj.mount(self.scene1);
					ige.tween.start(tempObj.transform._translate, {x:100}, 1000, {easing:'outElastic'});

					self.obj[1] = tempObj = new IgeEntity();
					tempObj.depth(1);
					tempObj.geometry.x = 100;
					tempObj.geometry.y = 100;
					tempObj.texture(gameTexture[0]);
					tempObj.mount(self.scene1);
					ige.tween.start(tempObj.transform._translate, {x: -100, y: -100}, 1000, {easing:'outElastic'});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }