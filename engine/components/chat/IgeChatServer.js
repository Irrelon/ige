/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
var IgeChatServer = {
    /**
     * Creates a new room with the specified room name and options.
     * @param roomName The display name of the room.
     * @param options An object containing options key/values.
	 * @param {String=} roomId If specified, becomes the new room's ID.
     * @return {String} The new room's ID.
     */
    createRoom: function (roomName, options, roomId) {
		var self = ige.chat,
			newRoomId = roomId || ige.newIdHex();

       self._rooms[roomId] = {
            id: newRoomId,
            name: roomName,
            options: options,
            users: {}
        };

		// Inform all users that the room was created
		self._entity.network.send('igeChatRoomCreated', roomId);

        return roomId;
    },

	/**
	 * Removes an existing room with the specified id.
	 * @param roomId
	 * @return {Boolean}
	 */
    removeRoom: function (roomId) {
		var self = ige.chat;

        if (self._rooms[roomId]) {
			// Inform all users that the room was removed
			self._entity.network.send('igeChatRoomRemoved', roomId);

            delete self._rooms[roomId];
            return true;
        } else {
            return false;
        }
    },

	/**
	 * Sends a message to a room.
	 * @param {String} roomId The ID of the room to send the message to.
	 * @param {String} message The text body of the message to send.
	 * @param {Number=} to The id of the user to send the message to.
	 * @param {String} from The display name of the user that sent the message.
	 */
	sendToRoom: function (roomId, message, to, from) {
		var self = ige.chat;

		if (self._rooms[roomId]) {
			var room = self._rooms[roomId],
				msg, i;

			if (message !== undefined) {
				msg = {
					roomId: roomId,
					text: message,
					from: from.id,
					to: to
				};

				if (to) {
					// Send message to individual user
					if (room.users[to]) {
						self._entity.network.send('igeChatMsg', msg, room.users[to]);
					} else {
						console.log('Cannot send to user because specified user is not in room:', to);
					}
				} else {
					// Send this message to all users in the room
					for (i in room.users) {
						if (room.users.hasOwnProperty(i)) {
							self._entity.network.send('igeChatMsg', msg, room.users[i]);
							console.log('Sent message to user:', i);
						}
					}
				}
			} else {
				console.log('Cannot send message to room with blank message!');
			}
		} else {
			console.log('Cannot send message to room with id "' + roomId + '" because it does not exist!')
		}
	},

    _onMessageFromClient: function (msg, client) {
		var self = ige.chat,
			room;

        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!self.emit('messageFromClient', [msg, client])) {
            console.log('Message from client: (' + client.id + ')', msg);

			if (msg.roomId) {
				room = self._rooms[msg.roomId];
				if (room) {
					if (room.users[client.id]) {
						if (msg.text) {
							console.log('Sending message to room...');
							self.sendToRoom(msg.roomId, msg.text, msg.to, client);
						} else {
							console.log('Cannot send message because message text is empty!', msg);
						}
					} else {
						// The user is not in the room specified
						console.log('User tried to send message to room they are not joined in!', msg);
					}
				} else {
					// Room id specified does not exist
					console.log('User tried to send message to room that doesn\'t exist!', msg);
				}
			} else {
				// No room id in the message
				console.log('User tried to send message to room but didn\'t specify room id!', msg);
			}
        }
    },

    _onJoinRoomRequestFromClient: function (roomId, client) {
		var self = ige.chat;

        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!self.emit('clientJoinRoomRequest', [roomId, client])) {
			var room = self._rooms[roomId];

			console.log('Client wants to join room: (' + client.id + ')', roomId);

			// Check the room exists
			if (room) {
				// Check that the user isn't already part of the room user list
				if (!room.users[client.id]) {
					// Add the user to the room
					room.users[client.id] = client;
					ige.network.send('igeChatJoinRoom', {roomId: roomId, joined: true}, client);
					console.log('User "' + client.id + '" joined room ' + roomId);
				} else {
					// User is already in the room!
				}
			} else {
				// Room does not exist!
			}
        }
    },

    _onLeaveRoomRequestFromClient: function (roomId, client) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!self.emit('clientLeaveRoomRequest', [roomId, client])) {
            console.log('Client wants to leave room: (' + client.id + ')', roomId);
        }
    },

    _onClientWantsRoomList: function (data, client) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!self.emit('clientRoomListRequest', [data, client])) {
            console.log('Client wants the room list: (' + client.id + ')', data);
        }
    },

    _onClientWantsRoomUserList: function (roomId, client) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!self.emit('clientRoomUserListRequest', [roomId, client])) {
            console.log('Client wants the room user list: (' + client.id + ')', roomId);
        }
    }
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeChatServer; }