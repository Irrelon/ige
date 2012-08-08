var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
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
						.translateTo(20, 0, 0)
						.drawBounds(false);

					// Create the main viewport
					self.vp1 = new IgeViewport()
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
						.translateTo(-200, 0)
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
						.mount(self.scene1);

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

					// Create an entity
					self.obj[0] = new IgeInteractiveEntity()
						.id('fairy1')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.translateToTile(0, 0)
						.widthByTile(1)
						.heightByTile(1)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);

					self.obj[1] = new IgeInteractiveEntity()
						.id('fairy2')
						.depth(1)
						.texture(gameTexture[0])
						.mount(self.tileMap1)
						.translateToTile(1, 0)
						.widthByTile(1)
						.heightByTile(1)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);

					self.obj[2] = new IgeInteractiveEntity()
						.id('fairy3')
						.depth(1)
						.isometric(true)
						.texture(gameTexture[0])
						.mount(self.tileMap2)
						.translateToTile(0, 0)
						.widthByTile(0.5)
						.heightByTile(0.5)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);

					self.obj[3] = new IgeInteractiveEntity()
						.id('fairy4')
						.depth(1)
						.isometric(true)
						.texture(gameTexture[0])
						.mount(self.tileMap2)
						.translateToTile(1, 0)
						.widthByTile(0.5)
						.heightByTile(0.5)
						.drawBounds(false)
						.mouseOver(overFunc)
						.mouseOut(outFunc);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }