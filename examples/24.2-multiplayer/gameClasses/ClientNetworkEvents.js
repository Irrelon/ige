var ClientNetworkEvents = {
	/**
	 * Is called when a network packet with the "playerEntity" command
	 * is received by the client from the server. This is the server telling
	 * us which entity is our player entity so that we can track it with
	 * the main camera!
	 * @param data The data object that contains any data sent from the server.
	 * @private
	 */
	_onPlayerEntity: function (data) {
		if (ige.$(data)) {
			ige.client.vp1.camera.trackTranslate(ige.$(data), 20);
		} else {
			// The client has not yet received the entity via the network
			// stream so lets ask the stream to tell us when it creates a
			// new entity and then check if that entity is the one we
			// should be tracking!
			ige.network.stream.on('entityCreated', function (entity) {
				if (entity.id() === data) {
					ige.client.vp1.camera.trackTranslate(ige.$(data), 20);
				}
			}, null, true);
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientNetworkEvents; }