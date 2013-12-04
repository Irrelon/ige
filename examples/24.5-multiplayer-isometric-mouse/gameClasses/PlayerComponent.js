var PlayerComponent = IgeEntity.extend({
	classId: 'PlayerComponent',
	componentId: 'playerControl',

	init: function (entity, options) {
		var self = this;

		// Store the entity that this component has been added to
		this._entity = entity;

		// Store any options that were passed to us
		this._options = options;
		
		if (ige.isClient) {
			// Listen for mouse events on the texture map
			ige.client.textureMap1.mouseUp(function (tileX, tileY, event) {
				// Send a message to the server asking to path to this tile
				ige.network.send('playerControlToTile', [tileX, tileY]);
			});
		}
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = PlayerComponent; }