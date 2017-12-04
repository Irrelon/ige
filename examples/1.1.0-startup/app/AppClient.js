"use strict";

// In normal development you'd just do require('ige'). Since we are *inside* the ige folder, we do relative path instead
var appCore = require('../../../index');

appCore.module('AppClient', function ($ige, $game) {
	var AppClient = function () {
	
	};
	
	return AppClient;
});