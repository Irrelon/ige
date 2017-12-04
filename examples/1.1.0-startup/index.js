"use strict";

// In normal development you'd just do require('ige'). Since we are *inside* the ige folder, we do relative path instead
var appCore = require('../../index');

require('./app/_route');

// Config functions are called before appCore bootstraps
appCore.config(function ($game) {
	// Setup an object to hold a reference to all our
	// scene objects - you can add anything you want to
	// $game. It is a module that you can require via
	// dependency injection everywhere you need a shared
	// game state in your modules.
	$game.scene = {};
});

// The appCore entry point, calling bootstrap() starts appCore
appCore.bootstrap(function ($ige, $game, ige, IgeEditorComponent) {
	if (appCore.isClient) {
		window.addEventListener('load', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);
			
			// Start the engine
			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					ige.addComponent(IgeEditorComponent);
					ige.editor.showStats();
					
					// Navigate to the app's main route
					$ige.go('app.splash');
				}
			});
		});
	}
});