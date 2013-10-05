var config = {
	include: [
		//{name: 'MyClassName', path: './gameClasses/MyClassFileName'},
		{name: 'BaseScene', path: './levels/BaseScene'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }