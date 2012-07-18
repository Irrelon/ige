var IgeMap2d = IgeClass.extend({
	init: function (data) {
		this._mapData = data || [];
	},

	/**
	 * Gets / sets a value on the specified map tile co-ordinates.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {*=} val The data to set on the map tile co-ordinate.
	 * @return {*}
	 */
	tileData: function (x, y, val) {
		if (x !== undefined && y !== undefined) {
			if (val !== undefined) {
				// Assign a value
				this._mapData[x] = this._mapData[x] || [];
				this._mapData[x][y] = val;
				return this;
			} else {
				// No assignment so see if we have data to return
				if (this._mapData[x] !== undefined) {
					return this._mapData[x][y];
				}
			}
		}

		// Either no x, y was specified or there was
		// no data at the x, y so return undefined
		return undefined;
	},

	/**
	 * Gets / sets the map's tile data.
	 * @param {Array} val The map data array.
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
	 * Inserts map data into the map at the given co-ordinates. Please note this
	 * is not used for setting a tile's value. This is used to add large sections
	 * of map data at the specified co-ordinates. To set an individual tile value,
	 * please use tile(x, y, val).
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Array} val The map data array.
	 */
		//TODO: Write this function's internals!
	insertMapData: function (x, y, val) {
		// Loop the data and fill the map data with it
	},

	/**
	 * Rotates map data either -90 degrees (anti-clockwise), 90 degrees (clockwise) or
	 * 180 degrees. Useful when you want to define one section of a map and then re-use
	 * it in slightly different layouts.
	 * @param {Array} val The map data array to rotate.
	 * @param {Number} mode Either -90, 90 or 180 to denote the type of rotation to perform.
	 */
		//TODO: Write this function's internals!
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMap2d; }