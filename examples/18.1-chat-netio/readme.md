# Chat Demo Using Net.io
This demo shows how to use the basic chat functionality provided by the IGE Chat Component. The demo is a console-only
demo so no graphics output should be expected. The demo REQUIRES that you run the server first and that the index.html
file is loaded from an HTTP server either on your local machine or a web server online.

# Server-Side
The demo creates a new room called "The Lobby" with the room id "lobby" automatically. You can see this in server.js:23.
You can change this if you prefer but it makes sense to have at least one chat room created by default. To run the
server for this demo, use the command (replacing the paths depending on where your IGE installation is located):
	node ./ige/server/ige -g ./ige/tests/18.1-chat-netio/

# Client-Side
## Open Your JS Console
All of the demo's IO happens in the console so open your browser's JS console! Further examples below expect you to type
into the JS console.

## Join the Lobby Room
First, join the lobby:
	ige.chat.joinRoom('lobby');

You should see a console message:
	Server says we have joined room "lobby".

## Send a Chat Message
To send a chat message, specify the room to send it to and the message to send:
	ige.chat.sendToRoom('lobby', 'HELLO!');

This sends a message "HELLO!" to the room with the id "lobby". Since you are in the room "lobby" you will also received
the message you just sent. The console should read:
	Server sent us a message in the room "lobby" from the user id "32890n0h943n04itgy": HELLO!

## Open a New Browser Window
Load the index.html file on a new browser window and make sure your JS console is open as well. You can then repeat the
instructions above for the new window and send messages back and forward between multiple windows.