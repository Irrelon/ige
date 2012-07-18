var ServerNetworkEvents = {
	_placeItem: function (data, socket) {
		console.log('placeItem', data, socket);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }