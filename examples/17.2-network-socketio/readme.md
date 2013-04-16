# Network Demo Using Socket.io
This demo shows how to use the basic network functionality provided by the Socket.io Network Component. The demo is a
console-only demo so no graphics output should be expected. The demo REQUIRES that you run the server first and that the
index.html file is loaded from an HTTP server either on your local machine or a web server online.

# Server-Side
The demo creates a network server that listens on port 2000 and also defines a new network command called "test" which
will call the ClientNetworkEvents.js::_onTest() method when it is received. To run the server for this demo, use the
command (replacing the paths depending on where your IGE installation is located):
	node ./ige/server/ige -g ./ige/tests/17.2-network-socketio/

# Client-Side
## Open Your JS Console
All of the demo's IO happens in the console so open your browser's JS console!

When the client index.html file is loaded in the browser, the client.js code asks the browser to connect to the socket
server "localhost" on port 2000 (see client.js line 28). On successfully connecting to the server, the code will then
send a message to the server with the network command "test" and a JSON object as some data.

When this message is received on the server you should see some console output on the server's console that indicates it
received the message and it will automatically respond with some data back (see ServerNetworkEvents.js line 12).

Your browser's console should then output the received message as per ClientNetworkEvents.js line 9.