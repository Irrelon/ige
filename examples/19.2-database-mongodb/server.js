var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		// Start the network server
		ige.addComponent(IgeMongoDbComponent, options.db).mongo.connect(function (err, db) {
			// Check if we connected to mongo correctly
			if (!err) {
				// Insert something
				ige.mongo.insert('user', {id: 1, username:'test', password:'moo'}, function (err, results) {
					if (!err) {
						console.log('Insert successful');

						// Query the database
						ige.mongo.findAll('user', {}, function (err, rows) {
							if (!err) {
								console.log(rows);

								// Update the data
								ige.mongo.update('user', {/* Search object */ username: 'test'}, {/* Update data object */ 'username':'foobarmoo!', 'newField':'somethingNew!!'}, function (err, results) {
									if (!err) {
										// Query the database to show the updated data
										ige.mongo.findAll('user', {}, function (err, rows) {
											if (!err) {
												console.log(rows);

												// Remove the insert we did
												ige.mongo.remove('user', {'password':'moo'}, function (err, results) {
													if (!err) {
														console.log('Removed successfully');
													} else {
														console.log('Error', err);
													}
												});
											} else {
												console.log('Error', err);
											}
										});
									} else {
										console.log('Error', err);
									}
								});
							} else {
								console.log('Error', err);
							}
						});
					} else {
						console.log('Error', err);
					}
				});
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }