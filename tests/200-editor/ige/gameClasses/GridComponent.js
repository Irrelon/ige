var IgeGridComponent = IgeClass.extend({
	classId: 'IgeGridComponent',
	componentId: 'grid',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		this._enabled = false;
	},

	enabled: function (val) {
		if (val !== undefined) {
			this._enabled = val;
			return this._entity;
		}

		return this._enabled;
	}
});