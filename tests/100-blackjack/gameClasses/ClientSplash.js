var ClientSplash = {
	loadSplash: function () {
		// Load our "loading" textures
		this.gameTexture.background1 = new IgeTexture(ige.basePath + 'assets/textures/backgrounds/greyGradient.png');
		this.gameTexture.chipBackground = new IgeTexture(ige.basePath + 'assets/textures/backgrounds/chipBackground.png');
		this.gameTexture.loadingGame = new IgeTexture(ige.basePath + 'assets/textures/ui/loadingGame.png');
		this.gameTexture.logo = new IgeTexture(ige.basePath + 'assets/textures/ui/gamingLogo.png');
	},

	createSplash: function () {
		var self = ige.client;

		// Create the splash scene
		self.splashScene = new IgeScene2d()
			.mount(self.mainScene);

		// Create background gradient on the main scene
		new IgeUiEntity()
			.depth(0)
			.backgroundImage(self.gameTexture.background1, 'repeat')
			.left(0)
			.top(0)
			.width('100%')
			.height('100%')
			.mount(self.mainScene);

		new IgeEntity()
			.depth(1)
			.texture(self.gameTexture.chipBackground)
			.dimensionsFromTexture()
			.translateTo(0, -130)
			.mount(self.mainScene);

		new IgeUiEntity()
			.depth(2)
			.texture(self.gameTexture.logo)
			.dimensionsFromTexture()
			.left(10)
			.bottom(10)
			.mouseUp(function () {
				ige.openUrl('http://www.isogenicengine.com');
			})
			.mount(self.mainScene);

		self.splashProgress = new IgeUiProgressBar()
			.depth(2)
			.barColor('#ff9c00')
			.barBorderColor('#885300')
			.width(200)
			.height(14)
			.center(0)
			.middle(0)
			.min(0)
			.max(100)
			.progress(0)
			.mount(self.splashScene);

		new IgeUiEntity()
			.depth(2)
			.texture(self.gameTexture.loadingGame)
			.dimensionsFromTexture()
			.center(0)
			.middle(-20)
			.mount(self.splashScene);

		// Listen for texture load events to increment the progress bar
		ige.on('textureLoadStart', function () {
			self.splashProgress.max(ige._texturesTotal);
		});

		ige.on('textureLoadEnd', function () {
			self.splashProgress.progress(ige._texturesTotal - ige._texturesLoading);
		});
	},

	destroySplash: function () {
		var self = this;
		self.splashScene.destroy();
		delete self.splash;
		/*this.splashScene.tween({_opacity:0}, 1000, {afterTween: function () {
		}}).start();*/
	}
};