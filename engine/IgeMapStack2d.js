var IgeMapStack2d = IgeClass.extend({
	init: function (data) {
		this._mapData = data || [];
	},

	/**
	 * Gets / sets the data stored at the specified map tile co-ordinates. If data already
	 * exists at the specified co-ordinates, it is replaced with the passed data.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Array=} val The array of data items to set at the specified co-ordinates.
	 * @return {*} This or an array of data items at the specified co-ordinates.
	 */
	tileData: function (x, y, val) {
		if (x !== undefined && y !== undefined) {
			if (val !== undefined) {
				// Assign a value
				this._mapData[x] = this._mapData[x] || [];
				this._mapData[x][y] = [];
				this._mapData[x][y].push(val);
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
	 * Gets the data stored at the specified co-ordinates and index.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {Number} index
	 * @return {*} The current data stored at the specified point or undefined if no data exists.
	 */
	tileDataAtIndex: function (x, y, index) {
		if (this._mapData[x] && this._mapData[x][y]) {
			return this._mapData[x][y][index];
		}

		return undefined;
	},

	/**
	 * Adds a data item to the specified map tile co-ordinates.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {*} val The data to add.
	 * @return {*} This on success or false on failure.
	 */
	push: function (x, y, val) {
		if (val !== undefined) {
			this._mapData[x] = this._mapData[x] || [];
			this._mapData[x][y] = this._mapData[x][y] || [];
			this._mapData[x][y].push(val);
			return this;
		}

		return false;
	},

	/**
	 * Removes a data item from the specified map tile co-ordinates.
	 * @param {Number} x
	 * @param {Number} y
	 * @param {*} val The data to remove.
	 * @return {*} This on success or false on failure.
	 */
	pull: function (x, y, val) {
		if (this._mapData[x] && this._mapData[x][y]) {
			this._mapData[x][y].pull(val);
			return this;
		}

		return false;
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
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMapStack2d; }