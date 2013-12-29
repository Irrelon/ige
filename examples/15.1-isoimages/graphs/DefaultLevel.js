var DefaultLevel = IgeSceneGraph.extend({
	classId: 'DefaultLevel',

	/**
	 * Called when loading the graph data via ige.addGraph().
	 * @param options
	 */
	addGraph: function (options) {
		// Create the scene
		var baseScene = ige.$('baseScene'),
			backgroundScene,
			objectScene,
			uiScene,
			tileMap1;

		// Resize the background and then create a background pattern
		ige.client.gameTextures.background1.resize(40, 20);
		
		backgroundScene = new IgeScene2d()
			.id('backgroundScene')
			.layer(0)
			.backgroundPattern(ige.client.gameTextures.background1, 'repeat', true, true)
			.ignoreCamera(true) // We want the scene to remain static
			.mount(baseScene);

		objectScene = new IgeScene2d()
			.id('objectScene')
			.layer(1)
			.isometric(false)
			.mount(baseScene);

		// Create the UI scene that will have all the UI
		// entities mounted to it. This scene is at a higher
		// depth than gameScene so it will always be rendered
		// "on top" of the other game items which will all
		// be mounted to off of gameScene somewhere down the
		// scenegraph.
		uiScene = new IgeScene2d()
			.id('uiScene')
			.layer(2)
			.ignoreCamera(true)
			.mount(baseScene);

		// Create the tile map that will store which buildings
		// are occupying which tiles on the map. When we create
		// new buildings we mount them to this tile map. The tile
		// map also has a number of mouse event listeners to
		// handle things like building new objects in the game.
		tileMap1 = new IgeTileMap2d()
			.id('tileMap1')
			.isometricMounts(true)
			.tileWidth(20)
			.tileHeight(20)
			.gridSize(40, 40)
			.drawGrid(true)
			.drawMouse(true)
			.highlightOccupied(true)
			/*.mouseMove(this._mapOnMouseOver)
			.mouseUp(this._mapOnMouseUp)*/
			.mount(objectScene);
	},
	
	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph: function () {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		ige.$('backgroundScene').destroy();
		ige.$('objectScene').destroy();
		ige.$('uiScene').destroy();
	}
});