var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			StarParticle,
			overFunc, outFunc;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/particles/star1.png');
		gameTexture[1] = new IgeTexture('../assets/textures/particles/star2.png');
		gameTexture[2] = new IgeTexture('../assets/textures/particles/star3.png');
		gameTexture[3] = new IgeTexture('../assets/textures/particles/star4.png');
		
		ige.addComponent(IgeEditorComponent);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					overFunc = function () {
						this.highlight(true);
						this.drawBounds(true);
						this.drawBoundsData(true);
					};

					outFunc = function () {
						this.highlight(false);
						this.drawBounds(false);
						this.drawBoundsData(false);
					};

					StarParticle = IgeEntity.extend({
						classId: 'StarParticle',

						init: function (emitter) {
							this._emitter = emitter;
							IgeEntity.prototype.init.call(this);

							this.noAabb(true);
							
							// Setup the particle default values
							this.addComponent(IgeVelocityComponent)
								.texture(gameTexture[3])
								.width(50)
								.height(50)
								.drawBounds(false)
								.drawBoundsData(false);
						},

						tick: function (ctx) {
							IgeEntity.prototype.tick.call(this, ctx);
						},

						destroy: function () {
							// Remove ourselves from the emitter
							if (this._emitter !== undefined) {
								this._emitter._particles.pull(this);
							}
							IgeEntity.prototype.destroy.call(this);
						}
					});

					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);

					// Create an entity
					self.obj[0] = new IgeParticleEmitter()
						.id('emitter1')
						.particle(StarParticle)
						.lifeBase(2500)
						.quantityTimespan(1000)
						.quantityBase(60)
						.translateVarianceX(-50, 50)
						.scaleBaseX(0.2)
						.scaleBaseY(0.2)
						.scaleLockAspect(true)
						.rotateVariance(0, 360)
						.opacityBase(0.5)
						.velocityVector(new IgePoint3d(0, -0.1, 0), new IgePoint3d(-0.2, -0.1, 0), new IgePoint3d(0.2, -0.25, 0))
						.linearForceVector(new IgePoint3d(0, 0.12, 0), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 0, 0))
						.deathScaleBaseX(0)
						.deathScaleVarianceX(0, 1)
						.deathScaleBaseY(0.7)
						.deathRotateBase(0)
						.deathRotateVariance(-360, 360)
						.deathOpacityBase(0.0)
						.depth(1)
						.width(10)
						.height(10)
						.translateTo(0, ige._bounds2d.y2, 0)
						.particleMountTarget(self.scene1)
						.mount(self.scene1)
						.start();

				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }