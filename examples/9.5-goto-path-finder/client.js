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
					.gridSize(20, 20)
					.drawGrid(true)
					.drawMouse(true)
					.drawBounds(true)
					.drawBoundsData(false)
					.highlightOccupied(true) // Draws a red tile wherever a tile is "occupied"
					.mount(self.objectScene);

				// Create the 3d container that the player
				// entity will be mounted to
				self.player = new Character()
					.id('player')
					.addComponent(PlayerComponent)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.tileMap1)
					.translateToTile(0, 0, 0);

				// Check if we are in iso mode
				if (self.isoMode) {
					self.player.isometric(true);
				}

				// Set the camera to track the character with some
				// tracking smoothing turned on (100)
				self.vp1.camera.trackTranslate(self.player, 100);

				// Create a path finder
				self.pathFinder = new IgePathFinder()
					.neighbourLimit(100);

				// Assign the pathfinder to the player
				self.player.addComponent(IgePathComponent).path
					.finder(self.pathFinder)
					.tileMap(ige.$('tileMap1'))
					.tileChecker(function (tileData, tileX, tileY, node, prevNodeX, prevNodeY, dynamic) {
						// If the map tile data is set to 1, don't allow a path along it
						return tileData !== 1;
					})
					.lookAheadSteps(3)
					.dynamic(true)
					.allowSquare(true) // Allow north, south, east and west movement
					.allowDiagonal(false) // Allow north-east, north-west, south-east, south-west movement
					.drawPath(true) // Enable debug drawing the paths
					.drawPathGlow(true) // Enable path glowing (eye candy)
					.drawPathText(true); // Enable path text output

				// Register some event listeners for the path
				self.player.path.on('started', function () { console.log('Pathing started...'); });
				self.player.path.on('stopped', function () { console.log('Pathing stopped.'); });
				self.player.path.on('cleared', function () { console.log('Path data cleared.'); });
				self.player.path.on('pointComplete', function () { console.log('Path point reached...'); });
				self.player.path.on('pathComplete', function () { console.log('Path completed...'); });
				self.player.path.on('traversalComplete', function () { this._entity.animation.stop(); console.log('Traversal of all paths completed.'); });

				// Some error events from the path finder
				self.pathFinder.on('noPathFound', function () { console.log('Could not find a path to the destination!'); });
				self.pathFinder.on('exceededLimit', function () { console.log('Path finder exceeded allowed limit of nodes!'); });
				self.pathFinder.on('pathFound', function () { console.log('Path to destination calculated...'); });

				// Start traversing the path!
				self.player.path
					.set(0, 0, 0, 3, 7, 0)
					.speed(5)
					.start(1000);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }