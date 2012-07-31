var IgeSceneIso = IgeScene2d.extend({
	classId: 'IgeSceneIso',

	tick: function (ctx) {
		this._super(ctx);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSceneIso; }