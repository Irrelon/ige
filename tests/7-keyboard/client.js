var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeCellSheet('../assets/textures/sprites/vx_chara02_c.png', 12, 8);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Define our player character classes
					self.CharacterMonk = IgeEntity.extend({
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
								.mount(self.scene1);

							// Setup the control system
							this.input.map('walkLeft', this.input.key.left);
							this.input.map('walkRight', this.input.key.right);
							this.input.map('walkUp', this.input.key.up);
							this.input.map('walkDown', this.input.key.down);
						},

						tick: function (ctx) {
							if (this.input.action('walkLeft')) {
								this.velocity.x(-0.1)
									.velocity.y(0)
									.animation.select('walkLeft');
							} else if (this.input.action('walkRight')) {
								this.velocity.x(0.1)
									.velocity.y(0)
									.animation.select('walkRight');
							} else if (this.input.action('walkUp')) {
								this.velocity.x(0)
									.velocity.y(-0.1)
									.animation.select('walkUp');
							} else if (this.input.action('walkDown')) {
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