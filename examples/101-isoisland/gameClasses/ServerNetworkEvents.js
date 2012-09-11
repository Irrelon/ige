var ServerNetworkEvents = {
	_clientStore: {},

	/**
	 * Called when we receive a request from a client to login
	 * to the server. This is where we would usually check their
	 * login credentials and send a response of either success
	 * or failure.
	 * @param data
	 * @param clientId
	 * @private
	 */
	_login: function (data, clientId) {
		var self = ige.server;

		// TODO: Actually create a login system... at the moment we just accept the login from bob123
		console.log('Login request received', data);
		if (data.username === 'bob123' && data.password === 'moo123') {
			// Store the username in the client store
			self._clientStore[clientId] = self._clientStore[clientId] || {};
			self._clientStore[clientId].username = data.username;

			console.log('Sending login accepted...');
			ige.network.send('login', {success: true}, clientId);
		} else {
			console.log('Sending login denied...');
			ige.network.send('login', {success: false}, clientId);
		}
	},

	/**
	 * Called when we receive a request from a client to load
	 * the user's current map data and send it to them.
	 * @param data
	 * @param clientId
	 * @private
	 */
	_getMap: function (data, clientId) {
		// Grab all the data on the user's map
		var self = ige.server,
			searchData = {
				username: self._clientStore[clientId].username
			};

		ige.mongo.findAll('buildings', searchData, function (err, results) {
			console.log(results);
			if (results && results.length) {
				ige.network.send('getMap', results);
			}
		});
	},

	/**
	 * Called when we receive a request from a client to build
	 * something on their map.
	 * @param data
	 * @param clientId
	 * @private
	 */
	_placeItem: function (data, clientId) {
		var self = ige.server;

		// TODO: Do a data search first to ensure that no existing structure is at the tile co-ordinates!
		// Add the username to the data before storing it in the DB
		data.username = self._clientStore[clientId].username;

		ige.server.log('Placing item ' + data.classId + ' at ' + data.tileX + ', ' + data.tileY);
		ige.mongo.insert('buildings', [data]);
	},

	/**
	 * Called when we receive a request from a client to remove
	 * something on their map.
	 * @param data
	 * @param clientId
	 * @private
	 */
	_removeItem: function (data, clientId) {
		ige.server.log('Removing item at ' + data.tileX + ', ' + data.tileY);

		var self = ige.server,
			removeSearch = {
				tileX: data.tileX,
				tileY: data.tileY,
				username: self._clientStore[clientId].username // Limit the search remove to only this user's map!
			};

		ige.mongo.remove('buildings', removeSearch);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }