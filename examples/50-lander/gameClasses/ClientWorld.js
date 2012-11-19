var ClientWorld = {
	createWorld: function () {
		// Create the scene
		this.mainScene = new IgeScene2d()
			.id('mainScene');

		this.objectScene = new IgeScene2d()
			.id('objectScene')
			.mount(this.mainScene);

		this.uiScene = new IgeScene2d()
			.id('uiScene')
			.ignoreCamera(true)
			.mount(this.mainScene);

		// Create UI elements
		new IgeUiProgressBar()
			.id('fuelBar')
			.max(100)
			.min(0)
			.right(10)
			.top(10)
			.width(100)
			.height(12)
			.barBackColor('#005804')
			.barColor('#00ff0c')
			.barText('Fuel: ', '', '#000000')
			.mount(this.uiScene);

		// Create the main viewport and set the scene
		// it will "look" at as the new scene1 we just
		// created above
		this.vp1 = new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(this.mainScene)
			.drawBounds(false)
			.drawBoundsData(true)
			.mount(ige);
	}
};