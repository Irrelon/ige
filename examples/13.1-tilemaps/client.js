var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		// Enabled texture smoothing when scaling textures
		ige.globalSmoothing(true);
		ige.addComponent(IgeEditorComponent);

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
						.translateTo(0, 0, 0)
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
						.id('tileMap1')
						.depth(0)
						.tileWidth(40)
						.tileHeight(40)
						.gridSize(4, 3)
						.drawGrid(true)
						.drawMouse(true)
						.translateTo(-400, 0, 0)
						.highlightOccupied(true)
						//.drawBounds(false)
						.mouseUp(function (event, evc, data) {
							console.log(this.id(), this.mouseToTile(), arguments);
						})
						.mount(self.scene1);

					self.tileMap2 = new IgeTileMap2d()
						.id('tileMap2')
						.depth(1)
						.isometricMounts(true)
						.tileWidth(40)
						.tileHeight(40)
						.gridSize(4, 4)
						.drawGrid(true)
						.translateTo(0, 0, 0)
						.drawMouse(true)
						//.drawBounds(false)
						.highlightOccupied(true)
						.mouseUp(function (event, evc, data) {
							console.log(this.id(), this.mouseToTile(), arguments);
						})
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
						console.log(this.id());
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
						.bounds3d(40, 40, 0)
						.texture(gameTexture[0])
						.width(40)
						.height(40)
						.mount(self.tileMap2)
						.translateToTile(0, 0)
						.drawBounds(false)
						/*.tileWidth(1)
						.tileHeight(1)*/
						.occupyTile()
						
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);

					self.obj[3] = new IgeEntity()
						.id('3d2')
						.isometric(true)
						.bounds3d(40, 40, 0)
						.texture(gameTexture[0])
						.width(40)
						.height(40)
						.debugTransforms()
						.mount(self.tileMap2)
						.translateToTile(2, 0)
						.drawBounds(false)
						/*.tileWidth(2)
						.tileHeight(2)*/
						.occupyTile()
						
						.mouseOver(overFunc)
						.mouseOut(outFunc)
						.mouseUp(upFunc);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }