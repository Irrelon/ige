var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/sprites/fairy.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1')
						.translateTo(20, 0, 0)
						.drawBounds(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.depth(0)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(3)
						//.drawMouse(true)
						.translateTo(-200, 0, 0)
						.highlightOccupied(true)
						.drawBounds(false)
						.mount(self.scene1);

					self.tileMap2 = new IgeTileMap2d()
						.depth(1)
						.translateTo(200, 0, 0)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(3)
						//.drawMouse(true)
						.drawBounds(false)
						.isometricMounts(true)
						.highlightOccupied(true)
						.mount(self.scene1);

					var overFunc,
						outFunc,
						upFunc;

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

					// Define a function that will be called when the
					// mouse button "up" event occurs on one of our entities
					upFunc = function () {
						console.log(this.overTiles());
					};

					// Create an entity
					self.obj[0] = new IgeEntity()
						.id('fairy1')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.widthByTile(2)
						.heightByTile(2)
						.translateToTile(0.5, 0.5, 0)
						.drawBounds(false)
						.tileWidth(2)
						.tileHeight(2)
						.occupyTile()
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);

					self.obj[1] = new IgeEntity()
						.id('fairy2')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.translateToTile(2, 2, 0)
						.widthByTile(1)
						.heightByTile(1)
						.drawBounds(false)
						.tileWidth(1)
						.tileHeight(1)
						.occupyTile()
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);

					// Create two isometric 3d entities
					self.obj[2] = new IgeEntity()
						.id('3d1')
						.isometric(true)
						.mount(self.tileMap2)
						.translateToTile(0, 0, 0)
						.drawBounds(false)
						.tileWidth(1)
						.tileHeight(1)
						.occupyTile()
						.size3d(40, 40, 0)
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);

					self.obj[3] = new IgeEntity()
						.id('3d2')
						.isometric(true)
						.mount(self.tileMap2)
						.translateToTile(1.5, 0.5, 0)
						.drawBounds(false)
						.tileWidth(2)
						.tileHeight(2)
						.occupyTile()
						.size3d(80, 80, 0)
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);

					// Create two fairy entities, and mount each one
					// to it's 3d entity as created above
					self.obj[4] = new IgeEntity()
						.id('fairy3')
						.texture(gameTexture[0])
						.mount(self.obj[2])
						.width(40)
						.height(40)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);

					self.obj[5] = new IgeEntity()
						.id('fairy4')
						.texture(gameTexture[0])
						.mount(self.obj[3])
						.width(40)
						.height(40)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }