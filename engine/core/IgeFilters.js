// See the ige/engine/filters folder for the individual filter source
var IgeFilters = {};

if (typeof(window) !== 'undefined') {
	// Create a temporary canvas for the filter system to use
	IgeFilters.tmpCanvas = document.createElement('canvas');
	IgeFilters.tmpCtx = IgeFilters.tmpCanvas.getContext('2d');
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeFilters; }