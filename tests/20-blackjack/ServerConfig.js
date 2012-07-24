var config = {
	include: [
		{name: 'ServerNetworkEvents', path: './ServerNetworkEvents'}
	],
	db: {
		type: 'mongo',
		host: 'localhost',
		//port: '',
		//user: 'lionhead1',
		//pass: 'testing123',
		dbName: 'dev'
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }