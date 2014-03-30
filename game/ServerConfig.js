var config = {
	include: [
		//{name: 'MyClassName', path: './gameClasses/MyClassFileName'},
        {name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'}
	],
    db: {
        type: 'mysql',
        host: 'localhost',
        user: 'root',
        pass: '123456',
        dbName: 'ghostbeam-ravlyan'
    }
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }