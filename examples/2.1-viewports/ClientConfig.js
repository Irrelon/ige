var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./levels/BaseScene.js',
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Behaviours.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }