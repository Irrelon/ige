var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.input.debug(true);

		var self = this;
		self.obj = [];
		self.textures = {};

		// Load textures
		self.textures.ship = new IgeTexture('./assets/Ship.js');
		self.textures.rectangle = new IgeTexture('./assets/Rectangle.js');
		self.textures.font = new IgeFontSheet('./assets/agency_fb_20pt.png', 3);

		// Implement our externally declared methods
		self.implement(ClientWorld);
		self.implement(ClientTerrain);

		// Add physics and setup physics world
		ige.addComponent(IgeBox2dComponent)
			.box2d.sleep(true)
			.box2d.gravity(0, 1)
			.box2d.createWorld()
			.box2d.mode(0)
			.box2d.start();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.createWorld();
					self.createTerrain();

					// Define our player controls
					ige.input.mapAction('left', ige.input.key.left);
					ige.input.mapAction('right', ige.input.key.right);
					ige.input.mapAction('thrust', ige.input.key.up);

					self.player = new Player()
						.addBehaviour('PlayerControl', PlayerBehaviour)
						.translateTo(self.landingPads[0]._translate.x, self.landingPads[0]._translate.y - 20, 0)
						.mount(self.objectScene);

					// Add the box2d debug painter entity to the
					// scene to show the box2d body outlines
					//ige.box2d.enableDebug(self.mainScene);

					self.vp1.camera.trackTranslate(self.player, 20);

					var Test = IgeEntity.extend({
						classId: 'Test',
						tick: function (ctx) {
							this._super(ctx);
							ctx.strokeStyle = '#ffffff';
							ige.client.terrainPoly.render(ctx);
						}
					});

					new Test().mount(ige.client.mainScene);

					// Set the contact listener methods to detect when
					// contacts (collisions) begin and end
					ige.box2d.contactListener(
						// Listen for when contact's begin
						function (contact) {
							//console.log('Contact begins between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);

							// If player ship collides with lunar surface, crash!
							if (contact.igeEitherGroup('floor') && contact.igeEitherGroup('ship')) {
								// The player has crashed!
								self.player.crash();
							} else if (contact.igeEitherGroup('landingPad') && contact.igeEitherGroup('ship')) {
								// If the player ship touches a landing pad, check velocity and angle
								if (Math.degrees(self.player._rotate.z) > 30 || Math.degrees(self.player._rotate.z) < -30) {
									console.log(Math.degrees(self.player._rotate.z));
									self.player.crash();
								}
							}
						}/*,
						// Listen for when contact's end
						function (contact) {
							//console.log('Contact ends between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
						},
						// Handle pre-solver events
						function (contact) {
							// If player ship collides with lunar surface, crash!
							if (contact.igeEitherGroup('floor') && contact.igeEitherGroup('ship')) {
								// Cancel the contact
								contact.SetEnabled(false);
							}

							// You can also check an entity by it's group using igeEitherGroup('groupName')
						}*/
					);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }