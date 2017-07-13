"use strict";

var appCore = require('irrelon-appcore');

appCore.module('$ige', function () {
	var $ige = function () {
		// Determine the environment we are executing in
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
		this.isClient = !this.isServer;
		
		this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
		this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
	};
	
	return new $ige();
});