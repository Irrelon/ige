var igeClientConfig = {
	include: [
		/* Some external libraries if you want */

		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/GameTextures.js',
		'./gameClasses/Card.js',
		'./gameClasses/Player.js',
		'./gameClasses/Seat.js',
		'./gameClasses/BlackJackBackground.js',
		'./gameClasses/BlackJackTable.js',
		'./gameClasses/Casino.js',
		
		'./gameClasses/Button.js',
		'./gameClasses/Scene.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }