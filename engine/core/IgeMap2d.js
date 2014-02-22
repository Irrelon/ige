/**
 * Creates a new map that has two dimensions (x and y) to it's data.
 */
var IgeMap2d = IgeClass.extend({
	classId: 'IgeMap2d',

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
				this._mapData[y] = this._mapData[y] || [];
				this._mapData[y][x] = val;
				return this;
			} else {
				// No assignment so see if we have data to return
				if (this._mapData[y]) {
					return this._mapData[y][x];
				}
			}
		}

		// Either no x, y was specified or there was
		// no data at the x, y so return undefined
		return undefined;
	},

	/**
	 * Clears any data set at the specified map tile co-ordinates.
	 * @param x
	 * @param y
	 * @return {Boolean} True if data was cleared or false if no data existed.
	 */
	clearData: function (x, y) {
		if (x !== undefined && y !== undefined) {
			if (this._mapData[y] !== undefined) {
				delete this._mapData[y][x];
				return true;
			}
		}

		return false;
	},

	/**
	 * Checks if the tile area passed has any data stored in it. If
	 * so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 */
	collision: function (x, y, width, height) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					if (this.tileData(x + xi, y + yi)) {
						return true;
					}
				}
			}
		}

		return false;
	},
	
	/**
	 * Checks if the tile area passed has data stored in it that matches
	 * the passed data. If so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 * @param data
	 */
	collisionWith: function (x, y, width, height, data) {
		var xi, yi;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					if (this.tileData(x + xi, y + yi) === data) {
						return true;
					}
				}
			}
		}

		return false;
	},
	
	/**
	 * Checks if the tile area passed has data stored in it that matches
	 * the passed data and does not collide with any other stored tile
	 * data. If so, returns true, otherwise false.
	 * @param x
	 * @param y
	 * @param width
	 * @param height
	 * @param data
	 */
	collisionWithOnly: function (x, y, width, height, data) {
		var xi, yi,
			tileData,
			withData = false;

		if (width === undefined) { width = 1; }
		if (height === undefined) { height = 1; }

		if (x !== undefined && y !== undefined) {
			for (yi = 0; yi < height; yi++) {
				for (xi = 0; xi < width; xi++) {
					tileData = this.tileData(x + xi, y + yi);
					if (tileData) {
						if (this.tileData(x + xi, y + yi) === data) {
							withData = true;
						} else {
							return false;
						}
					}
				}
			}
		}

		return withData;
	},

	/**
	 * Gets / sets the map's tile data.
	 * @param {Array} val The map data array.
	 * @param {Integer} startX The start x co-ordinate of the data.
	 * @param {Integer} startY The start y co-ordinate of the data.
	 * @return {*}
	 */
	mapData: function (val, startX, startY) {
		if (val !== undefined) {
			if (!startX && !startY) {
				this._mapData = val;
			} else {
				// Loop the map data and apply based on the start positions
				var x, y;
				
				for (y in val) {
					for (x in val[y]) {
						this._mapData[startY + parseInt(y)][startX + parseInt(x)] = val[y][x];
					}
				}
			}
			return this;
		}

		return this._mapData;
	},
	
	sortedMapDataAsArray: function () {
		var data = this.mapData(),
			finalData = {};
		
		var x, y, xArr, yArr, i, k;
				
		yArr = this._sortKeys(data);
		
		for (i = 0; i < yArr.length; i++) {
			y = yArr[i];
			xArr = this._sortKeys(data[y]);
			
			finalData[y] = finalData[y] || {};
			
			for (k = 0; k < xArr.length; k++) {
				x = xArr[k];
				finalData[y][x] = data[y][x];
			}
		}
		
		return finalData;
	},
	
	_sortKeys: function (obj) {
		var arr = [];
		
		for (var i in obj) {
			arr.push(i);
		}
		
		arr.sort();
		return arr;
	},

	/**
	 * Returns a string of the map's data in JSON format.
	 * @return {String}
	 */
	mapDataString: function () {
		return JSON.stringify(this.mapData());
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
	},
	
	translateDataBy: function (transX, transY) {
		var yArr = this.mapData(),
			newArr = [],
			x, y,
			xArr,
			i, k;
		
		for (y in yArr) {
			if (yArr.hasOwnProperty(y)) {
				i = parseInt(y, 10);
				xArr = yArr[i];
				
				newArr[i + transY] = newArr[i + transY] || {};
				
				for (x in xArr) {
					if (xArr.hasOwnProperty(x)) {
						k = parseInt(x, 10);
						newArr[i + transY][k + transX] = yArr[y][x];
					}
				}
			}
		}
		
		this.mapData(newArr, 0, 0);
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMap2d; }