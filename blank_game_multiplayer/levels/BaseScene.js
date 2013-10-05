var BaseScene = IgeSceneGraph.extend({
	classId: 'BaseScene',
	
	init: function () {},

	/**
	 * Called when loading the graph data via ige.loadGraph().
	 * @param options
	 */
	addGraph: function (options) {
		var self = ige.client;
		
		// Clear existing graph data
		if (ige.$('baseScene')) {
			this.destroyGraph();
		}
		
		// Create the scene
		self.baseScene = new IgeScene2d()
			.id('baseScene');

		
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