var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		//'./gameClasses/MyClassFile.js',
        './gameClasses/components/chat/ChatComponent.js',
        './gameClasses/components/chat/ChatClient.js',
        './gameClasses/components/chat/ChatServer.js',
        './gameClasses/ClientNetworkEvents.js',

		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }