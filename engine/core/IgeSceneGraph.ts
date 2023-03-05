"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeSceneGraph', function (IgeClass) {
	var IgeSceneGraph = IgeClass.extend({
		classId: 'IgeSceneGraph',
		interfaceImplements: [
			'addGraph',
			'removeGraph'
		],
		
		/**
		 * Called when loading the graph data via $ige.engine.addGraph().
		 * @param {Object=} options The options that were passed with the call
		 * to $ige.engine.addGraph().
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
	
	return IgeSceneGraph;
});