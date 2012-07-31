var ServerNetworkEvents = {
	/**
	 * Called when we receive a request from a client to login
	 * to the server. This is where we would usually check their
	 * login credentials and send a response of either success
	 * or failure.
	 * @param data
	 * @param socket
	 * @private
	 */
	_login: function (data, socket) {
		// TODO: Actually create a login system... at the moment we just accept the login from bob123
		console.log('Login request received', data);
		if (data.username === 'bob123' && data.password === 'moo123') {
			// Store the username on the socket object - is this the right thing to do?
			socket.store.ige = socket.store.ige || {};
			socket.store.ige.username = data.username;

			console.log('Sending login accepted...');
			ige.network.send('login', {success: true}, socket);
		} else {
			console.log('Sending login denied...');
			ige.network.send('login', {success: false}, socket);
		}
	},

	/**
	 * Called when we receive a request from a client to load
	 * the user's current map data and send it to them.
	 * @param data
	 * @param socket
	 * @private
	 */
	_getMap: function (data, socket) {
		// Grab all the data on the user's map
		var searchData = {
			username: socket.store.ige.username
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
	 * @param socket
	 * @private
	 */
	_placeItem: function (data, socket) {
		// TODO: Do a data search first to ensure that no existing structure is at the tile co-ordinates!
		// Add the username to the data before storing it in the DB
		data.username = socket.store.ige.username;

		ige.server.log('Placing item ' + data.classId + ' at ' + data.tileX + ', ' + data.tileY);
		ige.mongo.insert('buildings', [data]);
	},

	/**
	 * Called when we receive a request from a client to remove
	 * something on their map.
	 * @param data
	 * @param socket
	 * @private
	 */
	_removeItem: function (data, socket) {
		ige.server.log('Removing item at ' + data.tileX + ', ' + data.tileY);

		var removeSearch = {
			tileX: data.tileX,
			tileY: data.tileY,
			username: socket.store.ige.username // Limit the search remove to only this user's map!
		};

		ige.mongo.remove('buildings', removeSearch);
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ServerNetworkEvents; }