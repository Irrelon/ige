/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
var IgeBaseScene = IgeSceneGraph.extend({
	classId: 'IgeBaseScene',
	
	init: function () {},

	/**
	 * Called when loading the graph data via ige.addGraph().
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
		// Destroy the viewport
		ige.$('vp1').destroy();
		
		// Destroy the baseScene
		ige.$('baseScene').destroy();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeBaseScene; }