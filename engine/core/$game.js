"use strict";

var appCore = require('irrelon-appcore');

appCore.module('$game', function () {
	var $game = function () {
		// Determine the environment we are executing in
		this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
		this.isClient = !this.isServer;
	};
	
	return new $game();
});