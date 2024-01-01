var ClientNetworkEvents = {
	/**
	 * The server sent us a login packet which carries either
	 * success or failure.
	 * @param data
	 * @private
	 */
	_login: function (data) {
		if (data.success) {
			// Our login was successful!
			ige.client.log('Server accepted our login request...');
			ige.client.startClient();
			ige.manualRender();
		} else {
			ige.client.log('Server rejected our login request!');
		}
	},

	/**
	 * The server sent us our map data so loop it and create
	 * the appropriate buildings.
	 * @param data
	 * @private
	 */
	_getMap: function (data) {
		ige.client.log('Map data received...');

		var i, item, entity;

		// Loop the map data and create the buildings
		for (i = 0; i < data.length; i++) {
			item = data[i];

			// Create the new building entity
			entity = ige.client.createTemporaryItem(item.classId)
				.data('tileX', item.tileX)
				.data('tileY', item.tileY)
				.translateToTile(item.tileX + 0.5, item.tileY + 0.5, 0);

			if (item.classId === 'SkyScraper') {
				entity.addFloors(item.buildFloors);
			}

			entity.place();
		}

		ige.manualRender();
	},

	_placeItem: function (data) {
		console.log('placeItem', data);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientNetworkEvents; }