var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Load our textures
		var self = this;

		this.obj = [];
		this.gameTexture = {};

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Ask the engine to start
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					self.showSplash();
				}
			});
		});

		this.loadTextures();
	},

	showSplash: function () {
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

		// Create background gradient
		new IgeUiEntity()
			.depth(0)
			.backgroundImage(this.gameTexture.background1, 'repeat')
			.left(0)
			.top(0)
			.width('100%')
			.height('100%')
			.mount(this.mainScene);

		this.loading = new IgeEntity()
			.depth(1)
			.texture(this.gameTexture.loading)
			.dimensionsFromTexture()
			.mount(this.mainScene);
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
		ige.network.send('getMap');
	},

	/**
	 * Ask the engine to load all the textures we are going to use in
	 * the game. The engine will not start until all the textures have
	 * loaded into memory successfully.
	 */
	loadTextures: function () {
		this.gameTexture.background1 = new IgeTexture('../assets/textures/backgrounds/greyGradient.png');
		this.gameTexture.loading = new IgeTexture('../assets/textures/backgrounds/loading.png');
	},

	startNetwork: function () {
		// Enable networking
		ige.addComponent(IgeSocketIoComponent);

		// Implement our game methods
		this.implement(ClientNetworkEvents);

		// Start the networking (you can do this elsewhere if it
		// makes sense to connect to the server later on rather
		// than before the scene etc are created... maybe you want
		// a splash screen or a menu first? Then connect after you've
		// got a username or something?
		ige.network.start('http://localhost:2000', function () {
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
		});
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
		// TODO: Fill the collision map with data that denotes the sections of the map that CAN be used for building, then add logic in to check that when a build request happens, it is in an area of this map.
		this.collisionMap1 = new IgeMap2d();

		// Create the tile map that will store which buildings
		// are occupying which tiles on the map. When we create
		// new buildings we mount them to this tile map. The tile
		// map also has a number of mouse event listeners to
		// handle things like building new objects in the game.
		this.tileMap1 = new IgeTileMap2d()
			.id('tileMap1')
			.layer(2)
			.isometric(true)
			.tileWidth(20)
			.tileHeight(20)
			.drawGrid(40)
			.highlightOccupied(false)
			.mouseOver(function (x, y) {
				switch (ige.client.data('cursorMode')) {
					case 'select':
						// If we already have a selection, un-highlight it
						if (this.data('currentlyHighlighted')) {
							this.data('currentlyHighlighted').highlight(false);
						}

						// Highlight the building at the map x, y
						var item = ige.client.itemAt(x, y);
						if (item) {
							item.highlight(true);
							this.data('currentlyHighlighted', item);
						}
					break;

					case 'delete':
						// If we already have a selection, un-highlight it
						if (this.data('currentlyHighlighted')) {
							this.data('currentlyHighlighted').highlight(false);
						}

						// Highlight the building at the map x, y
						var item = ige.client.itemAt(x, y);
						if (item) {
							item.highlight(true);
							this.data('currentlyHighlighted', item);
						}
					break;

					case 'build':
						var item = ige.client.data('ghostItem');
						if (item) {
							// We have a ghost item so move it to where the
							// mouse is!

							// Check the tile is not currently occupied!
							if (!ige.client.tileMap1.map.collision(x, y, item.data('tileWidth'), item.data('tileHeight'))) {
								// The tile is not occupied so move to it!
								item.data('tileX', x)
									.data('tileY', y)
									.translateToTile(x, y);
							}
						}
					break;
				}
			})
			.mouseUp(function (x, y) {
				// Check what mode our cursor is in
				switch (ige.client.data('cursorMode')) {
					case 'select':

					break;

					case 'move':
					break;

					case 'delete':
						var item = ige.client.itemAt(x, y);

						if (item) {
							// Ask the server to remove the item
							ige.network.send('removeItem', {
								tileX: item.data('tileX'),
								tileY: item.data('tileY')
							});

							this.data('currentlyHighlighted', false);

							// Remove the item from the engine
							item.destroy();
						}
					break;

					case 'build':
						var item = ige.client.data('ghostItem'),
							tempItem;

						if (item && item.data('tileX') !== -1000 && item.data('tileY') !== -1000) {
							if (item.data('tileX') > -1 && item.data('tileY') > -1) {
								// TODO: Use the collision map to check that the tile location is allowed for building! At the moment you can basically build anywhere and that sucks!
								// Clear out reference to the ghost item
								ige.client.data('ghostItem', false);

								// Turn the ghost item into a "real" building
								item.opacity(1)
									.place()
									.build(Math.floor(Math.random() * 8) + 3); // A skyscraper-only method that tells it to add a floor up to the number specified

								// Now that we've placed a building, ask the server
								// to ok / save the request. If the server doesn't
								// tell us anything then the building is obviously ok!
								// TODO: The server won't deny anything, it will just record the build request at the moment!
								ige.network.send('placeItem', {
									classId: item._classId,
									tileX: item.data('tileX'),
									tileY: item.data('tileY'),
									floors: item.data('floors'),
									buildFloors: item.data('buildFloors')
								});

								// Now create a new temporary building
								tempItem = ige.client.createTemporaryItem('SkyScraper')
									.opacity(0.7);

								ige.client.data('ghostItem', tempItem);
							}
						}
					break;
				}
			})
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
		this.menuBar = new IgeUiEntity()
			.id('menuBar')
			.depth(10)
			.backgroundColor('#333333')
			.left(0)
			.top(0)
			.width('100%')
			.height(40)
			.mount(this.uiScene);

		// Create the menu bar buttons
		this.uiButtonSelect = new IgeUiRadioButton()
			.id('uiButtonSelect')
			.left(3)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonSelect)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
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
				this.select();
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'select');
				this.backgroundColor('#00baff');
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				ige.client.data('currentlyHighlighted', false);
			})
			.select() // Start with this default selected
			.mount(this.menuBar);

		this.uiButtonMove = new IgeUiRadioButton()
			.id('uiButtonMove')
			.left(40)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonMove)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'move') {
					this.backgroundColor('#6b6b6b');
				}
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'move') {
					this.backgroundColor('');
				}
			})
			.mouseUp(function () {
				this.select();
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'move');
				this.backgroundColor('#00baff');
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				ige.client.data('currentlyHighlighted', false);
			})
			.mount(this.menuBar);

		this.uiButtonDelete = new IgeUiRadioButton()
			.id('uiButtonDelete')
			.left(77)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonDelete)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'delete') {
					this.backgroundColor('#6b6b6b');
				}
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'delete') {
					this.backgroundColor('');
				}
			})
			.mouseUp(function () {
				this.select();
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'delete');
				this.backgroundColor('#00baff');
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				ige.client.data('currentlyHighlighted', false);
			})
			.mount(this.menuBar);

		this.uiButtonBuildings = new IgeUiRadioButton()
			.id('uiButtonBuildings')
			.left(124)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonHouse)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'build') {
					this.backgroundColor('#6b6b6b');
				}
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'build') {
					this.backgroundColor('');
				}
			})
			.mouseUp(function () {
				this.select();
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'build');
				this.backgroundColor('#00baff');

				// Because this is just a demo we are going to assume the user
				// wants to build a skyscraper but actually we should probably
				// fire up a menu here and let them pick from available buildings
				// TODO: Make this show a menu of buildings and let the user pick
				var tempItem = ige.client.createTemporaryItem('SkyScraper')
					.opacity(0.7);

				ige.client.data('ghostItem', tempItem);
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				ige.client.data('currentlyHighlighted', false);
				this.backgroundColor('');

				// If we had a temporary building, kill it
				var item = ige.client.data('ghostItem');
				if (item) {
					item.destroy();
					ige.client.data('ghostItem', false);
				}
			})
			.mount(this.menuBar);
	},

	/**
	 * Create some default entities to show how to create them
	 * in code.
	 */
	setupEntities: function () {
		/*this.placeItem('Bank', 0, 6);
		this.placeItem('Electricals', 2, 6);
		this.placeItem('Burgers', 4, 6);*/

		// Skyscrapers are special buildings because they can
		// add new floors and have an optional crane on top that
		// can be shown in four directions (se, sw, ne, nw).
		// Each floor is actually it's own distinct entity but
		// the entire skyscraper can be moved around or removed
		// from the scene as one single entity. Take a look in the
		// ClientObjects.js file to see how it is defined!
		/*this.placeItem('SkyScraper', 15, 10)
			.build(5);

		this.placeItem('SkyScraper', 1, 4)
			.addFloors(2);*/
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