var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Implement our game object definitions (see ClientObjects.js)
		this.implement(ClientObjects);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.viewportDepth(true);

					// Create the basic scene, viewport etc
					self.setupScene();

					// Setup the initial entities
					self.setupEntities();
				}
			});
		});

		this.loadTextures();
	},

	loadTextures: function () {
		this.gameTexture.background1 = new IgeTexture('../assets/textures/backgrounds/resortico.png');
		this.gameTexture.bank = new IgeTexture('../assets/textures/buildings/bank1.png');
		this.gameTexture.electricals = new IgeTexture('../assets/textures/buildings/electricalsShop1.png');
		this.gameTexture.burgers = new IgeTexture('../assets/textures/buildings/burgerShop1.png');
		this.gameTexture.base_se = new IgeTexture('../assets/textures/buildings/base_se.png');
		this.gameTexture.base_se_left = new IgeTexture('../assets/textures/buildings/base_se_left.png');
		this.gameTexture.base_se_middle = new IgeTexture('../assets/textures/buildings/base_se_middle.png');
		this.gameTexture.base_se_right = new IgeTexture('../assets/textures/buildings/base_se_right.png');
		this.gameTexture.base_sw = new IgeTexture('../assets/textures/buildings/base_sw.png');
		this.gameTexture.base_sw_left = new IgeTexture('../assets/textures/buildings/base_sw_left.png');
		this.gameTexture.base_sw_middle = new IgeTexture('../assets/textures/buildings/base_sw_middle.png');
		this.gameTexture.base_sw_right = new IgeTexture('../assets/textures/buildings/base_sw_right.png');
		this.gameTexture.stacker_se = new IgeTexture('../assets/textures/buildings/stacker_se.png');
		this.gameTexture.stacker_se_left = new IgeTexture('../assets/textures/buildings/stacker_se_left.png');
		this.gameTexture.stacker_se_middle = new IgeTexture('../assets/textures/buildings/stacker_se_middle.png');
		this.gameTexture.stacker_se_right = new IgeTexture('../assets/textures/buildings/stacker_se_right.png');
		this.gameTexture.stacker_sw = new IgeTexture('../assets/textures/buildings/stacker_sw.png');
		this.gameTexture.stacker_sw_left = new IgeTexture('../assets/textures/buildings/stacker_sw_left.png');
		this.gameTexture.stacker_sw_middle = new IgeTexture('../assets/textures/buildings/stacker_sw_middle.png');
		this.gameTexture.stacker_sw_right = new IgeTexture('../assets/textures/buildings/stacker_sw_right.png');
		this.gameTexture.crane_se = new IgeTexture('../assets/textures/buildings/crane_se.png');
		this.gameTexture.crane_sw = new IgeTexture('../assets/textures/buildings/crane_sw.png');
		this.gameTexture.crane_ne = new IgeTexture('../assets/textures/buildings/crane_ne.png');
		this.gameTexture.crane_nw = new IgeTexture('../assets/textures/buildings/crane_nw.png');
	},

	setupScene: function () {
		// Create the scene
		this.scene1 = new IgeScene2d()
			.isometric(false);

		// Create the main viewport
		this.vp1 = new IgeViewport()
			.addComponent(IgeMousePanComponent)
			.mousePan.enabled(true)
			.id('vp1')
			.autoSize(true)
			.scene(this.scene1)
			.drawBounds(true)
			.mount(ige)
			.camera.translateTo(0, 380, 0);

		// Create the background image
		this.backdrop = new IgeEntity()
			.layer(0)
			.texture(this.gameTexture.background1)
			.dimensionsFromTexture()
			.translateTo(0, 250, 0)
			.mount(this.scene1);

		// Create a collision map
		this.collisionMap1 = new IgeTileMap2d()
			.layer(1)
			.isometric(true)
			.tileWidth(20)
			.tileHeight(20)
			.drawGrid(0)
			.highlightOccupied(false)
			.mount(this.scene1);

		// Create the tile map
		this.tileMap1 = new IgeTileMap2d()
			.layer(2)
			.isometricMounts(true)
			.tileWidth(20)
			.tileHeight(20)
			.drawGrid(40)
			.highlightOccupied(false)
			.mount(this.scene1);
	},

	setupEntities: function () {
		// Create an entity
		this.obj[0] = new this.Bank(this.tileMap1, 0, 6);
		this.obj[1] = new this.Electricals(this.tileMap1, 2, 6);
		this.obj[2] = new this.Burgers(this.tileMap1, 4, 6);
		this.obj[3] = new this.SkyScraper(this.tileMap1, 15, 10).addFloors(5).addCrane('nw');
		this.obj[4] = new this.SkyScraper(this.tileMap1, 1, 4).addFloors(2).addCrane('se');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }