var igeClientConfig = {
	include: [
		/* Some external libraries if you want */

		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/GameTextures.js',
		'./gameClasses/Player.js',
		'./gameClasses/Seat.js',
		'./gameClasses/BlackJackTable.js',
		'./gameClasses/Casino.js',
		
		'./gameClasses/Button.js',
		'./gameClasses/SceneLogon.js',
		'./gameClasses/SceneTable.js',
		
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }