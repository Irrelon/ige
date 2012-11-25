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
						//.drawGrid(3)
						//.drawMouse(true)
						.autoSection(10)
						.translateTo(-200, 0, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.textureMap2 = new IgeTextureMap()
						.depth(1)
						.translateTo(200, 0, 0)
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(3)
						.autoSection(10)
						//.drawMouse(true)
						.drawBounds(false)
						.isometricMounts(true)
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
					// Set the map data to the map1 we loaded in our index.html
					self.textureMap1.loadMap(map1);

					// The addTexture method also returns the index of the added
					// texture
					var texIndex = self.textureMap2.addTexture(gameTexture[1]);

					// Paint isometric texture map
					// Set the map data to the map2 we loaded in our index.html
					self.textureMap2.loadMap(map2);

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