var Client = IgeClass.extend({
	classId: "Client",

	init: function () {
		ige.addComponent(IgeEditorComponent);

		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

		// Load our textures
		var self = this;

		//ige.debugEnabled(false);
		//ige.debugTiming(false);

		this.obj = [];
		this.gameTexture = {};

		// Implement our game object definitions (see ClientObjects.js)
		this.implement(ClientObjects);

		// Wait for our textures to load before continuing
		ige.on("texturesLoaded", function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.viewportDepth(true);

					// Create the basic scene, viewport etc
					self.setupScene();

					// Create the UI entities
					self.setupUi();

					// Setup the initial entities
					self.setupEntities();
				}
			});
		});

		this.loadTextures();
	},

	loadTextures: function () {
		this.gameTexture.background1 = new IgeTexture("../assets/textures/backgrounds/grassTile.png");
		this.gameTexture.bank = new IgeTexture("../assets/textures/buildings/bank1.png");
		this.gameTexture.electricals = new IgeTexture("../assets/textures/buildings/electricalsShop1.png");
		this.gameTexture.burgers = new IgeTexture("../assets/textures/buildings/burgerShop1.png");
		this.gameTexture.base_se = new IgeTexture("../assets/textures/buildings/base_se.png");
		this.gameTexture.base_se_left = new IgeTexture("../assets/textures/buildings/base_se_left.png");
		this.gameTexture.base_se_middle = new IgeTexture("../assets/textures/buildings/base_se_middle.png");
		this.gameTexture.base_se_right = new IgeTexture("../assets/textures/buildings/base_se_right.png");
		this.gameTexture.base_sw = new IgeTexture("../assets/textures/buildings/base_sw.png");
		this.gameTexture.base_sw_left = new IgeTexture("../assets/textures/buildings/base_sw_left.png");
		this.gameTexture.base_sw_middle = new IgeTexture("../assets/textures/buildings/base_sw_middle.png");
		this.gameTexture.base_sw_right = new IgeTexture("../assets/textures/buildings/base_sw_right.png");
		this.gameTexture.stacker_se = new IgeTexture("../assets/textures/buildings/stacker_se.png");
		this.gameTexture.stacker_se_left = new IgeTexture("../assets/textures/buildings/stacker_se_left.png");
		this.gameTexture.stacker_se_middle = new IgeTexture("../assets/textures/buildings/stacker_se_middle.png");
		this.gameTexture.stacker_se_right = new IgeTexture("../assets/textures/buildings/stacker_se_right.png");
		this.gameTexture.stacker_sw = new IgeTexture("../assets/textures/buildings/stacker_sw.png");
		this.gameTexture.stacker_sw_left = new IgeTexture("../assets/textures/buildings/stacker_sw_left.png");
		this.gameTexture.stacker_sw_middle = new IgeTexture("../assets/textures/buildings/stacker_sw_middle.png");
		this.gameTexture.stacker_sw_right = new IgeTexture("../assets/textures/buildings/stacker_sw_right.png");
		this.gameTexture.crane_se = new IgeTexture("../assets/textures/buildings/crane_se.png");
		this.gameTexture.crane_sw = new IgeTexture("../assets/textures/buildings/crane_sw.png");
		this.gameTexture.crane_ne = new IgeTexture("../assets/textures/buildings/crane_ne.png");
		this.gameTexture.crane_nw = new IgeTexture("../assets/textures/buildings/crane_nw.png");

		this.gameTexture.uiButtonSelect = new IgeTexture("../assets/textures/ui/uiButton_select.png");
		this.gameTexture.uiButtonMove = new IgeTexture("../assets/textures/ui/uiButton_move.png");
		this.gameTexture.uiButtonDelete = new IgeTexture("../assets/textures/ui/uiButton_delete.png");
		this.gameTexture.uiButtonHouse = new IgeTexture("../assets/textures/ui/uiButton_house.png");

		this.gameTexture.simpleBox = new IgeTexture("./assets/textures/smartTextures/simpleBox.js");
	},

	setupScene: function () {
		var self = this;

		// Create the scene
		this.mainScene = new IgeScene2d().id("mainScene");

		// Resize the background and then create a background pattern
		this.gameTexture.background1.resize(40, 20);
		this.backgroundScene = new IgeScene2d()
			.id("backgroundScene")
			.depth(0)
			.backgroundPattern(this.gameTexture.background1, "repeat", true, true)
			.ignoreCamera(true) // We want the scene to remain static
			.mount(this.mainScene);

		this.objectScene = new IgeScene2d().id("objectScene").depth(1).isometric(false).mount(this.mainScene);

		// Create the main viewport
		this.vp1 = new IgeViewport()
			.id("vp1")
			.addComponent(IgeMousePanComponent)
			.addComponent(IgeMouseZoomComponent)
			.mousePan.enabled(true)
			.mouseZoom.enabled(false)
			.autoSize(true)
			.scene(this.mainScene)
			.drawViewArea(true)
			.drawBounds(false)
			.drawBoundsData(false)
			.mount(ige);

		window.addEventListener("keyup", function () {
			if (self.vp1.mousePan.enabled()) {
				self.vp1.mousePan.enabled(false);
				self.vp1.mouseZoom.enabled(true);
			} else {
				self.vp1.mousePan.enabled(true);
				self.vp1.mouseZoom.enabled(false);
			}
		});

		/*// Create the second viewport
		this.vp2 = new IgeViewport()
			.id('vp2')
			.addComponent(IgeMousePanComponent)
			.addComponent(IgeMouseZoomComponent)
			.mousePan.enabled(false)
			.mouseZoom.enabled(true)
			.autoSize(false)
			.left(30)
			.bottom(30)
			.borderColor('#ffffff')
			//.originTo(0, 0, 0)
			.width(300)
			.height(200)
			.layer(2)
			.scene(this.mainScene)
			.drawBounds(false)
			.drawBoundsData(false)
			.mount(ige);*/

		// Create some listeners for when the viewport is being panned
		// so that we don't create an entity accidentally after a mouseUp
		// occurs if we were panning
		this.vp1.mousePan.on("panStart", function () {
			// Store the current cursor mode
			ige.client.data("tempCursorMode", ige.client.data("cursorMode"));

			// Switch the cursor mode
			ige.client.data("cursorMode", "panning");
			ige.components.input.stopPropagation();
		});

		this.vp1.mousePan.on("panEnd", function () {
			// Switch the cursor mode back
			ige.client.data("cursorMode", ige.client.data("tempCursorMode"));
			ige.components.input.stopPropagation();
		});

		// Create the scene that the game items will
		// be mounted to (like the tile map). This scene
		// is then mounted to the main scene.
		this.gameScene = new IgeScene2d().id("gameScene").depth(1).translateTo(0, -360, 0).mount(this.mainScene);

		// Create the UI scene that will have all the UI
		// entities mounted to it. This scene is at a higher
		// depth than gameScene so it will always be rendered
		// "on top" of the other game items which will all
		// be mounted to off of gameScene somewhere down the
		// scenegraph.
		this.uiScene = new IgeScene2d().id("uiScene").depth(2).ignoreCamera(true).mount(this.mainScene);

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
			.id("tileMap1")
			.layer(2)
			.isometricMounts(true)
			.tileWidth(20)
			.tileHeight(20)
			//.drawGrid(40)
			//.drawMouse(true)
			.highlightOccupied(false)
			.mouseOver(this._mapOnMouseOver)
			.mouseUp(this._mapOnMouseUp)
			.depthSortMode(0)
			//.viewChecking(false)
			.mount(this.gameScene);

		this.tileMap1.addComponent(IgeEntityManager);

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
			.id("menuBar")
			.depth(10)
			.backgroundColor("#333333")
			.left(0)
			.top(0)
			.width("100%")
			.height(40)
			.mouseDown(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			.mouseUp(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			.mount(this.uiScene);

		// Create the menu bar buttons
		this.uiButtonSelect = new IgeUiRadioButton()
			.id("uiButtonSelect")
			.left(3)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonSelect)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.mouseOver(function () {
				if (ige.client.data("cursorMode") !== "select") {
					this.backgroundColor("#6b6b6b");
				}

				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data("cursorMode") !== "select") {
					this.backgroundColor("");
				}

				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "select");
				this.backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.select() // Start with this default selected
			.mount(this.menuBar);

		this.uiButtonMove = new IgeUiRadioButton()
			.id("uiButtonMove")
			.left(40)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonMove)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.mouseOver(function () {
				if (ige.client.data("cursorMode") !== "move") {
					this.backgroundColor("#6b6b6b");
				}

				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data("cursorMode") !== "move") {
					this.backgroundColor("");
				}

				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "move");
				this.backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.mount(this.menuBar);

		this.uiButtonDelete = new IgeUiRadioButton()
			.id("uiButtonDelete")
			.left(77)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonDelete)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.mouseOver(function () {
				if (ige.client.data("cursorMode") !== "delete") {
					this.backgroundColor("#6b6b6b");
				}

				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data("cursorMode") !== "delete") {
					this.backgroundColor("");
				}

				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "delete");
				this.backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.mount(this.menuBar);

		this.setupUi_BuildingsMenu();
	},

	setupUi_BuildingsMenu: function () {
		// First, create an entity that will act as a drop-down menu
		this.uiMenuBuildings = new IgeUiEntity()
			.id("uiMenuBuildings")
			.left(120)
			.top(40)
			.width(200)
			.height(200)
			.backgroundColor("#222")
			.mount(this.uiScene)
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseOver(function () {
				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			.hide();

		// Now add the building "buttons" that will allow the user to select
		// the type of building they want to build
		new IgeUiRadioButton()
			.id("uiMenuBuildings_bank")
			.data("buildingType", "Bank") // Set the class to instantiate from this button
			.top(0)
			.left(0)
			.texture(this.gameTexture.bank)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor("#6b6b6b");
				}
				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor("");
				}
				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				this.select();
				//}
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				this.backgroundColor("#00baff");

				var tempItem = ige.client.createTemporaryItem(this.data("buildingType")).opacity(0.7);

				ige.client.data("ghostItem", tempItem);

				ige.components.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");

				// If we had a temporary building, kill it
				var item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});

		new IgeUiRadioButton()
			.id("uiMenuBuildings_burgers")
			.data("buildingType", "Burgers") // Set the class to instantiate from this button
			.top(0)
			.left(50)
			.texture(this.gameTexture.burgers)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor("#6b6b6b");
				}
				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor("");
				}
				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				this.select();
				//}
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				this.backgroundColor("#00baff");

				var tempItem = ige.client.createTemporaryItem(this.data("buildingType")).opacity(0.7);

				ige.client.data("ghostItem", tempItem);

				ige.components.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");

				// If we had a temporary building, kill it
				var item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});

		new IgeUiRadioButton()
			.id("uiMenuBuildings_electricals")
			.data("buildingType", "Electricals") // Set the class to instantiate from this button
			.top(0)
			.left(100)
			.texture(this.gameTexture.electricals)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor("#6b6b6b");
				}
				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor("");
				}
				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				this.select();
				//}
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				this.backgroundColor("#00baff");

				var tempItem = ige.client.createTemporaryItem(this.data("buildingType")).opacity(0.7);

				ige.client.data("ghostItem", tempItem);

				ige.components.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor("");

				// If we had a temporary building, kill it
				var item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});

		this.uiButtonBuildings = new IgeUiRadioButton()
			.id("uiButtonBuildings")
			.left(124)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTexture.uiButtonHouse)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.mouseOver(function () {
				if (ige.client.data("cursorMode") !== "build") {
					this.backgroundColor("#6b6b6b");
				}

				ige.components.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data("cursorMode") !== "build") {
					this.backgroundColor("");
				}

				ige.components.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.components.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.components.input.stopPropagation();
			})
			.mouseMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.components.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				this.backgroundColor("#00baff");

				// Show the buildings drop-down
				ige.$("uiMenuBuildings").show();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				// Hide the buildings drop-down
				ige.$("uiMenuBuildings").hide();

				ige.client.data("currentlyHighlighted", false);
				this.backgroundColor("");

				// If we had a temporary building, kill it
				var item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			})
			.mount(this.menuBar);
	},

	setupEntities: function () {
		// Create an entity
		var i, type, x, y;
		for (i = 0; i < 3000; i++) {
			type = Math.floor(Math.random() * 3);
			x = Math.floor(Math.random() * 500);
			y = Math.floor(Math.random() * 500);

			switch (type) {
			case 0:
				this.placeItem("Bank", x, y);
				break;

			case 1:
				this.placeItem("Electricals", x, y);
				break;

			case 2:
				this.placeItem("Burgers", x, y);
				break;
			}
		}
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
		// Return the data at the map's tile co-ordinates
		return this.tileMap1.map.tileData(tileX, tileY);
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
	},

	/**
	 * Handles when the mouse up event occurs on our map (tileMap1).
	 * @param x
	 * @param y
	 * @private
	 */
	_mapOnMouseUp: function (x, y) {
		// Check what mode our cursor is in
		switch (ige.client.data("cursorMode")) {
		case "select":
			break;

		case "move":
			// Check if we are already moving an item
			if (!ige.client.data("moveItem")) {
				// We're not already moving an item so check if the user
				// just clicked on a building
				var item = ige.client.itemAt(x, y),
					apiUrl;

				if (item) {
					// The user clicked on a building so set this as the
					// building we are moving.
					ige.client.data("moveItem", item);
					ige.client.data("moveItemX", item.data("tileX"));
					ige.client.data("moveItemY", item.data("tileY"));
				}
			} else {
				// We are already moving a building, place this building
				// down now
				var item = ige.client.data("moveItem"),
					moveX = item.data("lastMoveX"),
					moveY = item.data("lastMoveY");

				item.moveTo(moveX, moveY);

				// Ask the server to move the item
				// **SERVER-CALL**
				apiUrl = ""; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
				if (apiUrl) {
					$.ajax(apiUrl, {
						dataType: "json",
						data: {
							action: "move",
							fromX: ige.client.data("moveItemX"),
							fromY: ige.client.data("moveItemY"),
							classId: item._classId,
							tileX: item.data("tileX"),
							tileY: item.data("tileY")
						},
						success: function (data, status, requestObject) {
							// Do what you want with the server return value
						}
					});
				}

				// Clear the data
				ige.client.data("moveItem", "");
			}
			break;

		case "delete":
			var item = ige.client.itemAt(x, y),
				apiUrl;

			if (item) {
				// Ask the server to remove the item
				// **SERVER-CALL**
				apiUrl = ""; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
				if (apiUrl) {
					$.ajax(apiUrl, {
						dataType: "json",
						data: {
							action: "delete",
							classId: item._classId,
							tileX: item.data("tileX"),
							tileY: item.data("tileY")
						},
						success: function (data, status, requestObject) {
							// Do what you want with the server return value
						}
					});
				}

				this.data("currentlyHighlighted", false);

				// Remove the item from the engine
				item.destroy();
			}
			break;

		case "build":
			var item = ige.client.data("ghostItem"),
				tempItem,
				apiUrl;

			if (item && item.data("tileX") !== -1000 && item.data("tileY") !== -1000) {
				if (item.data("tileX") > -1 && item.data("tileY") > -1) {
					// TODO: Use the collision map to check that the tile location is allowed for building! At the moment you can basically build anywhere and that sucks!
					// Clear out reference to the ghost item
					ige.client.data("ghostItem", false);

					// Turn the ghost item into a "real" building
					item.opacity(1).place();

					// Now that we've placed a building, ask the server
					// to ok / save the request. If the server doesn't
					// tell us anything then the building is obviously ok!
					// **SERVER-CALL**
					apiUrl = ""; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
					if (apiUrl) {
						$.ajax(apiUrl, {
							dataType: "json",
							data: {
								action: "build",
								classId: item._classId,
								tileX: item.data("tileX"),
								tileY: item.data("tileY")
							},
							success: function (data, status, requestObject) {
								// Do what you want with the server return value
							}
						});
					}

					// Now create a new temporary building
					tempItem = ige.client
						.createTemporaryItem(item._classId) // SkyScraper, Electricals etc
						.opacity(0.7);

					ige.client.data("ghostItem", tempItem);
				}
			}
			break;
		}
	},

	/**
	 * Handles when the mouse over event occurs on our map (tileMap1).
	 * @param x
	 * @param y
	 * @private
	 */
	_mapOnMouseOver: function (x, y) {
		switch (ige.client.data("cursorMode")) {
		case "select":
			// If we already have a selection, un-highlight it
			if (this.data("currentlyHighlighted")) {
				this.data("currentlyHighlighted").highlight(false);
			}

			// Highlight the building at the map x, y
			var item = ige.client.itemAt(x, y);
			if (item) {
				item.highlight(true);
				this.data("currentlyHighlighted", item);
			}
			break;

		case "delete":
			// If we already have a selection, un-highlight it
			if (this.data("currentlyHighlighted")) {
				this.data("currentlyHighlighted").highlight(false);
			}

			// Highlight the building at the map x, y
			var item = ige.client.itemAt(x, y);
			if (item) {
				item.highlight(true);
				this.data("currentlyHighlighted", item);
			}
			break;

		case "move":
			var item = ige.client.data("moveItem"),
				map = ige.client.tileMap1.map;

			if (item) {
				// Check if the current tile is occupied or not
				if (
					!map.collision(x, y, item.data("tileWidth"), item.data("tileHeight")) ||
						map.collisionWithOnly(x, y, item.data("tileWidth"), item.data("tileHeight"), item)
				) {
					// We are currently moving an item so update it's
					// translation
					item.translateToTile(x, y);

					// Store the last position we accepted
					item.data("lastMoveX", x);
					item.data("lastMoveY", y);
				}
			}
			break;

		case "build":
			var item = ige.client.data("ghostItem");
			if (item) {
				// We have a ghost item so move it to where the
				// mouse is!

				// Check the tile is not currently occupied!
				if (!ige.client.tileMap1.map.collision(x, y, item.data("tileWidth"), item.data("tileHeight"))) {
					// The tile is not occupied so move to it!
					item.data("tileX", x).data("tileY", y).translateToTile(x, y, 0);
				}
			}
			break;
		}
	}
});

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	module.exports = Client;
}
