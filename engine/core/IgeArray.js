var IgeArray = function () {};
IgeArray.prototype = [];

// Empower the IgeArray with all the method calls of the an IgeEntity
for (var methodName in IgeEntity.prototype) {
	if (IgeEntity.prototype.hasOwnProperty(methodName)) {
		if (methodName !== 'init') {
			IgeArray.prototype[methodName] = function (methodName) {
				return function () {
					var c = this.length;
					for (var i = 0; i < c; i++) {
						this[i][methodName].apply(this[i], arguments);
					}
				}
			}(methodName);
		}
	}
}

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeArray; }