var config = {
	include: [
		{name: 'ServerNetworkEvents', path: './ServerNetworkEvents'}
	],
	db: {
		type: 'mongo',
		host: 'staff.mongohq.com',
		port: '10054',
		user: 'lionhead1',
		pass: 'testing123',
		dbName: 'lionhead1'
	}
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }