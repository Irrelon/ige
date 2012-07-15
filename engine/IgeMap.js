var IgeMap = IgeClass.extend({
	init: function (tileWidth, tileHeight, data) {
		this._tileWidth = tileWidth;
		this._tileHeight = tileHeight;
		this._mapData = data || [];
	},

	/**
	 * Gets / sets the map's tile width.
	 * @param val
	 * @return {*}
	 */
	tileWidth: function (val) {
		if (val !== undefined) {
			this._tileWidth = val;
			return this;
		}

		return this._tileWidth;
	},

	/**
	 * Gets / sets the map's tile height.
	 * @param val
	 * @return {*}
	 */
	tileHeight: function (val) {
		if (val !== undefined) {
			this._tileHeight = val;
			return this;
		}

		return this._tileHeight;
	},

	/**
	 * Gets / sets the map's tile data.
	 * @param val
	 * @return {*}
	 */
	mapData: function (val) {
		if (val !== undefined) {
			this._mapData = val;
			return this;
		}

		return this._mapData;
	},

	/**
	 * Inserts data into the map at the given co-ordinates.
	 * @param val
	 */
	insertData: function (x, y, val) {

	},

	rotateData: function (val, mode) {
		switch (mode) {
			case -90:
				// Rotate the data
			break;

			case 180:
			break;

			case 90:
			default:
			break;
		}
	}
});