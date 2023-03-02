// See the ige/engine/filters folder for the individual filter source
const IgeFilters = {};

if (typeof window !== "undefined") {
	// Create a temporary canvas for the filter system to use
	IgeFilters.tmpCanvas = document.createElement("canvas");
	IgeFilters.tmpCtx = IgeFilters.tmpCanvas.getContext("2d");
}

export default IgeFilters;