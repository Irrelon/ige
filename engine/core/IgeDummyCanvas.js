var nullMethod = function () {},
	IgeDummyCanvas = function () {
		this.dummy = true;
		this.width = 0;
		this.height = 0;
	};

IgeDummyCanvas.prototype.getContext = function () {
	return IgeDummyContext;
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeDummyCanvas; }