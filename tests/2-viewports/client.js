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
		gameTexture[1] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					RotatorBehaviour = function (gameObject) {
						gameObject.transform.rotateBy(0, 0, (0.1 * ige.tickDelta) * Math.PI / 180);
					};

					RotatorBehaviourAC = function (gameObject) {
						gameObject.transform.rotateBy(0, 0, (-0.1 * ige.tickDelta) * Math.PI / 180);
					};

					ScalerBehaviour = function (gameObject) {
						gameObject.data.scalerMode = gameObject.data.scalerMode || 1;

						if (gameObject.data.scalerMode === 1) {
							gameObject.transform.scaleBy((0.001 * ige.tickDelta), (0.001 * ige.tickDelta), (0.001 * ige.tickDelta));

							if (gameObject.transform._scale.x >= 4) {
								gameObject.data.scalerMode = 2;
								gameObject.transform._scale.x = 4;
								gameObject.transform._scale.y = 4;
								gameObject.transform._scale.z = 4;
							}

							return;
						}

						if (gameObject.data.scalerMode === 2) {
							gameObject.transform.scaleBy(-(0.001 * ige.tickDelta), -(0.001 * ige.tickDelta), -(0.001 * ige.tickDelta));

							if (gameObject.transform._scale.x <= 1) {
								gameObject.data.scalerMode = 1;
								gameObject.transform._scale.x = 1;
								gameObject.transform._scale.y = 1;
								gameObject.transform._scale.z = 1;
							}

							return;
						}
					};

					self.scene1 = new IgeScene2d();
					self.scene1.mount(ige);
					self.scene1.viewportDepth(true);
					var tt = 0;
					for (var i = 0; i < 18; i++) {
						vp[i] = new IgeViewport({center:-300, middle:0, width:150, height:75, autoSize:false, borderStyle: '#ffffff'});
						vp[i].transform.originTo(0, 0, 0);
						vp[i].camera.scaleTo(0.5, 0.5, 0.5);
						vp[i].depth((18 - i));

						setTimeout(function () { var vr = vp[i]; return function () { vr.addBehavior('rotator', RotatorBehaviour); }}(), tt);
						tt += 200;
						self.scene1.addViewport(vp[i]);
					}
					tt = 0;
					for (var i = 0; i < 18; i++) {
						vp[i] = new IgeViewport({center:300, middle:0, width:150, height:75, autoSize:false, borderStyle: '#ffffff'});
						vp[i].transform.originTo(0, 0, 0);
						vp[i].camera.scaleTo(0.5, 0.5, 0.5);
						vp[i].depth((18 - i));

						setTimeout(function () { var vr = vp[i]; return function () { vr.addBehavior('rotator', RotatorBehaviour); }}(), tt);
						tt += 200;
						self.scene1.addViewport(vp[i]);
					}

					vp[0] = new IgeViewport({left:50, top:50, width:250, height:150, autoSize:false, borderStyle: '#ffffff'});
					vp[0].transform.originTo(0, 0, 0);
					vp[0].camera.scaleTo(2, 2, 2);
					vp[0].depth(0);
					self.scene1.addViewport(vp[0]);

					self.obj[0] = tempObj = new IgeEntity();
					tempObj.addBehavior('rotator', RotatorBehaviour);
					tempObj.depth(1);
					tempObj.geometry.x = 100;
					tempObj.geometry.y = 100;
					tempObj.texture(gameTexture[0]);
					tempObj.mount(self.scene1);

					self.obj[1] = tempObj = new IgeEntity();
					tempObj.depth(0);
					tempObj.addBehavior('scaler', ScalerBehaviour);
					tempObj.addBehavior('rotator', RotatorBehaviourAC);
					tempObj.geometry.x = 100;
					tempObj.geometry.y = 200;
					tempObj.texture(gameTexture[1]);
					tempObj.mount(self.scene1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }