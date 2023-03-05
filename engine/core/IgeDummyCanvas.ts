"use strict";

var appCore = require('irrelon-appcore');

appCore.module('IgeDummyCanvas', function (IgeDummyContext) {
	var IgeDummyCanvas = function () {
			this.dummy = true;
			this.width = 0;
			this.height = 0;
		};
	
	IgeDummyCanvas.prototype.getContext = function () {
		return IgeDummyContext;
	};
	
	return IgeDummyCanvas;
});