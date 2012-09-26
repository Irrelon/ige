var IgeEntityManager = IgeClass.extend({
	init: function () {

	},

	manage: function (entity) {
		if (entity !== undefined) {
			this._manage = entity;
			return this;
		}

		return this._entity;
	}
});