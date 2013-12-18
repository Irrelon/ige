var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		var self = this;
		self.obj = [];
		self.textures = {};

		// Load textures
		self.textures.ship = new IgeTexture('./assets/Ship.js');
		self.textures.rectangle = new IgeTexture('./assets/Rectangle.js');
		self.textures.orb = new IgeTexture('./assets/Orb.js');
		self.textures.font = new IgeFontSheet('./assets/agency_fb_20pt.png');

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
					ige.input.mapAction('drop', ige.input.key.space);

					self.player = new Player()
						.id('player1')
						.addBehaviour('PlayerControl', PlayerBehaviour)
						.translateTo(self.landingPads[0]._translate.x, self.landingPads[0]._translate.y - 20, 0)
						.mount(self.objectScene);

					// Add the box2d debug painter entity to the
					// scene to show the box2d body outlines
					//ige.box2d.enableDebug(self.mainScene);

					self.vp1.camera.trackTranslate(self.player, 20);

					// Set the contact listener methods to detect when
					// contacts (collisions) begin and end
					ige.box2d.contactListener(
						// Listen for when contact's begin
						function (contact) {
							//console.log('Contact begins between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);

							// If player ship collides with lunar surface, crash!
							if (contact.igeEitherCategory('floor') && contact.igeEitherCategory('ship')) {
								// The player has crashed!
								self.player.crash();
							} else if (contact.igeEitherCategory('landingPad') && contact.igeEitherCategory('ship')) {
								// Clear the old orb data
								delete self.player._oldOrb;

								// If the player ship touches a landing pad, check velocity and angle
								var degrees = Math.degrees(self.player._rotate.z),
									wound = Math.round(degrees / 360);

								if (wound > 0) {
									degrees -= (360 * wound);
								}

								if (wound < 0) {
									degrees -= (360 * wound);
								}

								self.player._rotate.z = Math.radians(degrees);

								if (degrees > 30 || degrees < -30) {
									self.player.crash();
								} else {
									// The player has landed
									self.player._landed = true;
								}
							} else if (!self.player._carryingOrb && contact.igeEitherCategory('orb') && contact.igeEitherCategory('ship')) {
								// Check if it is our sensor
								if (contact.m_fixtureA.IsSensor() || contact.m_fixtureB.IsSensor()) {
									// Sensor has collided, attach orb to ship!
									// Set carrying orb
									self.player.carryOrb(contact.igeEntityByCategory('orb'), contact);
								}
							} else if (contact.igeEitherCategory('orb') && contact.igeEitherCategory('landingPad')) {
								// Orb has reached landing pad, score!
								if (self.player._carryingOrb && self.player._orb === contact.igeEntityByCategory('orb')) {
									// The orb the player was carrying has reached a pad
									self.player._orb.deposit(true, contact.igeEntityByCategory('landingPad'));
								} else {
									contact.igeEntityByCategory('orb').deposit(false, contact.igeEntityByCategory('landingPad'));
								}
							}
						},
						// Listen for when contact's end
						function (contact) {
							//console.log('Contact ends between', contact.igeEntityA()._id, 'and', contact.igeEntityB()._id);
							if (contact.igeEitherCategory('landingPad') && contact.igeEitherCategory('ship')) {
								// The player has taken off
								self.player._landed = false;
							}
						}/*,
						// Handle pre-solver events
						function (contact) {
							// If player ship collides with lunar surface, crash!
							if (contact.igeEitherCategory('orb') && contact.igeEitherCategory('ship')) {
								// Cancel the contact
								contact.SetEnabled(false);
							}

							// You can also check an entity by it's category using igeEitherCategory('categoryName')
						}*/
					);

					/*new ClientScore('+1 for orb')
						.translateTo(0, 0, 0)
						.mount(ige.client.objectScene)
						.start(1000);*/
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }