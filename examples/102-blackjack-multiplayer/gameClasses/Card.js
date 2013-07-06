var Card = IgeEntity.extend({
	classId: 'Card',
	
	init: function (suit, val) {
		IgeEntity.prototype.init.call(this);
		
		if (suit && val) {
			this._suit = suit;
			this._val = val;
		}
		
		// Scale the card
		this.scaleTo(0.7, 0.7, 0.7);
		
		this.streamSections(['transform', 'card']);
	},
	
	streamSectionData: function (sectionId, data) {
		if (sectionId == 'card') {
			if (data !== undefined) {
				// Split the string into data bits
				var bits = data.split(',');
				this._suit = parseInt(bits[0]);
				this._val = parseInt(bits[1]);
				
				if (!ige.isServer) {
					this.texture(ige.client.gameTextures.tex('game', 'cards'))
						.cell(((this._suit - 1) * 13) + this._val);
					
					this.dimensionsFromCell();
				}
			} else {
				return this._suit + ',' + this._val;
			}
		} else {
			IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Card; }