var igeClientConfig = {
	include: [
		/* Include jQuery */
		'./gameClasses/jquery-1.9.1.min.js',
		
		/* Graphs */
		'./graphs/DefaultLevel.js',
		
		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }