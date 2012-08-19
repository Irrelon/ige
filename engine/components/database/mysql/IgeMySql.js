var IgeMySql = {
	/**
	 * Set the current settings for the database connection. This should
	 * be called before any call to connect().
	 * @param params
	 */
	settings: function (params) {
		this._host = params.host;
		this._port = params.port;
		this._database = params.dbName;
		this._username = params.user;
		this._password = params.pass;

		if (!this._port) { this._port = 3306; }
		this.log('Settings initialised');
	},

	/**
	 * Connect to the database with the current settings.
	 * @param callback
	 */
	connect: function (callback) {
		var self = this;

		this.log('Connecting to mysql database "'  + this._database + '" @' + this._host + ':' + this._port);
		self.client = this._mysql.createConnection({
				host: self._host,
				port: parseInt(self._port, 10),
				user: self._username,
				password: self._password,
				database: self._database
			});

		// Handle disconnects with auto-reconnect
		self.client.on('error', function(err) {
			if (!err.fatal) {
				return;
			}

			if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
				throw err;
			}

			self.log('Re-connecting lost connection: ' + err.stack);

			self.client = self._mysql.createConnection({
				host: self._host,
				port: parseInt(self._port, 10),
				user: self._username,
				password: self._password,
				database: self._database
			});

			self.client.connect(function (err) {
				self.escape = self.client.escape;
				self.emit('reconnected', [err, self.client]);
			});
		});

		// Connect to the db
		self.client.connect(function (err) {
			self.escape = self.client.escape;
			self._connected.apply(self, [err, self.client, callback]);
		});
	},

	/**
	 * Disconnect from the current mysql connection.
	 * @param callback
	 */
	disconnect: function (callback) {
		this.log("Closing DB connection...");
		this.connection.end(function () {
			callback();
		});
	},

	/**
	 * Called by the connect() method once a connection has been established
	 * or a connection error occurs.
	 * @param err
	 * @param db
	 * @param callback
	 * @private
	 */
	_connected: function (err, db, callback) {
		if (!err) {
			this.log('MySQL connected successfully.');
			this.emit('connected');
		} else {
			switch (err.code) {
				case 'ER_DBACCESS_DENIED_ERROR':
					this.log('MySQL connection error, access denied. Are you using the correct login details?', 'warning', err);
					break;

				default:
					this.log('MySQL connection error', 'warning', err);
					break;
			}

			this.emit('connectionError');
		}

		if (typeof(callback) === 'function') {
			callback.apply(this, [err, db]);
		}
	},

	/**
	 * Query the database with SQL and return the result
	 * via the callback method.
	 * @param query
	 * @param callback
	 */
	query: function (query, callback) {
		this.client.query(query, callback);
	},

	/**
	 * Executes a select query with the JSON object properties
	 * as column names and their values as the where clause.
	 * @param coll
	 * @param json
	 * @param callback
	 */
	findAll: function (coll, json, callback) {
		var i, whereClause, select = 'SELECT * FROM ' + coll;

		// Convert a json object's data into a select query
		for (i in json) {
			if (json.hasOwnProperty(i)) {
				if (whereClause) {
					whereClause += ' AND ';
				}
				whereClause += i + ' = "' + json[i] + '"';
			}
		}

		if (whereClause) {
			whereClause = ' WHERE ' + whereClause;
		}

		this.query(select + whereClause, callback);
	},

	// TODO: Update this call to work with the MySQL driver, this is currently still tuned to MongoDB
	/**
	 * Inserts a new row into the database.
	 * @param coll The collection name to insert the row into.
	 * @param json The JSON data to insert. Must be wrapped in an array to
	 * work e.g. [{myData: true}]
	 * @param callback A callback method to call once the insert is complete.
	 */
	insert: function (coll, json, callback) {
		var self = this;

		this.client.collection(coll, function (err, tempCollection) {
			if (!err) {
				// Got the collection
				tempCollection.insert(json, function (err, docs) {
					var i;

					if (!err) {
						if (docs.length > 1) {
							for (i in docs) {
								if (docs.hasOwnProperty(i)) {
									self.idToCollectionId(coll, docs[i]);
								}
							}
						} else {
							docs = docs[0];
							self.idToCollectionId(coll, docs);
						}
					} else {
						self.log('Items you submit to be inserted in the database must be wrapped in an array. Are you wrapping it like [jsonObj] ?');
						self.log('Mongo cannot insert item into database, error: ' + err, 'warning', json);
					}

					// Callback the result
					if (typeof(callback) === 'function') {
						callback(err, docs);
					}
				});
			} else {
				this.log('Mongo cannot get collection ' + coll + ' with error: ' + err, 'warning', tempCollection);
			}
		});
	},

	// TODO: Update this call to work with the MySQL driver, this is currently still tuned to MongoDB
	/* remove - Removes all rows that match the passed criteria */
	remove: function (coll, json, callback) {
		var self = this;

		this.client.collection(coll, function (err, tempCollection) {
			if (!err) {
				self.collectionIdToId(coll, json);

				// Got the collection (or err)
				tempCollection.remove(json, {safe:true}, function (err, tempCollection) {
					// Got results array (or err)
					// Callback the result array
					if (typeof(callback) === 'function') {
						callback.apply(self, [err]);
					}
				});
			} else {
				self.log('Mongo cannot run a remove on collection ' + coll + ' with error: ' + err, 'error', tempCollection);
			}
		});
	},

	/* idToCollectionId - MongoDB specific - Finds the _id field returned by the database and
	renames it to COLL_id where COLL = collection name e.g. with data from the "test" collection
	the resulting object would have its ID stored in the field called test_id. This is very
	useful when making Mongo data compatible with other databases whose tables will usually have
	their ID (primary key) fields in the format of tableName_dbId */
	idToCollectionId: function (coll, obj) {
		obj[coll + '_db_id'] = String(obj._id);
		delete obj._id;
	},

	/* collectionIdToId - MongoDB specific - Reverse of the idToCollectionId method */
	collectionIdToId: function (coll, obj) {
		if (obj[coll + '_db_id']) {
			obj._id = new this.client.bson_serializer.ObjectID(obj[coll + '_db_id']);
			delete obj[coll + '_db_id'];
		}
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMySql; }