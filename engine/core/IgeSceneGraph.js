var IgeSceneGraph = IgeClass.extend({
	classId: 'IgeSceneGraph',
	interfaceImplements: [
		'addGraph',
		'removeGraph'
	],
	
	/**
	 * Called when loading the graph data via ige.addGraph().
	 * @param {Object=} options The options that were passed with the call
	 * to ige.addGraph().
	 */
	addGraph: function (options) {
		
	},
	
	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph: function () {
		
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSceneGraph; }