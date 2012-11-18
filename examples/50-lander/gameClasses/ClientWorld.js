var ClientWorld = {
	createWorld: function () {
		// Create the scene
		this.mainScene = new IgeScene2d()
			.id('mainScene');

		this.objectScene = new IgeScene2d()
			.id('objectScene')
			.mount(this.mainScene);

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