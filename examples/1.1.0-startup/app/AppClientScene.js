"use strict";

var appCore = require('../../../index');

appCore.module('AppClientScene', function (ige, $game, $textures, IgeEventingClass, IgeScene2d, IgeViewport) {
	var moduleSelf = this;
	
	var AppClientScene = IgeEventingClass.extend({
		classId: 'AppClientScene',
		
		init: function () {
		
		},
		
		addGraph: function (options) {
			// Create the root scene on which all other objects
			// will branch from in the scenegraph
			$game.scene.mainScene = new IgeScene2d()
				.id('mainScene');
			
			// Create the main viewport and set the scene
			// it will "look" at as the new mainScene we just
			// created above
			$game.scene.vp1 = new IgeViewport()
				.id('vp1')
				.autoSize(true)
				.scene($game.scene.mainScene)
				.drawBounds(false)
				.mount(ige);
		},
		
		removeGraph: function () {
			var i;
			
			if (ige.$('mainScene')) {
				ige.$('mainScene').destroy();
				
				// Clear any references
				for (i in $game.scene) {
					if ($game.scene.hasOwnProperty(i)) {
						if (!$game.scene[i].alive()) {
							delete $game.scene[i];
						}
					}
					
				}
			}
		}
	});
	
	return AppClientScene;
});