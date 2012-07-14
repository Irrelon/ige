var IgeParticle = IgeEntity.extend({
	classId:'IgeParticle',

	init: function (emitter) {
		this._emitter = emitter;
		this._super();
	},

	tick: function (ctx) {

	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeParticle; }