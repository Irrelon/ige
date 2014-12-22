var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		this.verdana = new IgeFontSheet('../assets/textures/fonts/verdana_10px.png');

		// Load the fairy texture a few times and store it in the gameTexture array
		gameTexture[0] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[1] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[2] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[3] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[4] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[5] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[6] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[7] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[8] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[9] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[10] = new IgeTexture('../assets/textures/sprites/lenna.png');
		gameTexture[11] = new IgeTexture('../assets/textures/sprites/tron.png');
		gameTexture[12] = new IgeTexture('../assets/textures/sprites/tronGlowMask.png');
		gameTexture[13] = new IgeTexture('../assets/textures/sprites/tron.png');
		gameTexture[14] = new IgeTexture('../assets/textures/sprites/tron.png');
		gameTexture[15] = new IgeTexture('../assets/textures/sprites/tronGlowMask.png');

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					var yStart = -300;

					// Load the base scene data
					ige.addGraph('IgeBaseScene');

					// Create an entity and mount it to the scene
					self.obj[0] = new IgeEntity()
						.id('fairy0')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[0])
						.translateTo(0, yStart + 70, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title0')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Original Image')
						.translateTo(0, yStart, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					// Create a second IgeEntity entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new IgeEntity()
						.id('fairy1')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[1])
						.translateTo(-300, yStart + 220, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title1')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Greyscale')
						.translateTo(-300, yStart + 150, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					// Create some more fairies and mount them to the scene
					self.obj[2] = new IgeEntity()
						.id('fairy2')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[2])
						.translateTo(-150, yStart + 220, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title2')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Brighten')
						.translateTo(-150, yStart + 150, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[3] = new IgeEntity()
						.id('fairy3')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[3])
						.translateTo(0, yStart + 220, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title3')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Threshold')
						.translateTo(0, yStart + 150, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[4] = new IgeEntity()
						.id('fairy4')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[4])
						.translateTo(150, yStart + 220, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title4')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Sharpen')
						.translateTo(150, yStart + 150, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[5] = new IgeEntity()
						.id('fairy5')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[5])
						.translateTo(300, yStart + 220, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title5')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Blur')
						.translateTo(300, yStart + 150, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[6] = new IgeEntity()
						.id('fairy6')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[6])
						.translateTo(-300, yStart + 370, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title6')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Emboss')
						.translateTo(-300, yStart + 300, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[7] = new IgeEntity()
						.id('fairy7')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[7])
						.translateTo(-150, yStart + 370, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title7')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Edge Detect')
						.translateTo(-150, yStart + 300, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[8] = new IgeEntity()
						.id('fairy8')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[8])
						.translateTo(0, yStart + 370, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title8')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Edge Enhance')
						.translateTo(0, yStart + 300, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[9] = new IgeEntity()
						.id('fairy9')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[9])
						.translateTo(150, yStart + 370, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title9')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Color Overlay')
						.translateTo(150, yStart + 300, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[10] = new IgeEntity()
						.id('fairy10')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[10])
						.translateTo(300, yStart + 370, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title10')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Sobel')
						.translateTo(300, yStart + 300, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[11] = new IgeEntity()
						.id('fairy11')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[11])
						.translateTo(-300, yStart + 520, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title11')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Glow: Original')
						.translateTo(-300, yStart + 450, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[12] = new IgeEntity()
						.id('fairy12')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[12])
						.translateTo(-150, yStart + 520, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title12')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Glow: Mask Image')
						.translateTo(-150, yStart + 450, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[13] = new IgeEntity()
						.id('fairy13')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[13])
						.translateTo(0, yStart + 520, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title13')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Glow: Result')
						.translateTo(0, yStart + 450, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					self.obj[14] = new IgeEntity()
						.id('fairy14')
						.depth(0)
						.width(110)
						.height(100)
						.texture(gameTexture[14])
						.translateTo(150, yStart + 520, 0)
						.mount(ige.$('baseScene'));

					new IgeFontEntity()
						.id('title14')
						.depth(1)
						.width(110)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Glow: Dynamic')
						.translateTo(150, yStart + 450, 0)
						.drawBounds(false)
						.mount(ige.$('baseScene'));

					// Apply a greyscale filter to JUST the first fairy texture
					gameTexture[1].applyFilter(IgeFilters.greyScale);

					// Apply a brighten filter to the second fairy texture
					gameTexture[2].applyFilter(IgeFilters.brighten, {value: 100});

					// Apply a threshold filter to the third fairy texture
					gameTexture[3].applyFilter(IgeFilters.threshold, {value: 128});

					// Apply a sharpen filter to the fourth fairy texture
					gameTexture[4].applyFilter(IgeFilters.sharpen);

					// Apply a blur filter to the fifth fairy texture
					gameTexture[5].applyFilter(IgeFilters.blur, {value: 15});

					// Apply an emboss filter to the sixth fairy texture
					gameTexture[6].applyFilter(IgeFilters.emboss);

					// Apply an edge detect filter to the seventh fairy texture
					gameTexture[7].applyFilter(IgeFilters.edgeDetect, {value: 80});

					// Apply an edge enhance filter to the eighth fairy texture
					gameTexture[8].applyFilter(IgeFilters.edgeEnhance);

					// Apply a colour overlay filter to the ninth fairy texture
					gameTexture[9].applyFilter(IgeFilters.colorOverlay, {color: 'rgba(0, 0, 255, 0.5)'});

					// Apply a sobel filter to the tenth fairy texture
					gameTexture[10].applyFilter(IgeFilters.sobel);

					// Apply a glow mask filter to the eleventh texture
					gameTexture[13].applyFilter(IgeFilters.glowMask, {glowMask: gameTexture[12], blurPasses:50, glowPasses: 2});

					// Pre-apply the blur to the glow mask so we don't calc it every tick
					gameTexture[15].applyFilter(IgeFilters.blur, {value:80});
					glowFilterData = {glowMask: gameTexture[15], blurPasses:0, glowPasses: 2};

					// Set a pre-filter on texture 14 so every tick it applies the filter
					gameTexture[14].preFilter(IgeFilters.glowMask, glowFilterData);

					// Now every few ms change the glow filter data values to make it pulse
					setInterval(function () {
						// Make a new glowPassDirection property
						if (!glowFilterData.glowPassDirection) {
							glowFilterData.glowPasses++;

							if (glowFilterData.glowPasses > 14) {
								glowFilterData.glowPassDirection = 1;
							}
						} else {
							glowFilterData.glowPasses--;
							if (glowFilterData.glowPasses < 1) {
								glowFilterData.glowPassDirection = 0;
							}
						}
					}, 64);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }