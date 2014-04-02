var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		//ige.input.debug(true);

		// Load the fairy texture and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Load a smart texture
		gameTexture[1] = new IgeTexture('../assets/textures/smartTextures/simpleBox.js');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.viewportDepth(true);

					// Create a custom watch object
					self.customWatch = {
						w1: {
							name: 'Mouse Move Viewport ID',
							value: 0
						},
						w2: {
							name: 'World Mouse Position X',
							value: 0
						},
						w3: {
							name: 'World Mouse Position Y',
							value: 0
						},
						w4: {
							name: 'Fairy 2 Local Mouse Position X',
							value: 0
						},
						w5: {
							name: 'Fairy 2 Local Mouse Position Y',
							value: 0
						}
					};

					// Create the scene
					self.mainScene = new IgeScene2d()
						.id('mainScene');

					self.objectScene = new IgeScene2d()
						.id('objectScene')
						.mount(self.mainScene);

					self.uiScene = new IgeScene2d()
						.id('uiScene')
						.ignoreCamera(false)
						.mount(self.mainScene);

					// Create the main viewport and set the scene
					// it will "look" at as the new mainScene we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.autoSize(true)
						.scene(self.mainScene)
						.drawBounds(true)
						.drawMouse(true)
						.mount(ige);

					self.vp2 = new IgeViewport()
						.id('vp2')
						.addComponent(IgeMousePanComponent)
						.mousePan.enabled(true)
						.depth(2)
						.autoSize(false)
						.width(300)
						.height(150)
						.right(10)
						.bottom(10)
						.borderWidth(1)
						.borderColor('#ffffff')
						.scene(self.mainScene)
						.drawBounds(true)
						.drawMouse(true)
						//.mount(ige);

					self.vp1.camera.translateTo(0, 0, 0);
					self.vp2.camera.scaleTo(2, 2, 2);
					
					self.cont = new IgeUiEntity()
						.id('cont')
						.middle(0)
						.center(0)
						.width(300)
						.height(200)
						.scaleTo(0.5, 0.5, 0.5)
						.mount(self.mainScene);

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeUiEntity()
						.id('fairy1')
						.depth(1)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						//.translateTo(0, 0, 0)
						.center(0)
						.bottom(0)
						.scaleTo(1.5, 1.5, 1)
						//.rotateTo(0, 0, Math.radians(180))
						.mount(self.cont);

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new IgeUiEntity()
						.id('fairy2')
						.depth(1)
						.width(50)
						.height(50)
						.texture(gameTexture[0])
						//.translateTo(0, 50, 0)
						.scaleTo(1.5, 1.5, 1.5)
						.left(0)
						.bottom(0)
						//.rotateTo(0, 0, Math.radians(90))
						.mouseMove(function (event, eventControl, data) {
							// Set the custom watch object's value
							// to the ID of the current viewport
							self.customWatch.w1.value = event.igeViewport.id();

							// Get the mouse position relative to the center
							// of this entity based on the viewport the event
							// occurred in
							ige.debugEventOn('event1');
							var mpLocal = this.mousePos(event.igeViewport);
							var mp = this.mousePosWorld(event.igeViewport);

							self.customWatch.w2.value = mp.x;
							self.customWatch.w3.value = mp.y;

							self.customWatch.w4.name = 'Fairy 2 Local Mouse Position X (' + event.igeViewport.id() +')';
							self.customWatch.w5.name = 'Fairy 2 Local Mouse Position Y (' + event.igeViewport.id() +')';
							self.customWatch.w4.value = mpLocal.x;
							self.customWatch.w5.value = mpLocal.y;

							// Move the "mouse" entity to the new world
							// co-ordinates
							self.obj[2].translateTo(mp.x, mp.y, 0);
						})
						.mouseUp(function (event) {
							console.log('UP!');
						})
						.mount(self.obj[0]);

					// Create a simplebox entity and mount it to the
					// main scene
					self.obj[2] = new IgeEntity()
						.id('mouse')
						.depth(2)
						.width(10)
						.height(10)
						.texture(gameTexture[1])
						.translateTo(0, 0, 0)
						.mount(self.uiScene);

					// Add some watch variables
					ige.watchStart("ige.mousePos().x");
					ige.watchStart("ige.mousePos().y");

					ige.watchStart("ige.$('vp1').mousePos().x");
					ige.watchStart("ige.$('vp1').mousePos().y");

					ige.watchStart("ige.$('vp2').mousePos().x");
					ige.watchStart("ige.$('vp2').mousePos().y");

					ige.watchStart("ige.$('vp2').mousePosWorld().x");
					ige.watchStart("ige.$('vp2').mousePosWorld().y");

					// Now add some custom objects to the watch list
					ige.watchStart(self.customWatch.w4);
					ige.watchStart(self.customWatch.w5);

					ige.watchStart(self.customWatch.w2);
					ige.watchStart(self.customWatch.w3);

					ige.watchStart(self.customWatch.w1);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }