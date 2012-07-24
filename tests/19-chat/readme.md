# Chat Demo
This demo shows how to use the basic chat functionality provided by the IGE Chat Component. The demo is a console-only demo so no graphics output should be expected.

# Server-Side
The demo creates a new room called "The Lobby" with the room id "lobby" automatically. You can see this in server.js:23. You can change this if you prefer but it makes sense to have at least one chat room created by default.

# Client-Side
## Open Your JS Console
All of the demo's IO happens in the console so open your browser's JS console! Further examples below expect you to type into the JS console.

## Join the Lobby Room
First, join the lobby:
	ige.chat.joinRoom('lobby');

You should see a console message:
	Server says we have joined room "lobby".

## Send a Chat Message
To send a chat message, specify the room to send it to and the message to send:
	ige.chat.sendToRoom('lobby', 'HELLO!');

This sends a message "HELLO!" to the room with the id "lobby". Since you are in the room "lobby" you will also received the message you just sent. The console should read:
	Server sent us a message in the room "lobby" from the user id "32890n0h943n04itgy": HELLO!

