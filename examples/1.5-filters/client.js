var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [];

		this.obj = [];

		this.verdana = new IgeFontSheet('../assets/textures/fonts/verdana_10px.png', 20);

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

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					var yStart = -300;

					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport and set the scene
					// it will "look" at as the new scene1 we just
					// created above
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.mount(ige);

					// Create an entity and mount it to the scene
					self.obj[0] = new Rotator()
						.id('fairy0')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[0])
						.translateTo(0, yStart + 70, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title0')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Original Image')
						.translateTo(0, yStart, 0)
						.drawBounds(false)
						.mount(self.scene1);

					// Create a second rotator entity and mount
					// it to the first one at 0, 50 relative to the
					// parent
					self.obj[1] = new Rotator()
						.id('fairy1')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[1])
						.translateTo(-300, yStart + 220, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title1')
						.depth(0)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Greyscale')
						.translateTo(-300, yStart + 150, 0)
						.drawBounds(false)
						.mount(self.scene1);

					// Create some more fairies and mount them to the scene
					self.obj[2] = new Rotator()
						.id('fairy2')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[2])
						.translateTo(-150, yStart + 220, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title2')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Brighten')
						.translateTo(-150, yStart + 150, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[3] = new Rotator()
						.id('fairy3')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[3])
						.translateTo(0, yStart + 220, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title3')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Threshold')
						.translateTo(0, yStart + 150, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[4] = new Rotator()
						.id('fairy4')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[4])
						.translateTo(150, yStart + 220, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title4')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Sharpen')
						.translateTo(150, yStart + 150, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[5] = new Rotator()
						.id('fairy5')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[5])
						.translateTo(300, yStart + 220, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title5')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Blur')
						.translateTo(300, yStart + 150, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[6] = new Rotator()
						.id('fairy6')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[6])
						.translateTo(-300, yStart + 370, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title6')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Emboss')
						.translateTo(-300, yStart + 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[7] = new Rotator()
						.id('fairy7')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[7])
						.translateTo(-150, yStart + 370, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title7')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Edge Detect')
						.translateTo(-150, yStart + 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[8] = new Rotator()
						.id('fairy8')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[8])
						.translateTo(0, yStart + 370, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title8')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Edge Enhance')
						.translateTo(0, yStart + 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[9] = new Rotator()
						.id('fairy9')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[9])
						.translateTo(150, yStart + 370, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title9')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Color Overlay')
						.translateTo(150, yStart + 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[10] = new Rotator()
						.id('fairy10')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[10])
						.translateTo(300, yStart + 370, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title10')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Sobel')
						.translateTo(300, yStart + 300, 0)
						.drawBounds(false)
						.mount(self.scene1);

					self.obj[11] = new Rotator()
						.id('fairy11')
						.depth(0)
						.width(100)
						.height(100)
						.texture(gameTexture[11])
						.translateTo(0, yStart + 520, 0)
						.mount(self.scene1);

					new IgeFontEntity()
						.id('title11')
						.depth(1)
						.texture(self.verdana)
						.textAlignX(1)
						.text('Glow')
						.translateTo(0, yStart + 450, 0)
						.drawBounds(false)
						.mount(self.scene1);

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

					// Apply a glow mask filter to the eleventh  texture
					gameTexture[11].applyFilter(IgeFilters.glow, {glowMask: gameTexture[12], blurPasses:10, glowPasses: 2});
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }