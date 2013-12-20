var IgeArray = function () {};
IgeArray.prototype = [];

IgeArray.prototype.hide = function () {
	var c = this.length;
	for (var i = 0; i < c; i++) {
		this[i].hide();
	}
};