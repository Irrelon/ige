var ClientNetworkEvents = {
	_placeItem: function (data) {
		console.log('placeItem', data);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ClientNetworkEvents; }