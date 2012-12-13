var igeClientConfig = {
	include: [
		/* Some external libraries if you want */
		// jQuery is not require for the engine to run, this is just an example
		'https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js',

		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Rotator.js',
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }