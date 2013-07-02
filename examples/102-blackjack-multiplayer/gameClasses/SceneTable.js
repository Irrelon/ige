var SceneTable = IgeClass.extend({
	classId: 'SceneTable',
	
	init: function (client) {
		var self = this;
		
		// Create the scene
		self.rootScene = new IgeScene2d()
			.id('rootScene');
		
		self.backgroundScene = new IgeScene2d()
			.id('backgroundScene')
			.depth(0)
			.mount(self.rootScene);
		
		self.gameScene = new IgeScene2d()
			.id('gameScene')
			.depth(1)
			.mount(self.rootScene);
		
		self.uiScene = new IgeScene2d()
			.id('uiScene')
			.ignoreCamera(true)
			.depth(2)
			.mount(self.rootScene);

		// Create the main viewport and set the scene
		// it will "look" at as the new scene1 we just
		// created above
		self.vp1 = new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(self.rootScene)
			.drawBounds(false)
			.mount(ige);
		
		// Background image
		new IgeEntity()
			.texture(client.gameTextures.tex('ui', 'tableBackground'))
			.dimensionsFromTexture()
			.mount(self.backgroundScene);
		
		new Button(client.gameTextures.tex('ui', 'buttons'), 1)
			.text('Logon')
			//.mount(self.uiScene)
			.on('mouseUp', function () {

			});
	}
});