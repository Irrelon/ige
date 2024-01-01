var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Character.js',
		'./gameClasses/PlayerComponent.js',
		'./maps/home/BackgroundLayer1.js',
		'./maps/home/StaticObjectLayer1.js',
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }