var IgeEntityManagerComponent = IgeClass.extend({
	init: function () {

	},

	manage: function (entity) {
		if (entity !== undefined) {
			this._manage = entity;
			return this;
		}

		return this._manage;
	},

	map: function (map) {
		if (map !== undefined) {
			this._map = map;
			return this;
		}

		return this._map;
	},
});