var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./levels/BaseScene.js',
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/MouseAim.js',

		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }