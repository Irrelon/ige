var IgeSceneIso = IgeScene2d.extend({
	classId: 'IgeSceneIso',

	tick: function () {
		this._super();
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeSceneIso; }