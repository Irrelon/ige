var igeClientConfig = {
	include: [
		/* Include jQuery */
		'./gameClasses/jquery-1.9.1.min.js',
		
		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/ClientItem.js',
		'./gameClasses/ClientObjects.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }