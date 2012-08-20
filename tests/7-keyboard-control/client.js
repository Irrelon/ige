var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Create the scene
				self.scene1 = new IgeScene2d();

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.autoSize(true)
					.scene(self.scene1)
					.drawBounds(true)
					.mount(ige);

				// Create the texture maps and load their map data
				// Note that the collision layer is not mounted to the scene
				// because we only use it's map data, rather than rendering
				// anything from it!
				self.collisionLayer1 = new IgeTextureMap()
					.depth(3)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0)
					//.drawMouse(true)
					//.drawGrid(1)
					.loadMap(CollisionLayer1);
					//.mount(self.scene1);

				self.backgroundLayer1 = new IgeTextureMap()
					.depth(0)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0)
					//.drawGrid(10)
					.drawBounds(false)
					.loadMap(BackgroundLayer1)
					.mount(self.scene1);

				self.staticObjectLayer1 = new IgeTextureMap()
					.depth(1)
					.tileWidth(40)
					.tileHeight(40)
					.translateTo(0, 0)
					//.drawGrid(10)
					.drawBounds(false)
					.mount(self.scene1)
					.loadMap(StaticObjectLayer1);

				// Define the character's collision polygon
				self.characterCollisionPoly = new IgePoly2d()
					.addPoint(-0.2, 0.3)
					.addPoint(0.2, 0.3)
					.addPoint(0.2, 0.6)
					.addPoint(-0.2, 0.6);

				// Create a new character, add the player component
				// and then set the type (setType() is defined in
				// gameClasses/Character.js) so that the entity has
				// defined animation sequences to use.
				self.player1 = new Character()
					.addComponent(PlayerComponent)
					.box2dBody({
						type: 'dynamic',
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: true,
						gravitic: true,
						fixedRotation: true,
						fixtures: [{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: 'polygon',
								data: new IgePoly2d()
									.addPoint(-0.2, 0.2)
									.addPoint(0.2, 0.2)
									.addPoint(0.2, 0.8)
									.addPoint(-0.2, 0.8)
								/*type: 'rectangle',
								data: {
									x: 0,
									y: 0,
									width: 10,
									height: 10
								}*/
							}
						}]
					})
					.id('player1')
					.setType(0)
					.translateTo(480, 300, 0)
					.drawBounds(false)
					.mount(self.scene1);

				// Create the room boundaries in box2d
				new IgeEntityBox2d()
					.box2dBody({
						type: 'static',
						allowSleep: true,
						fixtures: [{
							shape: {
								type: 'rectangle',
								data: {
									x: 420,
									y: 130,
									width: 440,
									height: 10
								}
							}
						}]
					});

				// Translate the camera to the initial player position
				self.vp1.camera.lookAt(self.player1);

				// Tell the camera to track our player character with some
				// tracking smoothing (set to 20)
				self.vp1.camera.trackTranslate(self.player1, 20);

				// Enable box2d debug canvas output
				ige.box2d.enableDebug(self.scene1);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }