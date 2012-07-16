var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					var Rotator = IgeEntity.extend({
						tick: function (ctx) {
							this.rotateBy(0, 0, 0.1 * ige.tickDelta * Math.PI / 180);
							this._super(ctx);
						}
					});

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						//.scene(self.scene1)
						.drawBounds(true)
						//.drawBoundsData(true)
						.mount(ige);

					// Create the scene
					self.scene1 = new IgeScene2d();

					self.vp1.scene(self.scene1);

					self.obj[0] = new Rotator()
						.id('mt1')
						.depth(1)
						.width(20)
						.height(20)
						.translateBy(80, 20, 0)
						.texture(gameTexture[0])
						.mount(self.scene1);
					//self.obj[0].rotateBy(0, 0, 45 * Math.PI / 180);

					self.obj[1] = new IgeEntity()
						.id('mt2')
						.depth(1)
						.width(20)
						.height(20)
						.translateBy(0, 20, 0)
						.texture(gameTexture[0])
						.mount(self.obj[0]);

					self.obj[2] = new IgeEntity()
						.id('mt3')
						.depth(1)
						.width(20)
						.height(20)
						.translateBy(0, 20, 0)
						.texture(gameTexture[0])
						.mount(self.obj[1]);

					self.obj[3] = new IgeEntity()
						.id('mt4')
						.depth(1)
						.width(20)
						.height(20)
						.translateBy(0, 20, 0)
						.texture(gameTexture[0])
						.mount(self.obj[2]);
/*
					//self.obj[0]._localMatrix._rotateOrigin = new IgePoint(-self.obj[0].geometry.x2, -self.obj[0].geometry.y2, 0);
					//self.obj[0]._localMatrix._scaleOrigin = new IgePoint(self.obj[0].geometry.x2, self.obj[0].geometry.y2, 0);
					self.obj[0].rotateBy(0, 0, 45 * Math.PI / 180);
					self.obj[1].rotateBy(0, 0, 45 * Math.PI / 180);
					self.obj[2].rotateBy(0, 0, 45 * Math.PI / 180);
					self.obj[3].rotateBy(0, 0, 45 * Math.PI / 180);

					//self.obj[0].scaleBy(2, 2);
					//self.obj[1]._localMatrix.scaleBy(0.5, 0.5);
					//self.obj[2]._localMatrix.scaleBy(0.5, 0.5);
					//self.obj[3]._localMatrix.scaleBy(0.5, 0.5);
					*/
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }