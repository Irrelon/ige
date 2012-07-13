var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			tempObj,
			RotatorBehaviour,
			RotatorBehaviourAC,
			ScalerBehaviour,
			vp = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					RotatorBehaviour = function (ctx, gameObject) {
						gameObject.rotateBy(0, 0, (0.1 * ige.tickDelta) * Math.PI / 180);
					};

					RotatorBehaviourAC = function (ctx, gameObject) {
						gameObject.rotateBy(0, 0, (-0.1 * ige.tickDelta) * Math.PI / 180);
					};

					ScalerBehaviour = function (ctx, gameObject) {
						gameObject.data.scalerMode = gameObject.data.scalerMode || 1;

						if (gameObject.data.scalerMode === 1) {
							gameObject.scaleBy((0.001 * ige.tickDelta), (0.001 * ige.tickDelta), (0.001 * ige.tickDelta));

							if (gameObject._scale.x >= 4) {
								gameObject.data.scalerMode = 2;
								gameObject._scale.x = 4;
								gameObject._scale.y = 4;
								gameObject._scale.z = 4;
							}

							return;
						}

						if (gameObject.data.scalerMode === 2) {
							gameObject.scaleBy(-(0.001 * ige.tickDelta), -(0.001 * ige.tickDelta), -(0.001 * ige.tickDelta));

							if (gameObject._scale.x <= 1) {
								gameObject.data.scalerMode = 1;
								gameObject._scale.x = 1;
								gameObject._scale.y = 1;
								gameObject._scale.z = 1;
							}

							return;
						}
					};

					ige.viewportDepth(true);

					// Create the main viewport
					self.vp1 = new IgeViewport();
					self.vp1.mount(ige);

					self.scene1 = new IgeScene2d();
					self.vp1.scene(self.scene1);

					var tt = 0;
					for (var i = 0; i < 18; i++) {
						vp[i] = new IgeViewport({center:-300 + 75, middle:0, width:150, height:75, autoSize:false, borderStyle: '#ffffff'});
						vp[i].originTo(0, 0, 0);
						vp[i].camera.scaleTo(0.5, 0.5, 0.5);
						vp[i].depth((18 - i));
						vp[i].scene(self.scene1);

						setTimeout(function () { var vr = vp[i]; return function () { vr.addBehavior('rotator', RotatorBehaviour); }}(), tt);
						tt += 200;
						vp[i].mount(ige);
					}

					tt = 0;
					for (var i = 0; i < 18; i++) {
						vp[i] = new IgeViewport({
							center:300 + 75,
							middle:0,
							width:150,
							height:75,
							autoSize:false,
							borderStyle: '#ffffff'}
						)
						.originTo(0, 0, 0)
						.camera.scaleTo(0.5, 0.5, 0.5)._entity
						.depth((18 - i))
						.scene(self.scene1);

						setTimeout(function () { var vr = vp[i]; return function () { vr.addBehavior('rotator', RotatorBehaviour); }}(), tt);
						tt += 200;
						vp[i].mount(ige);
					}

					vp[0] = new IgeViewport({center:0, top:0, width:250, height:150, autoSize:false, borderStyle: '#ffffff'});
					vp[0].originTo(0, 0, 0);
					vp[0].camera.scaleTo(2, 2, 2);
					vp[0].depth(1);
					vp[0].scene(self.scene1);
					vp[0].mount(ige);

					self.obj[0] = new IgeEntity()
						.addBehavior('rotator', RotatorBehaviour)
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.mount(self.scene1);

					self.obj[1] = tempObj = new IgeEntity()
						.addBehavior('scaler', ScalerBehaviour)
						.addBehavior('rotator', RotatorBehaviourAC)
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