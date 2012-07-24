var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Enable networking
		ige.addComponent(IgeSocketIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);
		this.implement(ClientItem);
		this.implement(ClientObjects);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			this.log('Creating front buffer...');
			ige.createFrontBuffer(true);

			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Start the networking (you can do this elsewhere if it
					// makes sense to connect to the server later on rather
					// than before the scene etc are created... maybe you want
					// a splash screen or a menu first? Then connect after you've
					// got a username or something?
					/*ige.network.start('http://localhost:2000', function () {
						// Define network command listeners
						ige.network.define('login', self._login);
						ige.network.define('getMap', self._getMap);
						ige.network.define('placeItem', self._placeItem);

						// Send the server our login details
						// TODO: This is the part where you're gonna have to build a user login system, at the moment it always assumes you're "bob123"
						ige.network.send('login', {
							username:'bob123',
							password: 'moo123'
						});
					});*/
					self.startClient();
				}
			});
		}, this, true); // Set the callback context to "this" and make this a one-shot event (will only fire once)

		this.loadTextures();
	},

	/**
	 * Called by the server sending us a successful login
	 * packet. See ClientNetworkEvents.js
	 */
	startClient: function () {
		this.log('Starting game...');

		// Create the basic scene, viewport etc
		this.setupScene();

		// Create the UI entities
		this.setupUi();

		// Setup the initial entities
		this.setupEntities();

		// Ask the server for our map data
		//ige.network.send('getMap');
	},

	/**
	 * Ask the engine to load all the textures we are going to use in
	 * the game. The engine will not start until all the textures have
	 * loaded into memory successfully.
	 */
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

		this.gameTexture.uiButtonSelect = new IgeTexture('../assets/textures/ui/uiButton_select.png');
		this.gameTexture.uiButtonMove = new IgeTexture('../assets/textures/ui/uiButton_move.png');
		this.gameTexture.uiButtonDelete = new IgeTexture('../assets/textures/ui/uiButton_delete.png');
		this.gameTexture.uiButtonHouse = new IgeTexture('../assets/textures/ui/uiButton_house.png');
	},

	/**
	 * Create the basic engine elements of the game that we will need
	 * such as a background image and a tile map to add buildings to etc.
	 */
	setupScene: function () {
		// Create the scene that the main game items
		// will reside on
		this.mainScene = new IgeScene2d()
			.id('mainScene');

		// Create the main viewport and tell it to "look"
		// at gameScene with auto-sizing enabled to fill the
		// browser window, then move the camera
		this.vp1 = new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(this.mainScene)
			.drawBounds(false) // Switch this to true to draw all bounding boxes
			.drawBoundsData(true) // Switch to true (and flag above) to see bounds data
			.mount(ige);

		// Create the scene that the game items will
		// be mounted to (like the tile map). This scene
		// is then mounted to the main scene.
		this.gameScene = new IgeScene2d()
			.id('gameScene')
			.depth(0)
			.translateTo(0, 0)
			.mount(this.mainScene);

		// Create the UI scene that will have all the UI
		// entities mounted to it. This scene is at a higher
		// depth than gameScene so it will always be rendered
		// "on top" of the other game items which will all
		// be mounted to off of gameScene somewhere down the
		// scenegraph.
		this.uiScene = new IgeScene2d()
			.id('uiScene')
			.depth(1)
			.mount(this.mainScene);

		// Create the tile map that will store which buildings
		// are occupying which tiles on the map. When we create
		// new buildings we mount them to this tile map. The tile
		// map also has a number of mouse event listeners to
		// handle things like building new objects in the game.
		this.tileMap1 = new IgeTileMap2d()
			.id('tileMap1')
			.layer(2)
			.tileWidth(40)
			.tileHeight(40)
			.drawGrid(40)
			.highlightOccupied(false)
			.translateTo(0, 0, 0)
			.mount(this.gameScene);
	},

	setupUi: function () {
		this._editor = new IGEEditor(this.vp1, this.mainScene)
			.start();
	},

	setupEntities: function () {

	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }