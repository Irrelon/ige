var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

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
					.mouseDown(function () { ige.input.stopPropagation(); })
					.mouseOver(function () {this.backgroundColor('#49ceff'); ige.input.stopPropagation(); })
					.mouseOut(function () {this.backgroundColor('#474747'); ige.input.stopPropagation(); })
					.mouseMove(function () { ige.input.stopPropagation(); })
					.mouseUp(function () { console.log('Clicked ' + this.id()); ige.input.stopPropagation(); })
					.mount(self.uiScene);

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);

				// Create a path finder and generate a path using
				// the collision map data
				self.pathFinder = new IgePathFinder()
					.neighbourLimit(100);

				// Generate first path, diagonal enabled
				var path1, path2, path3, path4;

				path1 = self.pathFinder.aStar(self.tileMap1, new IgePoint(0, 0, 0), new IgePoint(2, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Generate first path, diagonal disabled
				path2 = self.pathFinder.aStar(self.tileMap1, new IgePoint(2, 0, 0), new IgePoint(6, 4, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Generate first path, diagonal enabled
				path3 = self.pathFinder.aStar(self.tileMap1, new IgePoint(6, 4, 0), new IgePoint(7, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Generate first path, diagonal disabled
				path4 = self.pathFinder.aStar(self.tileMap1, new IgePoint(7, 0, 0), new IgePoint(0, 0, 0), function (tileData, tileX, tileY) {
					// If the map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, true);

				// Assign the path to the player
				self.player
					.path.drawPath(true) // Enable debug drawing the paths
					.path.drawPathGlow(true) // Enable path glowing (eye candy)
					.path.drawPathText(true) // Enable path text output
					.path.add(path1)
					.path.add(path2)
					.path.add(path3)
					.path.add(path4);

				// Register some event listeners for the path
				self.player.path.on('started', function () { console.log('Pathing started...'); });
				self.player.path.on('stopped', function () { console.log('Pathing stopped.'); });
				self.player.path.on('cleared', function () { console.log('Path data cleared.'); });
				self.player.path.on('pointComplete', function () { console.log('Path point reached...'); });
				self.player.path.on('pathComplete', function () { console.log('Path completed...'); });
				self.player.path.on('traversalComplete', function () { console.log('Traversal of all paths completed.'); });

				// Some error events from the path finder
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