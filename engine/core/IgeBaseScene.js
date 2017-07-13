"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeBaseScene', function ($ige, IgeSceneGraph, IgeScene2d, IgeViewport) {
	/**
	 * When loaded into memory using $ige.engine.addGraph('IgeBaseScene') will create
	 * the scene "baseScene" and the viewport "vp1" that are used in almost all
	 * examples and can be used as the base for your scenegraph as well.
	 */
	var IgeBaseScene = IgeSceneGraph.extend({
		classId: 'IgeBaseScene',
		
		init: function () {
		},
		
		/**
		 * Called when loading the graph data via $ige.engine.addGraph().
		 * @param options
		 */
		addGraph: function (options) {
			// Clear existing graph data
			if ($ige.engine.$('baseScene')) {
				this.removeGraph();
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
				.mount($ige.engine);
		},
		
		/**
		 * The method called when the graph items are to be removed from the
		 * active graph.
		 */
		removeGraph: function () {
			// Destroy the viewport
			$ige.engine.$('vp1').destroy();
			
			// Destroy the baseScene
			$ige.engine.$('baseScene').destroy();
		}
	});
	
	return IgeBaseScene;
});