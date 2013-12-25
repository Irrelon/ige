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
		gameTexture[1] = new IgeCellSheet('../assets/textures/tiles/grassSheet.png', 4, 1);
		gameTexture[2] = new IgeCellSheet('../assets/textures/tiles/tilea5b.png', 8, 16);

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

					// Create the texture maps
					self.textureMap1 = new IgeTextureMap()
						.depth(0)
						.tileWidth(40)
						.tileHeight(40)
						.gridSize(8, 8)
						.drawGrid(true)
						.drawMouse(true)
						.translateTo(-400, -100, 0)
						.drawBounds(true)
						.autoSection(8)
						.drawSectionBounds(true)
						.mount(self.scene1);

					self.textureMap2 = new IgeTextureMap()
						.depth(1)
						.translateTo(200, 0, 0)
						.tileWidth(40)
						.tileHeight(40)
						.gridSize(3, 3)
						.drawGrid(true)
						.drawMouse(true)
						.drawBounds(true)
						.isometricMounts(true)
						.autoSection(3)
						.mount(self.scene1);

					// Before a texture map can render a texture, the texture
					// must be added to it's internal texture list. This is so
					// that the map data can be loaded / saved with a single tile
					// containing just a texture index and a texture cell, rather
					// than storing the whole texture object in each cell. It
					// also means you can swap textures in and out without updating
					// the entire map's data.
					self.textureMap1.addTexture(gameTexture[0]);
					self.textureMap1.addTexture(gameTexture[2]);

					// Paint the 2d texture map
					// Paint some pointless fairy tiles
					// paintTile takes the arguments:
					// +---- paintTile(x, y, textureIndex, textureCell)
					self.textureMap1.paintTile(0, 0, 0, 1);
					self.textureMap1.paintTile(1, 0, 0, 1);
					self.textureMap1.paintTile(2, 0, 0, 1);

					// Paint some awesome pavement tiles randomly selecting
					// the "un-cracked" or "cracked" cell of gameTexture[2]
					// which are cells 22 and 86 respectively
					var textureCell, x, y, texIndex;
					for (x = 0; x < 5; x++) {
						for (y = 1; y < 6; y++) {
							textureCell = (Math.random() * 4) < 2 ? 22 : 86;
							self.textureMap1.paintTile(x, y, 1, textureCell);
						}
					}

					// The addTexture method also returns the index of the added
					// texture so if you do not want to hard-code the texture
					// indexes, you can get the return value and use it as below
					texIndex = self.textureMap2.addTexture(gameTexture[1]);

					// Paint isometric texture map
					self.textureMap2.paintTile(0, 0, texIndex, 1);
					self.textureMap2.paintTile(1, 0, texIndex, 1);
					self.textureMap2.paintTile(2, 0, texIndex, 2);

					// Output the map data to the console - this is how you can "save"
					// map data from an existing in-memory map
					console.log(self.textureMap1.map.mapDataString());
					console.log(self.textureMap2.map.mapDataString());
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }