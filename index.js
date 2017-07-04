"use strict";

var appCore = require('irrelon-appcore');

appCore.module('ige', function (IgeEngine) {
	var ige = new IgeEngine();
	
	if (ige.isClient) {
		window.ige = ige;
	} else {
		
	}
	
	return ige;
});