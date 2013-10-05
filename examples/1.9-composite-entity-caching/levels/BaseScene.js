var BaseScene = IgeSceneGraph.extend({
	classId: 'BaseScene',
	
	init: function () {},

	/**
	 * Called when loading the graph data via ige.loadGraph().
	 * @param options
	 */
	addGraph: function (options) {
		// Clear existing graph data
		if (ige.$('baseScene')) {
			this.destroyGraph();
		}
		
		// Create the scene
		var baseScene = new IgeScene2d()
			.id('baseScene');

		// Create the main viewport to look at "baseScene"
		new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(baseScene)
			.drawBounds(false)
			.mount(ige);
	},

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph: function () {
		// Since all our objects in addGraph() were mounted to the
		// 'baseScene' entity, destroying it will remove everything we
		// added to it.
		ige.$('baseScene').destroy();
	}
});