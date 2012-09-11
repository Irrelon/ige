var config = {
	include: [
		//{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'}
	],
	db: {
		type: 'mysql',
		host: 'localhost',
		user: 'root',
		pass: '',
		dbName: 'mysql'
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }