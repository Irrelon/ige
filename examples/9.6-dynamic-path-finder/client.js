var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);
		ige.globalSmoothing(true);

		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// SET THIS TO TRUE TO USE ISOMETRIC OUTPUT
				// OR FALSE TO USE 2D OUTPUT. THIS DEMO WORKS
				// IN BOTH 2D AND ISOMETRIC! GIVE IT A GO!
				self.isoMode = true;

				// Create the scene
				self.mainScene = new IgeScene2d()
					.id('mainScene')
					.drawBounds(false)
					.drawBoundsData(false);

				self.objectScene = new IgeScene2d()
					.id('objectScene')
					.depth(0)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.mainScene);

				self.uiScene = new IgeScene2d()
					.id('uiScene')
					.depth(1)
					.drawBounds(false)
					.drawBoundsData(false)
					.ignoreCamera(true) // We don't want the UI scene to be affected by the viewport's camera
					.mount(self.mainScene);

				// Create the main viewport
				self.vp1 = new IgeViewport()
					.addComponent(IgeMousePanComponent)
					.mousePan.limit(new IgeRect(-300, -100, 600, 200))
					.mousePan.enabled(true)
					.id('vp1')
					.autoSize(true)
					.scene(self.mainScene)
					.drawMouse(true)
					.drawBounds(true)
					.drawBoundsData(true)
					.mount(ige);
				
				self.vp1.camera.translateTo(50, 100, 0);

				// Create some listeners for when the viewport is being panned
				// so that we don't create a new path accidentally after a mouseUp
				// occurs if we were panning
				self.vp1.mousePan.on('panStart', function () {
					// Store the current cursor mode
					ige.client.data('tempCursorMode', ige.client.data('cursorMode'));

					// Switch the cursor mode
					ige.client.data('cursorMode', 'panning');
					ige.input.stopPropagation();
				});

				self.vp1.mousePan.on('panEnd', function () {
					// Switch the cursor mode back
					ige.client.data('cursorMode', ige.client.data('tempCursorMode'));
					ige.input.stopPropagation();
				});

				// Create an isometric tile map
				self.tileMap1 = new IgeTileMap2d()
					.id('tileMap1')
					.isometricMounts(self.isoMode)
					.tileWidth(40)
					.tileHeight(40)
					.drawGrid(3)
					.drawMouse(true)
					.drawBounds(false)
					.drawBoundsData(false)
					 // Mark tile as occupied with a value of 1 (x, y, width, height, value)
					.loadMap({"data":{"0":{"1":1,"5":1,"6":1,"14":1,"-1":1},"1":{"1":1,"3":1,"6":1,"7":1,"8":1,"9":1,"11":1,"14":1,"-1":1},"2":{"3":1,"4":1,"8":1,"11":1,"12":1,"14":1,"-1":1},"3":{"1":1,"6":1,"8":1,"11":1,"14":1,"-1":1},"4":{"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"8":1,"14":1,"-1":1,"-2":1,"-3":1},"5":{"8":1,"10":1,"11":1,"12":1,"14":1,"-3":1},"6":{"0":1,"1":1,"2":1,"4":1,"5":1,"6":1,"8":1,"12":1,"14":1,"-1":1,"-3":1},"7":{"1":1,"5":1,"8":1,"9":1,"10":1,"12":1,"14":1,"-1":1,"-3":1},"8":{"3":1,"12":1,"14":1,"-1":1,"-3":1},"9":{"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"8":1,"9":1,"10":1,"11":1,"12":1,"14":1,"-3":1},"10":{"0":1,"1":1,"6":1,"14":1,"-1":1,"-2":1,"-3":1},"11":{"6":1,"7":1,"8":1,"9":1,"10":1,"11":1,"12":1,"13":1,"14":1},"-1":{"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"8":1,"9":1,"10":1,"11":1,"12":1,"13":1,"14":1,"-1":1,"-2":1,"-3":1,"-4":1},"-2":{"3":1,"5":1,"7":1,"8":1,"-4":1},"-3":{"1":1,"5":1,"7":1,"-1":1,"-2":1,"-3":1,"-4":1},"-4":{"1":1,"2":1,"3":1,"4":1,"5":1,"7":1,"-1":1},"-5":{"5":1,"7":1,"-1":1},"-6":{"1":1,"2":1,"3":1,"7":1,"-1":1},"-7":{"7":1,"-1":1},"-8":{"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"6":1,"7":1,"-1":1}},"dataXY":[-4,-8]})
					.highlightOccupied(true) // Draws a red tile wherever a tile is "occupied"
					.mount(self.objectScene);

				// Define a function that will be called when the
				// mouse cursor moves over one of our entities
				overFunc = function () {
					this.highlight(true);
					this.drawBounds(true);
					this.drawBoundsData(true);
				};

				// Define a function that will be called when the
				// mouse cursor moves away from one of our entities
				outFunc = function () {
					this.highlight(false);
					this.drawBounds(false);
					this.drawBoundsData(false);
				};

				// Create the 3d container that the player
				// entity will be mounted to
				self.player1 = new Character()
					.id('player1')
					.addComponent(IgePathComponent)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.tileMap1);
				
				self.player2 = new Character()
					.id('player2')
					.addComponent(IgePathComponent)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.tileMap1)
					.translateToTile(-3, -2);

				// Check if the tileMap1 is is iso mode
				if (self.tileMap1.isometricMounts()) {
					// Set the player1 to move isometrically
					self.player1.isometric(true);
					self.player2.isometric(true);
				}

				// Create a UI entity so we can test if clicking the entity will stop
				// event propagation down to moving the player. If it's working correctly
				// the player won't move when the entity is clicked.
				self.topBar1 = new IgeUiEntity()
					.id('topBar1')
					.depth(1)
					.backgroundColor('#474747')
					.top(0)
					.left(0)
					.width('100%')
					.height(30)
					.borderTopColor('#666666')
					.borderTopWidth(1)
					.backgroundPosition(0, 0)
					.mouseDown(function () { ige.input.stopPropagation(); })
					.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
					.mouseOut(function () {this.backgroundColor('#474747'); ige.input.stopPropagation(); })
					.mouseMove(function () { ige.input.stopPropagation(); })
					.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
					.mount(self.uiScene);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				//self.vp1.camera.trackTranslate(self.player, 100);
				
				// Listen for the mouse up event
				ige.input.on('mouseUp', function (event, x, y, button) {
					// Get the tile co-ordinates that the mouse is currently over
					var tileMap = ige.$('tileMap1'),
						clickedTile = tileMap.mouseToTile(),
						occupied = tileMap.isTileOccupied(clickedTile.x, clickedTile.y);
					
					console.log('Clicked tile ' + clickedTile.x + ', ' + clickedTile.y);
					
					// Toggle occupied / un-occupied
					if (occupied) {
						tileMap.unOccupyTile(clickedTile.x, clickedTile.y, 1, 1);
					} else {
						tileMap.occupyTile(clickedTile.x, clickedTile.y, 1, 1, 1);
					}
				});
				
				// Create a path finder
				self.pathFinder = new IgePathFinder()
					.neighbourLimit(100);

				// Configure the path component for the player entity
				self.player1
					.path.finder(self.pathFinder)
					.path.tileMap(self.tileMap1)
					.path.tileChecker(function (tileData, tileX, tileY, node, prevNodeX, prevNodeY, dynamic) {
						// If the map tile data is set to 1, don't allow a path along it
						if (typeof tileData === 'string') {
							return tileData === this._id;
						}
						
						return tileData !== 1;
					})
					.path.lookAheadSteps(3)
					.path.dynamic(true)
					.path.allowSquare(true) // Allow north, south, east and west movement
					.path.allowDiagonal(false) // Allow north-east, north-west, south-east, south-west movement
					.path.drawPath(true) // Enable debug drawing the paths
					.path.drawPathGlow(true) // Enable path glowing (eye candy)
					.path.drawPathText(true); // Enable path text output
				
				self.player2
					.path.finder(self.pathFinder)
					.path.tileMap(self.tileMap1)
					.path.tileChecker(function (tileData, tileX, tileY, node, prevNodeX, prevNodeY, dynamic) {
						// If the map tile data is set to 1, don't allow a path along it
						if (typeof tileData === 'string') {
							return tileData === this._id;
						}
						
						return tileData !== 1;
					})
					.path.lookAheadSteps(3)
					.path.dynamic(true)
					.path.allowSquare(true) // Allow north, south, east and west movement
					.path.allowDiagonal(false) // Allow north-east, north-west, south-east, south-west movement
					.path.drawPath(true) // Enable debug drawing the paths
					.path.drawPathGlow(true) // Enable path glowing (eye candy)
					.path.drawPathText(true); // Enable path text output
				
				// Register some event listeners for the path
				self.player1.path.on('pointComplete', function (entity, currentCellX, currentCellY, nextCellX, nextCellY) {
					console.log('Path point reached...');
					
					// Mark the previous point as un-blocked
					var previousCell = entity.path.previousTargetCell(1);
					if (previousCell !== undefined) {
						self.tileMap1.unOccupyTile(previousCell.x, previousCell.y, 1, 1);
					}
					
					// Mark the current point as blocked
					self.tileMap1.occupyTile(currentCellX, currentCellY, 1, 1, entity._id);
				});
				self.player1.path.on('pathComplete', function (entity, currentCellX, currentCellY) {
					console.log('Path completed...');
					
					// Mark the current point as un-blocked
					self.tileMap1.unOccupyTile(currentCellX, currentCellY, 1, 1);
				});
				self.player1.path.on('traversalComplete', function (entity) { this._entity.animation.stop(); console.log('Traversal of all paths completed.'); });
				self.player1.path.on('dynamicFail', function (entity, pathFrom, pathTo) { this._entity.animation.stop(); console.log('Dynamic path update required but could not find valid path to desination.'); });
				
				self.player2.path.on('pointComplete', function (entity, currentCellX, currentCellY, nextCellX, nextCellY) {
					console.log('Path point reached...');
					
					// Mark the previous point as un-blocked
					var previousCell = entity.path.previousTargetCell(1);
					if (previousCell !== undefined) {
						self.tileMap1.unOccupyTile(previousCell.x, previousCell.y, 1, 1);
					}
					
					// Mark the current point as blocked
					self.tileMap1.occupyTile(currentCellX, currentCellY, 1, 1, entity._id);
				});
				self.player2.path.on('pathComplete', function (entity, currentCellX, currentCellY) {
					console.log('Path completed...');
					
					// Mark the current point as un-blocked
					self.tileMap1.unOccupyTile(currentCellX, currentCellY, 1, 1);
				});
				self.player2.path.on('traversalComplete', function (entity) { this._entity.animation.stop(); console.log('Traversal of all paths completed.'); });
				self.player2.path.on('dynamicFail', function (entity, pathFrom, pathTo) { this._entity.animation.stop(); console.log('Dynamic path update required but could not find valid path to desination.'); });

				// Some error events from the path finder
				self.pathFinder.on('noPathFound', function () { console.log('Could not find a path to the destination!'); });
				self.pathFinder.on('exceededLimit', function () { console.log('Path finder exceeded allowed limit of nodes!'); });
				self.pathFinder.on('pathFound', function () { console.log('Path to destination calculated...'); });

				// Assign the path to the player and start it!
				self.player1
					.path.set(0, 0, 0, -3, -2, 0)
					.path.start();
				
				self.player2
					.path.set(-3, -2, 0, 0, 0, 0)
					.path.start();
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }