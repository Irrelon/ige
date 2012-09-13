var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Load our textures
		var self = this;
		this.obj = [];

		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
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
					.isometricMounts(true)
					.tileWidth(40)
					.tileHeight(40)
					.drawGrid(3)
					.drawMouse(true)
					.drawBounds(false)
					.drawBoundsData(false)
					.occupyTile(1, 1, 1, 1, 1) // Mark tile as occupied with a value of 1 (x, y, width, height, value)
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
					.isometric(true)
					.mouseOver(overFunc)
					.mouseOut(outFunc)
					.drawBounds(false)
					.drawBoundsData(false)
					.mount(self.tileMap1);

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

				// Create a path finder and generate a path using
				// the collision map data
				self.pathFinder = new IgePathFinder();
				var path1 = self.pathFinder.aStar(self.tileMap1, new IgePoint(0, 0, 0), new IgePoint(2, 2, 0), function (tileData) {
					// If the collision map tile data is set to 1, don't allow a path along it
					return tileData !== 1;
				}, true, false);

				// Assign the path to the player and start it
				self.player
					.path.add(path1);

				// Register some event listeners for the path
				self.player.path.on('started', function () { console.log('Pathing started...'); });
				self.player.path.on('stopped', function () { console.log('Pathing stopped.'); });
				self.player.path.on('cleared', function () { console.log('Path data cleared.'); });
				self.player.path.on('pointComplete', function () { console.log('Path point reached...'); });
				self.player.path.on('pathComplete', function () { console.log('Path completed...'); });
				self.player.path.on('traversalComplete', function () { console.log('Traversal of all paths completed.'); });
				self.player.path.start();
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }