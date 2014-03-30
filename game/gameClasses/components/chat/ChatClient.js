/**
 * Created by Jimmy on 2014-02-23.
 */
var ChatClient = {

    setName: function(name) {
        var self = ige.chat;

        self.name = name;
        console.log('chat name set! (' + name + ')');
    },

    joinRoom: function(roomId) {
        var self = ige.chat;

        // check if name has been specified
        if (self.name === undefined) {
            console.log('Cannot join room: Chat name has not been defined yet!');
        } else {
            // if we have a name, join the room
            var data = {};
            data.name = self.name;
            data.roomId = roomId;
            console.log('Sending room join request to server...');
            ige.network.send('onChatJoinRoom', data);
            console.log('send complete!');
        }
    },

    getRoomList: function() {
//        ige.network.request('chatRequestAvailableRooms')
    },

    sendMessage: function(message) {
        // ToDo : check if message contains "/w <name> <message>" and adapt network call to this (cont...)
        // (maybe this should be done elsewhere in the code before calling this method? And thus make two different methods)
        var self = ige.chat;

        // check if we are in a room first! And that we have a username
        if (self._room && self.name) {
            // if so, send the message to everyone in the room!
            // (or rather, notify the server that you want to)
            console.log('Client is sending its chat message to server...');
            ige.network.send('onChatRoomMsg', {msg: message, roomId: self._room});
        } else {
            console.log('Client couldn\'t send the message. Have you set a username and joined a room?');
        }
    },

    _onJoinedRoom: function(data) {
        var self = ige.chat;

        console.log('Client has received call from server for "onJoinedRoom"');
        // check if we successfully join a room...
        if (data.joined === true) {

            console.log('Room successfully joined!');
            self._room = data.roomId; // save the roomId for sending messages
        }
    },

    _onRoomCreated: function() {
    },

    _onRoomRemoved: function() {
    },

    _onGlobalRoomCreated: function() {
    },

    _onGlobalRoomRemoved: function() {
    },

    _onRoomMessageFromServer: function(data) {
        // ToDo : chat room message received
        console.log('A chat message was received from the server! data: ', data);
        ige.client.chatLabel.value('' + data.userName + ' says: ' + data.msg);
    }
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ChatClient; }