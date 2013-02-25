// TODO: Implement the _stringify() method for this class
/**
 * Texture maps provide a way to display textures across a tile map.
 */
var IgeTextureAtlas = IgeTextureMap.extend({
	classId: 'IgeTextureAtlas',

	init: function (tileWidth, tileHeight) {
		IgeTextureMap.prototype.init.call(this, tileWidth, tileHeight);
	},

	/**
	 * Get / set the data source that the atlas system will use
	 * to retrieve new map data when required.
	 * @param {String, Object} ds The url of the data source API
	 * endpoint or the actual map data object.
	 * @return {*}
	 */
	dataSource: function (ds) {
		if (ds !== undefined) {
			this._dataSource = ds;
			
			// Check the type of data source and set a flag so we don't
			// have to check it every time we read data
			switch (typeof(this._dataSource)) {
				case 'string':
					// The data source is a string so it must be a URL
					this._dataSourceType = 'url';
					break;
				
				case 'object':
					// The data source is an object so it must be map data
					this._dataSourceType = 'data';
					break;
			}
			
			return this;
		}

		return this._dataSource;
	},

	/**
	 * Gets / sets the extra data to load around the main texture map size to
	 * try to mitigate loading times on new data.
	 * @param {Number} x The number of pixels along the x axis to load.
	 * @param {Number} y The number of pixels along the y axis to load.
	 * @return {*}
	 */
	bufferZone: function (x, y) {
		if (x !== undefined && y !== undefined) {
			this._bufferZone = {x: x, y: y};
			return this;
		}
		
		return {x: this._bufferZone.x, y: this._bufferZone.y};
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTextureMap; }