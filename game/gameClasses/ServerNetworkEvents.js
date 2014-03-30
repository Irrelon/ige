/**
 * Created by Jimmy on 2014-03-30.
 */
var ServerNetworkEvents = {

    _onDbTest: function(data, clientId) {
        console.log('onDbTest command received from client! data:', data);
        if (data !== 'undefined') {
            ige.mysql.connect(function (err, db) {
                // Check if we connected to mysql correctly
                if (!err) {
                    // Query the database
                    ige.mysql.query('SELECT * FROM users', function (err, rows, fields) {
                        if (!err) {
                            // return the data to the client who requested it
                            console.log('onDbTest returning data:', rows);
                            ige.network.send('onDbTest', rows, clientId);
                        } else {
                            console.log('Error', err);
                        }
                    });
                } else {
                    console.log(err);
                }
            });
        }
    }
}