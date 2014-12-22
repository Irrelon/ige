var igeClientConfig = {
	include: [
		/* Some external libraries if you want */

		/* Your custom game JS scripts */
		
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Rotator.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }