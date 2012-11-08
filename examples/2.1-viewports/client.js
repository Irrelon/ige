var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj,
			vp = [],
			tt = 0,
			vpCount = 3,
			timeInc = 1200,
			i;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Enable depth sorting for viewports
					ige.viewportDepth(true);

					// Create our main scene
					self.scene1 = new IgeScene2d()
						.id('scene1');;

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.drawBounds(true)
						.scene(self.scene1)
						.mount(ige);

					// Make a load of viewports
					for (i = 0; i < vpCount; i++) {
						vp[i] = new IgeViewport()
							.center(-300)
							.middle(0)
							.width(150)
							.height(75)
							.autoSize(false)
							.borderColor('#ffffff')
							.originTo(0, 0, 0)
							.camera.scaleTo(0.5, 0.5, 0.5)
							.depth((18 - i))
							.scene(self.scene1);

						setTimeout((function () { var vr = vp[i]; return function () { vr.addBehaviour('rotator', RotatorBehaviour); }; }()), tt);
						tt += timeInc;
						vp[i].mount(ige);
					}

					tt = 0;
					for (var i = 0; i < vpCount; i++) {
						vp[i] = new IgeViewport()
							.center(300)
							.middle(0)
							.width(150)
							.height(75)
							.autoSize(false)
							.borderColor('#ffffff')
							.originTo(1, 1, 0)
							.camera.scaleTo(0.5, 0.5, 0.5)
							.depth((18 - i))
							.scene(self.scene1);

						setTimeout(function () { var vr = vp[i]; return function () { vr.addBehaviour('rotator', RotatorBehaviourAC); }}(), tt);
						tt += timeInc;
						vp[i].mount(ige);
					}

					// Corner viewports
					new IgeViewport()
						.id('top-left')
						.left(0)
						.top(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('top-right')
						.right(0)
						.top(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('bottom-right')
						.right(0)
						.bottom(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('bottom-left')
						.left(0)
						.bottom(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('center-top')
						.center(0)
						.top(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('center-bottom')
						.center(0)
						.bottom(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('left-middle')
						.left(0)
						.middle(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					new IgeViewport()
						.id('right-middle')
						.right(0)
						.middle(0)
						.width(150)
						.height(75)
						.autoSize(false)
						.borderColor('#ffffff')
						.camera.scaleTo(0.5, 0.5, 0.5)
						.depth(1)
						.scene(self.scene1)
						.mount(ige);

					// Make a couple of rotating entities to add to
					// our scene
					self.obj[0] = new IgeEntity()
						.addBehaviour('rotator', RotatorBehaviour)
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene1);

					self.obj[1] = tempObj = new IgeEntity()
						.addBehaviour('scaler', ScalerBehaviour)
						.addBehaviour('rotator', RotatorBehaviourAC)
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }