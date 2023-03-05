"use strict";

var appCore = require('irrelon-appcore');
require('./engine/serverDependencies.js');

appCore.module('ige', function (IgeEngine) {
	var ige = new IgeEngine();
	
	if (ige.isClient) {
		window.ige = ige;
	}
	
	return ige;
});

if (typeof module !== undefined) {
	module.exports = appCore;
}