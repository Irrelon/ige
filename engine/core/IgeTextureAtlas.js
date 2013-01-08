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
			return this;
		}

		return this._dataSource;
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeTextureMap; }