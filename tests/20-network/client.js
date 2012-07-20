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

		this.loadTextures();

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
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
					ige.network.start('http://localhost:2000', function () {
						// Define network commands
						ige.network.define('placeItem', self._placeItem);

						// Create the basic scene, viewport etc
						self.setupScene();

						// Create the UI entities
						self.setupUi();

						// Setup the initial entities
						self.setupEntities();

						// Add our game behaviour to the base engine instance.
						// Behaviours are functions that get called each engine tick
						// and can be used to do things like control AI behaviour,
						// maintain data etc. In this case our behaviour is going to
						// handle user interaction with the game scene by checking
						// for
					});
				}
			});
		});

		this.loadTextures();
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
			.translateTo(0, -360)
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

		// Create the background image
		this.backDrop = new IgeEntity()
			.layer(0)
			.texture(this.gameTexture.background1)
			.dimensionsFromTexture()
			.translateTo(0, 250, 0)
			.mount(this.gameScene);

		// Create a collision map. We don't mount this to
		// our scene because we are only going to use it
		// for storing where buildings CAN be placed since
		// the island background has limited space to build.
		this.collisionMap1 = new IgeMap2d();

		// Create the tile map that will store which buildings
		// are occupying which tiles on the map. When we create
		// new buildings we mount them to this tile map which
		// adds new methods to our building entities like being
		// able to translate based on tiles rather than absolute
		// world co-ordinates (like a call to translateToTile)
		this.tileMap1 = new IgeTileMap2d()
			.layer(2)
			.isometric(true)
			.tileWidth(20)
			.tileHeight(20)
			.drawGrid(40)
			.highlightOccupied(false)
			.mount(this.gameScene);

		/*
			Just so we're all clear about what just happened, we have
			created a scenegraph that looks like this:

			ige (IgeEntity)
			|+ vp1 (IgeViewport)
				|+ mainScene (IgeScene)
					|+ gameScene (IgeScene)
					|	+ backDrop (IgeEntity)
					|	+ tileMap1 (IgeTileMap2d)
					|+ uiScene (IgeScene)

			For a full readout of the scenegraph at any time, use the
			JS console and issue the command: ige.scenegraph();
		 */
	},

	/**
	 * Creates the UI entities that the user can interact with to
	 * perform certain tasks like placing and removing buildings.
	 */
	setupUi: function () {
		// Create the top menu bar
		var menuBar = new IgeUiEntity()
			.id('menuBar')
			.depth(10)
			.backgroundColor('#333333')
			.left(0)
			.top(0)
			.width('100%')
			.height(40)
			.mount(this.uiScene),

		// Create the menu bar buttons
		uiButtonSelect = new IgeUiEntity()
			.id('uiButtonSelect')
			.left(3)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonSelect)
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'select') {
					this.backgroundColor('#6b6b6b');
				}
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'select') {
					this.backgroundColor('');
				}
			})
			.mouseUp(function () {
				ige.client.data('cursorMode', 'select');
				this.backgroundColor('#00baff');
			})
			.mount(menuBar);
	},

	/**
	 * Create some default entities to show how to create them
	 * in code.
	 */
	setupEntities: function () {
		this.placeItem('Bank', 0, 6);
		this.placeItem('Electricals', 2, 6);
		this.placeItem('Burgers', 4, 6);

		// Skyscrapers are special buildings because they can
		// add new floors and have an optional crane on top that
		// can be shown in four directions (se, sw, ne, nw).
		// Each floor is actually it's own distinct entity but
		// the entire skyscraper can be moved around or removed
		// from the scene as one single entity. Take a look in the
		// ClientObjects.js file to see how it is defined!
		this.placeItem('SkyScraper', 15, 10)
			.addFloors(5)
			.addCrane('ne');

		this.placeItem('SkyScraper', 1, 4)
			.addFloors(2)
			.addCrane('se');
	},

	/**
	 * Place a building on the map.
	 * @param type
	 * @param tileX
	 * @param tileY
	 * @return {*}
	 */
	placeItem: function (type, tileX, tileY) {
		var item = new this[type](this.tileMap1, tileX, tileY).place();
		this.obj.push(item);

		return item;
	},

	/**
	 * Removes an item from the tile map and destroys the entity
	 * from memory.
	 * @param tileX
	 * @param tileY
	 */
	removeItem: function (tileX, tileY) {
		var item = this.itemAt(tileX, tileY);
		if (item) {
			item.destroy();
		}
	},

	/**
	 * Returns the item occupying the tile co-ordinates of the tile map.
	 * @param tileX
	 * @param tileY
	 */
	itemAt: function (tileX, tileY) {
		// Return the first data index at the map's tile co-ordinates
		return this.tileMap1.map.tileDataAtIndex(tileX, tileY, 0);
	},

	/**
	 * Creates and returns a temporary item that can be used
	 * to indicate to the player where their item will be built.
	 * @param type
	 */
	createTemporaryItem: function (type) {
		// Create a new item at a far off tile position - it will
		// be moved to follow the mouse cursor anyway but it's cleaner
		// to create it off-screen first.
		return new this[type](this.tileMap1, -1000, -1000);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }