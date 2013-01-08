// Define chest class
var Chest = IgeEntity.extend({
	classId: 'Chest',

	init: function () {
		var self = this;
		IgeEntity.prototype.init.call(this);

		// Load the chest texture file
		this._chestTexture = new IgeCellSheet('../assets/textures/tiles/tilef.png', 16, 16);

		// Wait for the texture to load
		this._characterTexture.on('loaded', function () {
			self.texture(self._characterTexture)
				.dimensionsFromCell();
		}, false, true);
	}
});