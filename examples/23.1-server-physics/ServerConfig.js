var config = {
	include: [
		{name: 'Square', path: './gameClasses/Square'},
		{name: 'Circle', path: './gameClasses/Circle'},
		{name: 'Floor', path: './gameClasses/Floor'},
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }