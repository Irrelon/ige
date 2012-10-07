var Server = IgeClass.extend({
	classId: 'Server',
	Server: true,

	init: function (options) {
		// Add the mysql component to the engine and connect to the
		// mysql server
		ige.addComponent(IgeMySqlComponent, options.db).mysql.connect(function (err, db) {
			// Check if we connected to mysql correctly
			if (!err) {
				// Query the database
				ige.mysql.query('SELECT * FROM user', function (err, rows, fields) {
					if (!err) {
						console.log(rows[0]);
					} else {
						console.log('Error', err);
					}
				});
			} else {
				console.log(err);
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Server; }