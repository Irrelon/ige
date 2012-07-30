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
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Define our player character classes
					self.CharacterMonk = IgeEntity.extend({
						init: function () {
							this._super();
							var self = this;

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
								.mount(ige.client.scene1);

							ige.input.mapAction('mouseX', ige.input.mouse.x);
							ige.input.mapAction('mouseY', ige.input.mouse.y);

							// Listen for the mouse up event
							ige.input.on('mouseUp', function (event) { self._mouseUp(event); });
						},

						walkTo: function (x, y) {
							var self = this,
								distX = x - this.translate().x(),
								distY = y - this.translate().y(),
								distance = Math.distance(
									this.translate().x(),
									this.translate().y(),
									x,
									y
								),
								speed = 0.1,
								time = (distance / speed);

							// Set the animation based on direction
							if (Math.abs(distX) > Math.abs(distY)) {
								// Moving horizontal
								if (distX < 0) {
									// Moving left
									this.animation.select('walkLeft');
								} else {
									// Moving right
									this.animation.select('walkRight');
								}
							} else {
								// Moving vertical
								if (distY < 0) {
									// Moving up
									this.animation.select('walkUp');
								} else {
									// Moving down
									this.animation.select('walkDown');
								}
							}

							// Start tweening the little person to their destination
							this._translate.tween()
								.stopAll()
								.properties({x: x, y: y})
								.duration(time)
								.afterTween(function () {
									self.animation.stop();
									// And you could make him reset back
									// to his original animation frame with:
									//self.cell(10);
								})
								.start();

							return this;
						},

						_mouseUp: function (event) {
							this.walkTo(
								ige.input.actionVal('mouseX'),
								ige.input.actionVal('mouseY')
							);
						}
					});

					// Create the scene
					self.scene1 = new IgeScene2d();

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.autoSize(true)
						.scene(self.scene1)
						//.drawBounds(true)
						.mount(ige);

					self.obj[0] = new self.CharacterMonk();
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }