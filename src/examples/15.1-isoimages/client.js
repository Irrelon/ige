import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { IgeFSM } from "../../engine/core/IgeFSM.js";
import { IgeTexture } from "../../engine/core/IgeTexture.js";
import { IgeTween } from "../../engine/core/IgeTween.js";
import { IgeUiEntity } from "../../engine/core/IgeUiEntity.js";
import { ige } from "../../engine/instance.js";
import { IgeUiRadioButton } from "../../engine/ui/IgeUiRadioButton.js";
import { DefaultLevel } from "../../examples/15.1-isoimages/graphs/DefaultLevel.js";

var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};

export class Client extends IgeBaseClass {
	constructor() {
		super();
		this.classId = "Client";
		this.gameTextures = {};
		this.fsm = new IgeFSM();
		void this.init();
	}
	init() {
		return __awaiter(this, void 0, void 0, function* () {
			// Enabled texture smoothing when scaling textures
			ige.engine.globalSmoothing(true);
			this.defineFSM();
			yield this.start();
		});
	}
	start() {
		return __awaiter(this, void 0, void 0, function* () {
			// Wait for our textures to load before continuing
			this.loadTextures();
			yield ige.textures.whenLoaded();
			// Create the HTML canvas
			ige.engine.createFrontBuffer(true);
			// Start the engine
			yield ige.engine.start();
			ige.engine.viewportDepth(true);
			yield ige.engine.addGraph(IgeBaseScene);
			yield ige.engine.addGraph(DefaultLevel);
			// Create the UI entities
			this.setupUi();
			// Set up the initial entities
			this.setupEntities();
			// Set the initial fsm state
			yield this.fsm.initialState("select");
		});
	}
	defineFSM() {
		this.fsm = new IgeFSM();
		// Define the fsm states
		this.fsm.defineState("select", {
			enter: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					// Hook mouse events
					completeCallback();
				}),
			exit: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					// Un-hook mouse events
					completeCallback();
				})
		});
		this.fsm.defineState("buildDialog", {
			enter: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					completeCallback();
				}),
			exit: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					completeCallback();
				})
		});
		let mouseMoveHandler;
		let mouseUpHandler;
		this.fsm.defineState("build", {
			enter: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					const tileMap = ige.$("tileMap1");
					// Create a new instance of the object we are going to build
					let cursorObject = new ige.classStore[data.classId]().mount(tileMap);
					mouseMoveHandler = () => {
						const tile = tileMap.mouseToTile(),
							objectTileWidth = cursorObject._bounds3d.x / tileMap._tileWidth,
							objectTileHeight = cursorObject._bounds3d.y / tileMap._tileHeight;
						// Check that the tiles this object will occupy if moved are
						// not already occupied
						if (
							!tileMap.isTileOccupied(tile.x, tile.y, objectTileWidth, objectTileHeight) &&
							tileMap.inGrid(tile.x, tile.y, objectTileWidth, objectTileHeight)
						) {
							// Move our cursor object to the tile
							cursorObject.translateToTile(
								tile.x + cursorObject._tileAdjustX,
								tile.y + cursorObject._tileAdjustY
							);
							this.cursorTile = tile;
						}
					};
					mouseUpHandler = () => {
						const objectTileWidth = cursorObject._bounds3d.x / tileMap._tileWidth,
							objectTileHeight = cursorObject._bounds3d.y / tileMap._tileHeight;
						// Build the cursorObject by releasing it from our control
						// and switching state
						cursorObject.occupyTile(
							this.cursorTile.x,
							this.cursorTile.y,
							objectTileWidth,
							objectTileHeight
						);
						// Tween the object to the position by "bouncing" it
						cursorObject.translate().z(100);
						new IgeTween(
							cursorObject._translate,
							{
								z: 0
							},
							1000,
							{
								easing: "outBounce"
							}
						).start();
						cursorObject = null;
						// Play the coin particle effect
						ige.$("coinEmitter").start();
						ige.client.fsm.enterState("select");
					};
					// Hook mouse events
					tileMap.on("mouseMove", mouseMoveHandler);
					tileMap.on("mouseUp", mouseUpHandler);
					completeCallback();
				}),
			exit: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					// Clear our mouse listeners
					const tileMap = ige.$("tileMap1");
					tileMap.off("mouseUp", mouseUpHandler);
					tileMap.off("mouseMove", mouseMoveHandler);
					completeCallback();
				})
		});
		this.fsm.defineState("pan", {
			enter: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					completeCallback();
				}),
			exit: (data, completeCallback) =>
				__awaiter(this, void 0, void 0, function* () {
					completeCallback();
				})
		});
	}
	loadTextures() {
		this.gameTextures.background1 = new IgeTexture("background1", "../assets/textures/backgrounds/grassTile.png");
		this.gameTextures.bank = new IgeTexture("bank", "../assets/textures/buildings/bank1.png");
		this.gameTextures.electricals = new IgeTexture(
			"electricals",
			"../assets/textures/buildings/electricalsShop1.png"
		);
		this.gameTextures.burgers = new IgeTexture("burgers", "../assets/textures/buildings/burgerShop1.png");
		this.gameTextures.base_se = new IgeTexture("base_se", "../assets/textures/buildings/base_se.png");
		this.gameTextures.base_se_left = new IgeTexture(
			"base_se_left",
			"../assets/textures/buildings/base_se_left.png"
		);
		this.gameTextures.base_se_middle = new IgeTexture(
			"base_se_middle",
			"../assets/textures/buildings/base_se_middle.png"
		);
		this.gameTextures.base_se_right = new IgeTexture(
			"base_se_right",
			"../assets/textures/buildings/base_se_right.png"
		);
		this.gameTextures.base_sw = new IgeTexture("base_sw", "../assets/textures/buildings/base_sw.png");
		this.gameTextures.base_sw_left = new IgeTexture(
			"base_sw_left",
			"../assets/textures/buildings/base_sw_left.png"
		);
		this.gameTextures.base_sw_middle = new IgeTexture(
			"base_sw_middle",
			"../assets/textures/buildings/base_sw_middle.png"
		);
		this.gameTextures.base_sw_right = new IgeTexture(
			"base_sw_right",
			"../assets/textures/buildings/base_sw_right.png"
		);
		this.gameTextures.stacker_se = new IgeTexture("stacker_se", "../assets/textures/buildings/stacker_se.png");
		this.gameTextures.stacker_se_left = new IgeTexture(
			"stacker_se_left",
			"../assets/textures/buildings/stacker_se_left.png"
		);
		this.gameTextures.stacker_se_middle = new IgeTexture(
			"stacker_se_middle",
			"../assets/textures/buildings/stacker_se_middle.png"
		);
		this.gameTextures.stacker_se_right = new IgeTexture(
			"stacker_se_right",
			"../assets/textures/buildings/stacker_se_right.png"
		);
		this.gameTextures.stacker_sw = new IgeTexture("stacker_sw", "../assets/textures/buildings/stacker_sw.png");
		this.gameTextures.stacker_sw_left = new IgeTexture(
			"stacker_sw_left",
			"../assets/textures/buildings/stacker_sw_left.png"
		);
		this.gameTextures.stacker_sw_middle = new IgeTexture(
			"stacker_sw_middle",
			"../assets/textures/buildings/stacker_sw_middle.png"
		);
		this.gameTextures.stacker_sw_right = new IgeTexture(
			"stacker_sw_right",
			"../assets/textures/buildings/stacker_sw_right.png"
		);
		this.gameTextures.crane_se = new IgeTexture("crane_se", "../assets/textures/buildings/crane_se.png");
		this.gameTextures.crane_sw = new IgeTexture("crane_sw", "../assets/textures/buildings/crane_sw.png");
		this.gameTextures.crane_ne = new IgeTexture("crane_ne", "../assets/textures/buildings/crane_ne.png");
		this.gameTextures.crane_nw = new IgeTexture("crane_nw", "../assets/textures/buildings/crane_nw.png");
		this.gameTextures.uiButtonSelect = new IgeTexture(
			"uiButtonSelect",
			"../assets/textures/ui/uiButton_select.png"
		);
		this.gameTextures.uiButtonMove = new IgeTexture("uiButtonMove", "../assets/textures/ui/uiButton_move.png");
		this.gameTextures.uiButtonDelete = new IgeTexture(
			"uiButtonDelete",
			"../assets/textures/ui/uiButton_delete.png"
		);
		this.gameTextures.uiButtonHouse = new IgeTexture("uiButtonHouse", "../assets/textures/ui/uiButton_house.png");
	}
	/**
	 * Creates the UI entities that the user can interact with to
	 * perform certain tasks like placing and removing buildings.
	 */
	setupUi() {
		const uiScene = ige.$("uiScene");
		// Create the top menu bar
		const menuBar = new IgeUiEntity()
			.id("menuBar")
			.depth(10)
			.backgroundColor("#333333")
			.left(0)
			.top(0)
			.width("100%")
			.height(40)
			.pointerDown(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			.pointerUp(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			.mount(uiScene);
		// Create the menu bar buttons
		const uiButtonSelect = new IgeUiRadioButton()
			.id("uiButtonSelect")
			.left(3)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonSelect)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.pointerOver(() => {
				if (ige.client.data("cursorMode") !== "select") {
					ige.$("uiButtonSelect").backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(() => {
				if (ige.client.data("cursorMode") !== "select") {
					ige.$("uiButtonSelect").backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(() => {
				ige.input.stopPropagation();
			})
			.pointerUp(() => {
				ige.$("uiButtonSelect").select();
				ige.input.stopPropagation();
			})
			.pointerMove(() => {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(() => {
				ige.client.data("cursorMode", "select");
				ige.$("uiButtonSelect").backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(() => {
				ige.$("uiButtonSelect").backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.select() // Start with this default selected
			.mount(menuBar);
		const uiButtonMove = new IgeUiRadioButton()
			.id("uiButtonMove")
			.left(40)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonMove)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.pointerOver(() => {
				if (ige.client.data("cursorMode") !== "move") {
					uiButtonMove.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(() => {
				if (ige.client.data("cursorMode") !== "move") {
					uiButtonMove.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(() => {
				ige.input.stopPropagation();
			})
			.pointerUp(() => {
				uiButtonMove.select();
				ige.input.stopPropagation();
			})
			.pointerMove(() => {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(() => {
				ige.client.data("cursorMode", "move");
				uiButtonMove.backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(() => {
				uiButtonMove.backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.mount(menuBar);
		const uiButtonDelete = new IgeUiRadioButton()
			.id("uiButtonDelete")
			.left(77)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonDelete)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.pointerOver(function () {
				if (ige.client.data("cursorMode") !== "delete") {
					uiButtonDelete.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				if (ige.client.data("cursorMode") !== "delete") {
					uiButtonDelete.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				uiButtonDelete.select();
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "delete");
				uiButtonDelete.backgroundColor("#00baff");
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				uiButtonDelete.backgroundColor("");
				ige.client.data("currentlyHighlighted", false);
			})
			.mount(menuBar);
		this.setupUi_BuildingsMenu();
	}
	setupUi_BuildingsMenu() {
		const uiScene = ige.$("uiScene");
		const menuBar = ige.$("menuBar");
		// First, create an entity that will act as a drop-down menu
		this.uiMenuBuildings = new IgeUiEntity()
			.id("uiMenuBuildings")
			.left(120)
			.top(40)
			.width(200)
			.height(200)
			.backgroundColor("#222")
			.mount(uiScene)
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerOver(function () {
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			.hide();
		// Now add the building "buttons" that will allow the user to select
		// the type of building they want to build
		const uiMenuBuildings_bank = new IgeUiRadioButton()
			.id("uiMenuBuildings_bank")
			.data("buildingType", "Bank") // Set the class to instantiate from this button
			.top(0)
			.left(0)
			.texture(this.gameTextures.bank)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's pointer events
			.pointerOver(function () {
				if (!uiMenuBuildings_bank._uiSelected) {
					uiMenuBuildings_bank.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				if (!uiMenuBuildings_bank._uiSelected) {
					uiMenuBuildings_bank.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				uiMenuBuildings_bank.select();
				//}
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				uiMenuBuildings_bank.backgroundColor("#00baff");
				const tempItem = ige.client.createTemporaryItem(uiMenuBuildings_bank.data("buildingType")).opacity(0.7);
				ige.client.data("ghostItem", tempItem);
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				uiMenuBuildings_bank.backgroundColor("");
				// If we had a temporary building, kill it
				const item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});
		const uiMenuBuildings_burgers = new IgeUiRadioButton()
			.id("uiMenuBuildings_burgers")
			.data("buildingType", "Burgers") // Set the class to instantiate from this button
			.top(0)
			.left(50)
			.texture(this.gameTextures.burgers)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's pointer events
			.pointerOver(function () {
				if (!uiMenuBuildings_burgers._uiSelected) {
					uiMenuBuildings_burgers.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				if (!uiMenuBuildings_burgers._uiSelected) {
					uiMenuBuildings_burgers.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				uiMenuBuildings_burgers.select();
				//}
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				uiMenuBuildings_burgers.backgroundColor("#00baff");
				const tempItem = ige.client
					.createTemporaryItem(uiMenuBuildings_burgers.data("buildingType"))
					.opacity(0.7);
				ige.client.data("ghostItem", tempItem);
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				uiMenuBuildings_burgers.backgroundColor("");
				// If we had a temporary building, kill it
				const item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});
		const uiMenuBuildings_electricals = new IgeUiRadioButton()
			.id("uiMenuBuildings_electricals")
			.data("buildingType", "Electricals") // Set the class to instantiate from this button
			.top(0)
			.left(100)
			.texture(this.gameTextures.electricals)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuBuildings")
			// Define the button's pointer events
			.pointerOver(function () {
				if (!uiMenuBuildings_electricals._uiSelected) {
					uiMenuBuildings_electricals.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				if (!uiMenuBuildings_electricals._uiSelected) {
					uiMenuBuildings_electricals.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
				// The item is NOT already selected so select it!
				uiMenuBuildings_electricals.select();
				//}
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				uiMenuBuildings_electricals.backgroundColor("#00baff");
				const tempItem = ige.client
					.createTemporaryItem(uiMenuBuildings_electricals.data("buildingType"))
					.opacity(0.7);
				ige.client.data("ghostItem", tempItem);
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				uiMenuBuildings_electricals.backgroundColor("");
				// If we had a temporary building, kill it
				const item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			});
		const uiButtonBuildings = new IgeUiRadioButton()
			.id("uiButtonBuildings")
			.left(124)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonHouse)
			// Set the radio group so the controls will receive group events
			.radioGroup("menuControl")
			.pointerOver(function () {
				if (ige.client.data("cursorMode") !== "build") {
					uiButtonBuildings.backgroundColor("#6b6b6b");
				}
				ige.input.stopPropagation();
			})
			.pointerOut(function () {
				if (ige.client.data("cursorMode") !== "build") {
					uiButtonBuildings.backgroundColor("");
				}
				ige.input.stopPropagation();
			})
			.pointerDown(function () {
				ige.input.stopPropagation();
			})
			.pointerUp(function () {
				uiButtonBuildings.select();
				ige.input.stopPropagation();
			})
			.pointerMove(function () {
				if (ige.client.data("cursorMode") !== "panning") {
					ige.input.stopPropagation();
				}
			})
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data("cursorMode", "build");
				uiButtonBuildings.backgroundColor("#00baff");
				// Show the buildings drop-down
				ige.$("uiMenuBuildings").show();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				// Hide the buildings drop-down
				ige.$("uiMenuBuildings").hide();
				ige.client.data("currentlyHighlighted", false);
				uiButtonBuildings.backgroundColor("");
				// If we had a temporary building, kill it
				const item = ige.client.data("ghostItem");
				if (item) {
					item.destroy();
					ige.client.data("ghostItem", false);
				}
			})
			.mount(menuBar);
	}
	setupEntities() {
		// Create an entity
		this.placeItem("Bank", 0, 6);
		this.placeItem("Electricals", 2, 6);
		this.placeItem("Burgers", 5, 6);
	}
	/**
	 * Place a building on the map.
	 * @param type
	 * @param tileX
	 * @param tileY
	 * @return {*}
	 */
	placeItem(type, tileX, tileY) {
		const item = new ige.classStore[type]().mount(ige.$("tileMap1")).translateToTile(tileX, tileY);
		return item;
	}
	/**
	 * Removes an item from the tile map and destroys the entity
	 * from memory.
	 * @param tileX
	 * @param tileY
	 */
	removeItem(tileX, tileY) {
		const item = this.itemAt(tileX, tileY);
		if (item) {
			item.destroy();
		}
	}
	/**
	 * Returns the item occupying the tile co-ordinates of the tile map.
	 * @param tileX
	 * @param tileY
	 */
	itemAt(tileX, tileY) {
		// Return the data at the map's tile co-ordinates
		return ige.$("tileMap1").map.tileData(tileX, tileY);
	}
	/**
	 * Creates and returns a temporary item that can be used
	 * to indicate to the player where their item will be built.
	 * @param type
	 */
	createTemporaryItem(type) {
		// Create a new item at a far off tile position - it will
		// be moved to follow the mouse cursor anyway but it's cleaner
		// to create it off-screen first.
		return new this[type](ige.$("tileMap1"), -1000, -1000).debugTransforms(true);
	}
	/**
	 * Handles when the mouse up event occurs on our map (tileMap1).
	 * @param x
	 * @param y
	 * @private
	 */
	_mapOnPointerUp(x, y) {
		// Check what mode our cursor is in
		switch (ige.client.data("cursorMode")) {
			case "select":
				break;
			case "move": {
				// Check if we are already moving an item
				if (!ige.client.data("moveItem")) {
					// We're not already moving an item so check if the user
					// just clicked on a building
					const item = ige.client.itemAt(x, y);
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
					const item = ige.client.data("moveItem"),
						moveX = item.data("lastMoveX"),
						moveY = item.data("lastMoveY");
					item.moveTo(moveX, moveY);
					// Ask the server to move the item
					// **SERVER-CALL**
					// apiUrl = ''; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process
					// if (apiUrl) {
					// 	$.ajax(apiUrl, {
					// 		dataType: 'json',
					// 		data: {
					// 			action: 'move',
					// 			fromX: ige.client.data('moveItemX'),
					// 			fromY: ige.client.data('moveItemY'),
					// 			classId: item._classId,
					// 			tileX: item.data('tileX'),
					// 			tileY: item.data('tileY')
					// 		},
					// 		success (data, status, requestObject) {
					// 			// Do what you want with the server return value
					// 		}
					// 	});
					// }
					// Clear the data
					ige.client.data("moveItem", "");
				}
				break;
			}
			case "delete": {
				const item = ige.client.itemAt(x, y);
				if (item) {
					// Ask the server to remove the item
					// **SERVER-CALL**
					// apiUrl = ""; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
					// if (apiUrl) {
					// 	$.ajax(apiUrl, {
					// 		dataType: "json",
					// 		data: {
					// 			action: "delete",
					// 			classId: item._classId,
					// 			tileX: item.data("tileX"),
					// 			tileY: item.data("tileY")
					// 		},
					// 		success (data, status, requestObject) {
					// 			// Do what you want with the server return value
					// 		}
					// 	});
					// }
					this.data("currentlyHighlighted", false);
					// Remove the item from the engine
					item.destroy();
				}
				break;
			}
			case "build": {
				const item = ige.client.data("ghostItem");
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
						// apiUrl = ""; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
						// if (apiUrl) {
						// 	$.ajax(apiUrl, {
						// 		dataType: "json",
						// 		data: {
						// 			action: "build",
						// 			classId: item._classId,
						// 			tileX: item.data("tileX"),
						// 			tileY: item.data("tileY")
						// 		},
						// 		success (data, status, requestObject) {
						// 			// Do what you want with the server return value
						// 		}
						// 	});
						// }
						// Now create a new temporary building
						const tempItem = ige.client
							.createTemporaryItem(item._classId) // SkyScraper, Electricals etc
							.opacity(0.7);
						ige.client.data("ghostItem", tempItem);
					}
				}
				break;
			}
		}
	}
	/**
	 * Handles when the mouse over event occurs on our map (tileMap1).
	 * @param event
	 * @param evc
	 * @private
	 */
	_mapOnPointerOver(event, evc) {
		const mp = this.mouseToTile(),
			x = mp.x,
			y = mp.y;
		switch (ige.client.data("cursorMode")) {
			case "select": {
				// If we already have a selection, un-highlight it
				if (this.data("currentlyHighlighted")) {
					this.data("currentlyHighlighted").highlight(false);
				}
				// Highlight the building at the map x, y
				const item = ige.client.itemAt(x, y);
				if (item) {
					item.highlight(true);
					this.data("currentlyHighlighted", item);
				}
				break;
			}
			case "delete": {
				// If we already have a selection, un-highlight it
				if (this.data("currentlyHighlighted")) {
					this.data("currentlyHighlighted").highlight(false);
				}
				// Highlight the building at the map x, y
				const item = ige.client.itemAt(x, y);
				if (item) {
					item.highlight(true);
					this.data("currentlyHighlighted", item);
				}
				break;
			}
			case "move": {
				const item = ige.client.data("moveItem"),
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
			}
			case "build": {
				const item = ige.client.data("ghostItem");
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
	}
}
