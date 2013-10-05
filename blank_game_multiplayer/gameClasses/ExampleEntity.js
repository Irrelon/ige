var ExampleEntity = IgeEntity.extend({
	classId: 'ExampleEntity',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ExampleEntity; }