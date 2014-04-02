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
					.id('vp1')
					.autoSize(true)
					.scene(self.mainScene)
					.drawMouse(true)
					.drawBounds(true)
					.drawBoundsData(true)
					.mount(ige);

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
					.occupyTile(1, 1, 1, 1, 1) // Mark tile as occupied with a value of 1 (x, y, width, height, value)
					.occupyTile(1, 2, 1, 1, 1)
					.occupyTile(1, 3, 1, 1, 1)
					.occupyTile(1, 4, 1, 1, 1)
					.occupyTile(2, 4, 1, 1, 1)
					.occupyTile(4, 4, 1, 1, 1)
					.occupyTile(4, 3, 1, 1, 1)
					.occupyTile(4, 2, 1, 1, 1)
					.occupyTile(3, 2, 1, 1, 1)
					.occupyTile(3, 1, 1, 1, 1)
					.occupyTile(1, 0, 1, 1, 1)
					.occupyTile(1, -1, 1, 1, 1)
					.occupyTile(2, -1, 1, 1, 1)
					.occupyTile(3, -1, 1, 1, 1)
					.occupyTile(4, -1, 1, 1, 1)
					.occupyTile(5, -1, 1, 1, 1)
					.occupyTile(5, 0, 1, 1, 1)
					.occupyTile(6, 1, 1, 1, 1)
					.occupyTile(6, 2, 1, 1, 1)
					.occupyTile(6, 3, 1, 1, 1)
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
				self.player = new CharacterContainer()
					.id('player')
					.addComponent(PlayerComponent)
					.addComponent(IgePathComponent)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.tileMap1);

				// Check if the tileMap1 is is iso mode
				if (self.tileMap1.isometricMounts()) {
					// Set the player to move isometrically
					self.player.isometric(true);
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
					.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
					.mouseOut(function () {this.backgroundColor('#474747'); ige.input.stopPropagation(); })
					.mouseMove(function () { ige.input.stopPropagation(); })
					.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
					.mount(self.uiScene);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);

				// Setup a quest to reach some tiles. The tiles that the quest
				// has been setup for are the path points we are creating below
				// this quest code. That means that as the player entity moves
				// around the pre-set path, each time they reach one of the
				// quest's path points, the quest progress will move closer to
				// completion. Quests can listen for any event, not just overTile
				// events but this shows how to set up multiple quest items
				// that once completed will trigger the quest completed callback.
				self.quest1 = new IgeQuest()
					// Setup the quest's items
					.items([{
						// The number of times this event should fire
						// before we mark this quest item as complete
						count: 1,
						// The object to attach the event listener to
						emitter: self.player,
						// The name of the event to listen for
						eventName: 'overTile',
						// The method that will be called by the event
						// emitter, receiving it's parameters and then
						// evaluating if the event constitutes the quest
						// event we want to listen for. Returning true
						// tells the quest system to count the event
						// towards the item's event complete count.
						// This is optional, if no method is specified
						// then every event emitted will count towards
						// the item's event complete count.
						eventEvaluate: function (tile) {
							// Check if the tile our character is over matches
							// our co-ordinates
							if (tile.x === 0 && tile.y === 4) {
								return true;
							}
						},
						// Called when an event is fired for this item
						// this is optional
						eventCallback: function (item) {
							console.log('overTile event');
						},
						// Called when this item has reached its item
						// complete count. This is optional
						itemCallback: function (item) {
							console.log('Item completed! Quest percent: ' + this.percentComplete() + '%');
						}
					}, {
						count: 1,
						emitter: self.player,
						eventName: 'overTile',
						eventEvaluate: function (tile) { if (tile.x === 3 && tile.y === 0) { return true; } },
						eventCallback: function (item) { console.log('overTile event'); },
						itemCallback: function (item) {	console.log('Item completed! Quest percent: ' + this.percentComplete() + '%'); }
					}, {
						count: 1,
						emitter: self.player,
						eventName: 'overTile',
						eventEvaluate: function (tile) { if (tile.x === 6 && tile.y === 4) { return true; } },
						eventCallback: function (item) { console.log('overTile event'); },
						itemCallback: function (item) {	console.log('Item completed! Quest percent: ' + this.percentComplete() + '%'); }
					}, {
						count: 1,
						emitter: self.player,
						eventName: 'overTile',
						eventEvaluate: function (tile) { if (tile.x === 7 && tile.y === 0) { return true; } },
						eventCallback: function (item) { console.log('overTile event'); },
						itemCallback: function (item) {	console.log('Item completed! Quest percent: ' + this.percentComplete() + '%'); }
					}, {
						count: 1,
						emitter: self.player,
						eventName: 'overTile',
						eventEvaluate: function (tile) { if (tile.x === 0 && tile.y === -1) { return true; } },
						eventCallback: function (item) { console.log('overTile event'); },
						itemCallback: function (item) {	console.log('Item completed! Quest percent: ' + this.percentComplete() + '%'); }
					}])
					// Called when the quest has completed all items
					.complete(function () {
						console.log('Quest is complete!');
					})
					// Start the quest now (activates event listeners)
					.start();

				// Create a path finder and generate a path using
				// the collision map data
				self.pathFinder = new IgePathFinder();

				// Generate first path, diagonal enabled
				var path1, path2, path3, path4;

				path1 = self.pathFinder.aStar(self.tileMap1, new IgePoint(0, 0, 0), new IgePoint(3, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Generate first path, diagonal disabled
				path2 = self.pathFinder.aStar(self.tileMap1, new IgePoint(3, 0, 0), new IgePoint(6, 4, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, false);

				// Generate first path, diagonal enabled
				path3 = self.pathFinder.aStar(self.tileMap1, new IgePoint(6, 4, 0), new IgePoint(7, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Generate first path, diagonal disabled
				path4 = self.pathFinder.aStar(self.tileMap1, new IgePoint(7, 0, 0), new IgePoint(0, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, false);

				// Assign the path to the player
				self.player
					.path.drawPath(true) // Enable debug drawing the paths
					.path.drawPathGlow(true) // Enable path glowing (eye candy)
					.path.add(path1)
					.path.add(path2)
					.path.add(path3)
					.path.add(path4);

				// Register some event listeners for the path (these are for debug console logging so you
				// know what events are emitted by the path component and what they mean)
				self.player.path.on('started', function () { console.log('Pathing started...'); });
				self.player.path.on('stopped', function () { console.log('Pathing stopped.'); });
				self.player.path.on('cleared', function () { console.log('Path data cleared.'); });
				self.player.path.on('pointComplete', function () { console.log('Path point reached...'); });
				self.player.path.on('pathComplete', function () { console.log('Path completed...'); });
				self.player.path.on('traversalComplete', function () { this._entity.character.animation.stop(); console.log('Traversal of all paths completed.'); });

				// Some error events from the path finder (these are for debug console logging so you
				// know what events are emitted by the path finder class and what they mean)
				self.pathFinder.on('noPathFound', function () { console.log('Could not find a path to the destination!'); });
				self.pathFinder.on('exceededLimit', function () { console.log('Path finder exceeded allowed limit of nodes!'); });
				self.pathFinder.on('pathFound', function () { console.log('Path to destination calculated...'); });

				// Start traversing the path!
				self.player.path.start();
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }