var IgeMongoDb = {
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
		this._strict = params.strict;
		this._nativeParser = params.nativeParser;

		if (!this._port) { this._port = 27017; }
		this.log('Settings initialised');
	},

	/**
	 * Connect to the database with the current settings.
	 * @param callback
	 */
	connect: function (callback) {
		this.log('Connecting to mongo database "'  + this._database + '" @' + this._host + ':' + this._port);

		var mongoServer = new this._mongo.Server(
			this._host,
			parseInt(this._port),
			{}
		), self = this;

		this.client = new this._mongo.Db(
			this._database,
			mongoServer,
			{native_parser: this._nativeParser}
		);

		this.client.strict = this._strict;

		// Open the database connection
		this.client.open(function(err, db) {
			// If we have a username then authenticate!
			if (self._username) {
				self.client.authenticate(self._username, self._password, function (err) {
					if (err) {
						self.log('Error when authenticating with the database!');
						//console.log(err);

						if (typeof(callback) === 'function') {
							callback.apply(self, [err]);
						}
					} else {
						self.log('Connected to mongo DB ok, processing callbacks...');
						self._connected.apply(self, [err, db, callback]);
					}
				});
			} else {
				if (err) {
					self.log('Error when connecting to the database!');
					//console.log(err);

					if (typeof(callback) === 'function') {
						callback.apply(self, [err]);
					}
				} else {
					self.log('Connected to mongo DB ok, processing callbacks...');
					self._connected.apply(self, [err, db, callback]);
				}
			}
		});

	},

	/**
	 * Disconnect from the current mongo connection.
	 * @param callback
	 */
	disconnect: function (callback) {
		this.log("Closing DB connection...");
		this.client.close();

		callback();
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
			this.log('MongoDB connected successfully.');
			this.emit('connected');
		} else {
			this.log('MongoDB connection error', 'error', err);
			this.emit('connectionError');
		}

		if (typeof(callback) === 'function') {
			callback.apply(this, [err, db]);
		}
	},

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

	/* findAll - Finds many rows of data and returns them as an array */
	findAll: function (coll, json, callback) {
		var self = this;

		this.client.collection(coll, function (err, tempCollection) {
			if (!err) {
				// Got the collection (or err)
				tempCollection.find(json, function (err, tempCursor) {
					// Got the result cursor (or err)
					tempCursor.toArray(function (err, results) {
						var i;

						if (results) {
							for (i in results) {
								if (results.hasOwnProperty(i)) {
									self.idToCollectionId(coll, results[i]);
								}
							}
						}

						// Callback the results
						if (typeof(callback) === 'function') {
							callback.apply(self, [err, results]);
						}
					});
				});
			} else {
				self.log('Mongo cannot run a findAll on collection ' + coll + ' with error: ' + err, 'error', tempCollection);
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeMongoDb; }