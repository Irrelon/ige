/**
 * Created by Jimmy on 2014-02-23.
 */
var ChatServer = {
    createRoom: function(roomName, roomId, options) {
        var self = ige.chat;

        self._rooms[roomId] = {
            name: roomName,
            options: options,
            users: []
        };

        console.log('A new room (' + roomName + ') with id "' + roomId + '" has been created!');
        self._entity.network.send('onChatRoomCreated', roomId);
    },

    createGlobalRoom: function(roomName, roomId, options) {
        var self = this;

        self._globalRooms[roomId] = {
            name: roomName,
            options: options,
            users: []
        };

        console.log('A new room (' + roomName + ') with id "' + roomId + '" has been created!');
        self._entity.network.send('onChatGlobalRoomCreated', roomId);
    },

    removeRoom: function(roomId) {
        var self = ige.chat;

        if (self._rooms[roomId]) {
            // inform all users that this chat room has been removed
            self._entity.network.send('onChatRoomRemoved', roomId);

            delete self._rooms[roomId];
            return true;
        } else {
            return false; // room does not exist
        }
    },

    removeGlobalRoom: function(roomId) {
        var self = this;

        if (self._globalRooms[roomId]) {
            // inform all users that this chat room has been removed
            self._entity.network.send('onGlobalChatRoomRemoved', roomId);

            delete self._globalRooms[roomId];
            return true;
        } else {
            return false; // room does not exist
        }
    },

    _onJoinRoomRequest: function(data, clientId) { // ToDo : copy method for the global rooms
        var self = ige.chat;

        if (!self.emit('clientJoinRoomRequest', [data, clientId])) {
            var room = self._rooms[data.roomId];

            console.log('Client (' +  clientId + ') wants to join room: ' + data.roomId);

            // check if room exists
            if (room) {
                // check if the user already exists in the room
                if (!room.users[clientId]) {

                    // if not, add user to the room
                    room.users.push({clientId: clientId, name: data.name});
                    ige.network.send('onChatJoinRoom', {roomId: data.roomId, joined: true}, clientId);
                    console.log('User "' + clientId + '" joined room ' + data.roomId);
                } else {
                    // user already exists in the room!
                    console.log('joinroom fail: User already exists in the room!');
                }
            } else {
                // room does not exist!
                console.log('joinroom fail: Room does not exist!');
            }
        } else {
            console.log('join room event cancelled');
        }
    },

    _onRoomMessageFromClient: function(data, clientId) {
        var self = ige.chat;

        // check if room exists
        if (self._rooms[data.roomId]) {
            var room = self._rooms[data.roomId];

            // check if the user actually exists in the room!
            var pos = room.users.map(function(e) { return e.clientId; }).indexOf(clientId);

            console.log('array checking: map() = ' + pos);

            if (pos > -1 ) {
                var arrVal = room.users[pos];
                console.log('Server: emitting message to all users in roomId: ' + data.roomId);
                ige.network.send('onChatRoomMsg', {msg: data.msg, userName: arrVal.name}, room.users.map(function(e) { return e.clientId; }));
            }
        }
    }
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ChatServer; }