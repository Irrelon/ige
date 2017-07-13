"use strict";

var appCore = require('irrelon-appcore');

appCore.module('requestAnimFrame', function () {
	var requestAnimFrame;
	
	if (typeof window !== 'undefined') {
		/**
		 * A cross-browser/platform requestAnimationFrame method.
		 */
		requestAnimFrame = (function () {
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function (callback, element) {
					setTimeout(function () {
						callback(new Date().getTime());
					}, 1000 / 60);
				};
		}());
	} else {
		/**
		 * A node.js requestAnimationFrame method.
		 */
		requestAnimFrame = (function () {
			return function (callback, element) {
				setTimeout(function () {
					callback(new Date().getTime());
				}, 1000 / 60);
			};
		}());
	}
	
	return requestAnimFrame;
});