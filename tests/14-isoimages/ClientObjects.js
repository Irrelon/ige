var ClientObjects = {
	Bank: IgeInteractiveEntity.extend({
		init: function (parent, tileX, tileY, tileWidth, tileHeight) {
			this._super();
			var self = this;

			this.isometric(true)
				.mount(parent)
				.widthByTile(0.75)
				.heightByTile(0.75)
				.size3d(tileWidth * parent._tileWidth, tileHeight * parent._tileHeight, parent._tileHeight / 1.6)
				.translateToTile(tileX, tileY, 0)
				.texture(ige.client.gameTexture.bank)
				.mouseOver(function () {self.highlight(true);})
				.mouseOut(function () {self.highlight(false);});
		}
	})
};