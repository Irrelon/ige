var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [],
			overFunc, outFunc;

		this.obj = [];

		gameTexture[0] = new IgeCellSheet('../assets/textures/sprites/vx_chara02_c.png', 12, 8);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Define our player character classes
					self.CharacterMonk = IgeInteractiveEntity.extend({
						init: function () {
							this._super();

							// Setup the entity
							this.addComponent(IgeAnimationComponent)
								.addComponent(IgeVelocityComponent)
								.animation.define('walkDown', [10, 11, 12, 11], 8, -1)
								.animation.define('walkLeft', [22, 23, 24, 23], 8, -1)
								.animation.define('walkRight', [34, 35, 36, 35], 8, -1)
								.animation.define('walkUp', [46, 47, 48, 47], 8, -1)
								.cell(10)
								.depth(1)
								.texture(gameTexture[0])
								.dimensionsFromCell()
								.drawBounds(false)
								.mouseOver(overFunc)
								.mouseOut(outFunc)
								.mount(self.scene1);

							// Setup the control system
							ige.input.mapAction('walkLeft', ige.input.key.left);
							ige.input.mapAction('walkRight', ige.input.key.right);
							ige.input.mapAction('walkUp', ige.input.key.up);
							ige.input.mapAction('walkDown', ige.input.key.down);
						},

						tick: function (ctx) {
							if (ige.input.actionState('walkLeft')) {
								this.velocity.x(-0.1)
									.velocity.y(0)
									.animation.select('walkLeft');
							} else if (ige.input.actionState('walkRight')) {
								this.velocity.x(0.1)
									.velocity.y(0)
									.animation.select('walkRight');
							} else if (ige.input.actionState('walkUp')) {
								this.velocity.x(0)
									.velocity.y(-0.1)
									.animation.select('walkUp');
							} else if (ige.input.actionState('walkDown')) {
								this.velocity.x(0)
									.velocity.y(0.1)
									.animation.select('walkDown');
							} else {
								this.velocity.x(0)
									.velocity.y(0)
									.animation.stop();
							}

							this._super(ctx);
						}
					});

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

					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					self.obj[0] = new self.CharacterMonk();
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }