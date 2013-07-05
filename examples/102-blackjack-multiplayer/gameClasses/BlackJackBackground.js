var BlackJackBackground = IgeEntity.extend({
	classId: 'BlackJackBackground',
	
	init: function () {
		IgeEntity.prototype.init.call(this);
		
		if (!ige.isServer) {
			this.texture(ige.client.gameTextures.tex('ui', 'blackJackTableBackground'))
					.dimensionsFromTexture();
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = BlackJackBackground; }