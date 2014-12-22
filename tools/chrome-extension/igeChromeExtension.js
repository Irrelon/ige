window.addEventListener("message", function(event) {
	// We only accept messages from ourselves


	// Pass the message onto the extension
	console.log('Proxy: Message received from IGE', event);
	chrome.extension.sendMessage(JSON.stringify(event.data), function(response) {
		console.log('extension said hello!', response);
	});
}, false);

/*
window.addEventListener('load', function () {
	var port = chrome.extension.connect({name: "igeChannel"});

	port.onMessage.addListener(function(msg) {
		console.log('Proxy: Message received from extension', msg);
		switch (msg.command) {
			case 'ping':

				break;
		}
	});

	window.addEventListener("message", function(event) {
		// We only accept messages from ourselves
		if (event.source != window)
			return;

		// Pass the message onto the extension
		console.log('Proxy: Message received from IGE', event);
		port.postMessage(event.data);
	}, false);
});*/
