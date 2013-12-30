var Client = IgeClass.extend({
	classId: 'Client',

	init: function () {
		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

		var self = this;

		self.gameTextures = {};
		self.fsm = new IgeFSM();

		self.defineFSM();
		self.start();
	},
	
	start: function () {
		var self = this;
		
		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.viewportDepth(true);
					
					ige.addGraph('IgeBaseScene');
					ige.addGraph('DefaultLevel');
					
					// Create the UI entities
					self.setupUi();

					// Setup the initial entities
					self.setupEntities();
					
					// Set the initial fsm state
					self.fsm.initialState('select');
				}
			});
		});
		
		self.loadTextures();
	},
	
	defineFSM: function () {
		var self = this;
		self.fsm = new IgeFSM();
		
		// Define the fsm states
		self.fsm.defineState('select', {
            enter: function(data, completeCallback) {
				// Hook mouse events
				completeCallback();
			},
            exit: function(data, completeCallback) {
				// Un-hook mouse events
				completeCallback();
			}
        });
		
		self.fsm.defineState('buildDialog', {
            enter: function(data, completeCallback) {
				completeCallback();
			},
            exit: function(data, completeCallback) {
				completeCallback();
			}
        });
		
		self.fsm.defineState('build', {
            enter: function(data, completeCallback) {
				var self = this,
					tileMap = ige.$('tileMap1');
				
				// Create a new instance of the object we are going to build
				self.cursorObject = new ige.newClassInstance(data.classId)
					.mount(ige.$('tileMap1'));
				
				// Hook mouse events
				self.mouseMoveHandle = tileMap.on('mouseMove', function (event, evc, data) {
					var tile = tileMap.mouseToTile(),
						objectTileWidth = self.cursorObject._bounds3d.x / tileMap._tileWidth,
						objectTileHeight = self.cursorObject._bounds3d.y / tileMap._tileHeight;
					
					// Check that the tiles this object will occupy if moved are
					// not already occupied
					if (!tileMap.isTileOccupied(
						tile.x,
						tile.y,
						objectTileWidth,
						objectTileHeight
					) && tileMap.inGrid(tile.x, tile.y, objectTileWidth, objectTileHeight)) {
						// Move our cursor object to the tile
						self.cursorObject.translateToTile(tile.x + self.cursorObject._tileAdjustX, tile.y + self.cursorObject._tileAdjustY);
						self.cursorTile = tile;
					}
				});
				
				self.mouseUpHandle = tileMap.on('mouseUp', function (event, evc, data) {
					var objectTileWidth = self.cursorObject._bounds3d.x / tileMap._tileWidth,
						objectTileHeight = self.cursorObject._bounds3d.y / tileMap._tileHeight;
					
					// Build the cursorObject by releasing it from our control
					// and switching state
					self.cursorObject.occupyTile(
						self.cursorTile.x,
						self.cursorTile.y,
						objectTileWidth,
						objectTileHeight
					);
					
					// Tween the object to the position by "bouncing" it
					self.cursorObject
						.translate().z(100)
						._translate.tween(
							{z: 0},
							1000,
							{easing:'outBounce'}
						).start();
					
					self.cursorObject = null;
					
					// Play the coin particle effect
					ige.$('coinEmitter').start();
					
					ige.client.fsm.enterState('select');
				});
				
				completeCallback();
			},
            exit: function(data, completeCallback) {
				// Clear our mouse listeners
				var self = this,
					tileMap = ige.$('tileMap1');
				
				tileMap.off('mouseUp', self.mouseUpHandle);
				tileMap.off('mouseMove', self.mouseMoveHandle);
				
				completeCallback();
			}
        });
		
		self.fsm.defineState('pan', {
            enter: function(data, completeCallback) {
				completeCallback();
			},
            exit: function(data, completeCallback) {
				completeCallback();
			}
        });
	},

	loadTextures: function () {
		this.gameTextures.background1 = new IgeTexture('../assets/textures/backgrounds/grassTile.png');
		this.gameTextures.bank = new IgeTexture('../assets/textures/buildings/bank1.png');
		this.gameTextures.electricals = new IgeTexture('../assets/textures/buildings/electricalsShop1.png');
		this.gameTextures.burgers = new IgeTexture('../assets/textures/buildings/burgerShop1.png');
		this.gameTextures.base_se = new IgeTexture('../assets/textures/buildings/base_se.png');
		this.gameTextures.base_se_left = new IgeTexture('../assets/textures/buildings/base_se_left.png');
		this.gameTextures.base_se_middle = new IgeTexture('../assets/textures/buildings/base_se_middle.png');
		this.gameTextures.base_se_right = new IgeTexture('../assets/textures/buildings/base_se_right.png');
		this.gameTextures.base_sw = new IgeTexture('../assets/textures/buildings/base_sw.png');
		this.gameTextures.base_sw_left = new IgeTexture('../assets/textures/buildings/base_sw_left.png');
		this.gameTextures.base_sw_middle = new IgeTexture('../assets/textures/buildings/base_sw_middle.png');
		this.gameTextures.base_sw_right = new IgeTexture('../assets/textures/buildings/base_sw_right.png');
		this.gameTextures.stacker_se = new IgeTexture('../assets/textures/buildings/stacker_se.png');
		this.gameTextures.stacker_se_left = new IgeTexture('../assets/textures/buildings/stacker_se_left.png');
		this.gameTextures.stacker_se_middle = new IgeTexture('../assets/textures/buildings/stacker_se_middle.png');
		this.gameTextures.stacker_se_right = new IgeTexture('../assets/textures/buildings/stacker_se_right.png');
		this.gameTextures.stacker_sw = new IgeTexture('../assets/textures/buildings/stacker_sw.png');
		this.gameTextures.stacker_sw_left = new IgeTexture('../assets/textures/buildings/stacker_sw_left.png');
		this.gameTextures.stacker_sw_middle = new IgeTexture('../assets/textures/buildings/stacker_sw_middle.png');
		this.gameTextures.stacker_sw_right = new IgeTexture('../assets/textures/buildings/stacker_sw_right.png');
		this.gameTextures.crane_se = new IgeTexture('../assets/textures/buildings/crane_se.png');
		this.gameTextures.crane_sw = new IgeTexture('../assets/textures/buildings/crane_sw.png');
		this.gameTextures.crane_ne = new IgeTexture('../assets/textures/buildings/crane_ne.png');
		this.gameTextures.crane_nw = new IgeTexture('../assets/textures/buildings/crane_nw.png');

		this.gameTextures.uiButtonSelect = new IgeTexture('../assets/textures/ui/uiButton_select.png');
		this.gameTextures.uiButtonMove = new IgeTexture('../assets/textures/ui/uiButton_move.png');
		this.gameTextures.uiButtonDelete = new IgeTexture('../assets/textures/ui/uiButton_delete.png');
		this.gameTextures.uiButtonHouse = new IgeTexture('../assets/textures/ui/uiButton_house.png');
	},
	
	/**
	 * Creates the UI entities that the user can interact with to
	 * perform certain tasks like placing and removing buildings.
	 */
	setupUi: function () {
		var uiScene = ige.$('uiScene'),
			menuBar;
		
		// Create the top menu bar
		menuBar = new IgeUiEntity()
			.id('menuBar')
			.depth(10)
			.backgroundColor('#333333')
			.left(0)
			.top(0)
			.width('100%')
			.height(40)
			.mouseDown(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			.mouseUp(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			.mount(uiScene);

		// Create the menu bar buttons
		new IgeUiRadioButton()
			.id('uiButtonSelect')
			.left(3)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonSelect)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'select') {
					this.backgroundColor('#6b6b6b');
				}

				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'select') {
					this.backgroundColor('');
				}

				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
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
			.mount(menuBar);

		new IgeUiRadioButton()
			.id('uiButtonMove')
			.left(40)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonMove)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'move') {
					this.backgroundColor('#6b6b6b');
				}

				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'move') {
					this.backgroundColor('');
				}

				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
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
			.mount(menuBar);

		new IgeUiRadioButton()
			.id('uiButtonDelete')
			.left(77)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonDelete)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'delete') {
					this.backgroundColor('#6b6b6b');
				}

				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'delete') {
					this.backgroundColor('');
				}

				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
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
			.mount(menuBar);

		this.setupUi_BuildingsMenu();
	},
	
	setupUi_BuildingsMenu: function () {
		var uiScene = ige.$('uiScene'),
			menuBar = ige.$('menuBar');
		
		// First, create an entity that will act as a drop-down menu
		this.uiMenuBuildings = new IgeUiEntity()
			.id('uiMenuBuildings')
			.left(120)
			.top(40)
			.width(200)
			.height(200)
			.backgroundColor('#222')
			.mount(uiScene)
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseOver(function () {
				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			.hide();
		
		// Now add the building "buttons" that will allow the user to select
		// the type of building they want to build
		new IgeUiRadioButton()
			.id('uiMenuBuildings_bank')
			.data('buildingType', 'Bank') // Set the class to instantiate from this button
			.top(0)
			.left(0)
			.texture(this.gameTextures.bank)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuBuildings')
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor('#6b6b6b');
				}
				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor('');
				}
				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
					// The item is NOT already selected so select it!
					this.select();
				//}
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'build');
				this.backgroundColor('#00baff');
				
				var tempItem = ige.client.createTemporaryItem(this.data('buildingType'))
					.opacity(0.7);

				ige.client.data('ghostItem', tempItem);
				
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				
				// If we had a temporary building, kill it
				var item = ige.client.data('ghostItem');
				if (item) {
					item.destroy();
					ige.client.data('ghostItem', false);
				}
			});
		
		new IgeUiRadioButton()
			.id('uiMenuBuildings_burgers')
			.data('buildingType', 'Burgers') // Set the class to instantiate from this button
			.top(0)
			.left(50)
			.texture(this.gameTextures.burgers)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuBuildings')
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor('#6b6b6b');
				}
				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor('');
				}
				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
					// The item is NOT already selected so select it!
					this.select();
				//}
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'build');
				this.backgroundColor('#00baff');
				
				var tempItem = ige.client.createTemporaryItem(this.data('buildingType'))
					.opacity(0.7);

				ige.client.data('ghostItem', tempItem);
				
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				
				// If we had a temporary building, kill it
				var item = ige.client.data('ghostItem');
				if (item) {
					item.destroy();
					ige.client.data('ghostItem', false);
				}
			});
		
		new IgeUiRadioButton()
			.id('uiMenuBuildings_electricals')
			.data('buildingType', 'Electricals') // Set the class to instantiate from this button
			.top(0)
			.left(100)
			.texture(this.gameTextures.electricals)
			.width(50, true)
			.mount(this.uiMenuBuildings)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuBuildings')
			// Define the button's mouse events
			.mouseOver(function () {
				if (!this._uiSelected) {
					this.backgroundColor('#6b6b6b');
				}
				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (!this._uiSelected) {
					this.backgroundColor('');
				}
				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				// Check if this item is already selected
				//if (!this._uiSelected) {
					// The item is NOT already selected so select it!
					this.select();
				//}
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'build');
				this.backgroundColor('#00baff');
				
				var tempItem = ige.client.createTemporaryItem(this.data('buildingType'))
					.opacity(0.7);

				ige.client.data('ghostItem', tempItem);
				
				ige.input.stopPropagation();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				this.backgroundColor('');
				
				// If we had a temporary building, kill it
				var item = ige.client.data('ghostItem');
				if (item) {
					item.destroy();
					ige.client.data('ghostItem', false);
				}
			});
		
		new IgeUiRadioButton()
			.id('uiButtonBuildings')
			.left(124)
			.top(3)
			.width(32)
			.height(32)
			.texture(ige.client.gameTextures.uiButtonHouse)
			// Set the radio group so the controls will receive group events
			.radioGroup('menuControl')
			.mouseOver(function () {
				if (ige.client.data('cursorMode') !== 'build') {
					this.backgroundColor('#6b6b6b');
				}

				ige.input.stopPropagation();
			})
			.mouseOut(function () {
				if (ige.client.data('cursorMode') !== 'build') {
					this.backgroundColor('');
				}

				ige.input.stopPropagation();
			})
			.mouseDown(function () {
				ige.input.stopPropagation();
			})
			.mouseUp(function () {
				this.select();
				ige.input.stopPropagation();
			})
			.mouseMove(function () { if (ige.client.data('cursorMode') !== 'panning') { ige.input.stopPropagation(); } })
			// Define the callback when the radio button is selected
			.select(function () {
				ige.client.data('cursorMode', 'build');
				this.backgroundColor('#00baff');

				// Show the buildings drop-down
				ige.$('uiMenuBuildings').show();
			})
			// Define the callback when the radio button is de-selected
			.deSelect(function () {
				// Hide the buildings drop-down
				ige.$('uiMenuBuildings').hide();
				
				ige.client.data('currentlyHighlighted', false);
				this.backgroundColor('');

				// If we had a temporary building, kill it
				var item = ige.client.data('ghostItem');
				if (item) {
					item.destroy();
					ige.client.data('ghostItem', false);
				}
			})
			.mount(menuBar);
	},

	setupEntities: function () {
		// Create an entity
		this.placeItem('Bank', 0, 6);
		this.placeItem('Electricals', 2, 6);
		this.placeItem('Burgers', 5, 6);
	},
	
		/**
	 * Place a building on the map.
	 * @param type
	 * @param tileX
	 * @param tileY
	 * @return {*}
	 */
	placeItem: function (type, tileX, tileY) {
		var item = ige.newClassInstance(type)
			.mount(ige.$('tileMap1'))
			.translateToTile(tileX, tileY);

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
		return new this[type](this.tileMap1, -1000, -1000).debugTransforms(true);
	},

	/**
	 * Handles when the mouse up event occurs on our map (tileMap1).
	 * @param x
	 * @param y
	 * @private
	 */
	_mapOnMouseUp: function (x, y) {
		// Check what mode our cursor is in
		switch (ige.client.data('cursorMode')) {
			case 'select':

			break;

			case 'move':
				// Check if we are already moving an item 
				if (!ige.client.data('moveItem')) {
					// We're not already moving an item so check if the user
					// just clicked on a building
					var item = ige.client.itemAt(x, y),
						apiUrl;
					
					if (item) {
						// The user clicked on a building so set this as the
						// building we are moving.
						ige.client.data('moveItem', item);
						ige.client.data('moveItemX', item.data('tileX'));
						ige.client.data('moveItemY', item.data('tileY'));
					}
				} else {
					// We are already moving a building, place this building
					// down now
					var item = ige.client.data('moveItem'),
						moveX = item.data('lastMoveX'),
						moveY = item.data('lastMoveY');
					
					item.moveTo(moveX, moveY);
					
					// Ask the server to move the item
					// **SERVER-CALL**
					apiUrl = ''; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
					if (apiUrl) {
						$.ajax(apiUrl, {
							dataType: 'json',
							data: {
								action: 'move',
								fromX: ige.client.data('moveItemX'),
								fromY: ige.client.data('moveItemY'),
								classId: item._classId,
								tileX: item.data('tileX'),
								tileY: item.data('tileY')
							},
							success: function (data, status, requestObject) {
								// Do what you want with the server return value
							}
						});
					}
					
					// Clear the data
					ige.client.data('moveItem', '');
				}
			break;

			case 'delete':
				var item = ige.client.itemAt(x, y),
					apiUrl;

				if (item) {
					// Ask the server to remove the item
					// **SERVER-CALL**
					apiUrl = ''; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
					if (apiUrl) {
						$.ajax(apiUrl, {
							dataType: 'json',
							data: {
								action: 'delete',
								classId: item._classId,
								tileX: item.data('tileX'),
								tileY: item.data('tileY')
							},
							success: function (data, status, requestObject) {
								// Do what you want with the server return value
							}
						});
					}

					this.data('currentlyHighlighted', false);

					// Remove the item from the engine
					item.destroy();
				}
			break;

			case 'build':
				var item = ige.client.data('ghostItem'),
					tempItem,
					apiUrl;

				if (item && item.data('tileX') !== -1000 && item.data('tileY') !== -1000) {
					if (item.data('tileX') > -1 && item.data('tileY') > -1) {
						// TODO: Use the collision map to check that the tile location is allowed for building! At the moment you can basically build anywhere and that sucks!
						// Clear out reference to the ghost item
						ige.client.data('ghostItem', false);

						// Turn the ghost item into a "real" building
						item.opacity(1)
							.place();

						// Now that we've placed a building, ask the server
						// to ok / save the request. If the server doesn't
						// tell us anything then the building is obviously ok!
						// **SERVER-CALL**
						apiUrl = ''; //apiUrl = 'yourServerSideApiUrl'; // E.g. http://www.myserver.com/api/process.php
						if (apiUrl) {
							$.ajax(apiUrl, {
								dataType: 'json',
								data: {
									action: 'build',
									classId: item._classId,
									tileX: item.data('tileX'),
									tileY: item.data('tileY')
								},
								success: function (data, status, requestObject) {
									// Do what you want with the server return value
								}
							});
						}

						// Now create a new temporary building
						tempItem = ige.client.createTemporaryItem(item._classId) // SkyScraper, Electricals etc
							.opacity(0.7);

						ige.client.data('ghostItem', tempItem);
					}
				}
			break;
		}
	},
	
	/**
	 * Handles when the mouse over event occurs on our map (tileMap1).
	 * @param event
	 * @param evc
	 * @private
	 */
	_mapOnMouseOver: function (event, evc) {
        var mp = this.mouseToTile(),
			x = mp.x,
			y = mp.y;

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
			
			case 'move':
				var item = ige.client.data('moveItem'),
					map = ige.client.tileMap1.map;
				
				if (item) {
					// Check if the current tile is occupied or not
					if (!map.collision(x, y, item.data('tileWidth'), item.data('tileHeight')) || map.collisionWithOnly(x, y, item.data('tileWidth'), item.data('tileHeight'), item)) {
						// We are currently moving an item so update it's
						// translation
						item.translateToTile(x, y);
						
						// Store the last position we accepted
						item.data('lastMoveX', x);
						item.data('lastMoveY', y);
					}
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
							.translateToTile(x, y, 0);
					}
				}
			break;
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }