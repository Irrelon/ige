var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		ige.showStats(1);

		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

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

		// Create some textures but don't load them yet
		this.gameTexture.background1 = new IgeTexture();
		this.gameTexture.bank = new IgeTexture();

		// Test multi-event listening
		ige.on([
			[this.gameTexture.background1, 'loaded'],
			[this.gameTexture.bank, 'loaded']
		], function () {
			console.log('All loaded');
		});

		// Load the texture images
		this.gameTexture.background1.url('../assets/textures/backgrounds/grassTile.png');
		this.gameTexture.bank.url('../assets/textures/buildings/bank1.png');
	},

	setupScene: function () {
		// Create the scene
		this.mainScene = new IgeScene2d()
			.id('mainScene');

		// Resize the background and then create a background pattern
		this.gameTexture.background1.resize(40, 20);
		this.backgroundScene = new IgeScene2d()
			.id('backgroundScene')
			.depth(0)
			.backgroundPattern(this.gameTexture.background1, 'repeat', true, true)
			.ignoreCamera(true) // We want the scene to remain static
			.mount(this.mainScene);

		this.objectScene = new IgeScene2d()
			.id('objectScene')
			.depth(1)
			.isometric(false)
			.mount(this.mainScene);

		// Create the main viewport
		this.vp1 = new IgeViewport()
			.id('vp1')
			.addComponent(IgeMousePanComponent)
			.addComponent(IgeMouseZoomComponent)
			.mousePan.enabled(true)
			.mouseZoom.enabled(false)
			.autoSize(true)
			.scene(this.mainScene)
			.drawBounds(true)
			.drawBoundsData(true)
			.mount(ige);

		this.vp1.camera.translateTo(0, 200, 0);

		// Create the tile map
		this.tileMap1 = new IgeTileMap2d()
			.id('tileMap1')
			.layer(2)
			.isometricMounts(true)
			.tileWidth(20)
			.tileHeight(20)
			.drawGrid(40)
			//.highlightOccupied(true)
			.drawBounds(false)
			.drawBoundsData(false)
			.mount(this.objectScene);
	},

	setupEntities: function () {
		// Create an entity
		this.obj[0] = new this.Bank(this.tileMap1, 10, 10).id('bank');
		this.obj[1] = new this.Electricals(this.tileMap1, 2, 6);
		this.obj[2] = new this.Burgers(this.tileMap1, 5, 6);
		this.obj[3] = new this.SkyScraper(this.tileMap1, 15, 10).addFloors(5).addCrane('nw');
		this.obj[4] = new this.SkyScraper(this.tileMap1, 1, 4).addFloors(2).addCrane('se');
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }