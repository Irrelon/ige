import { ige } from "../../../engine/instance.js";
import { newIdHex } from "../../../engine/utils.js";
import { IGE_NETWORK_CHAT_JOIN_ROOM, IGE_NETWORK_CHAT_LEAVE_ROOM, IGE_NETWORK_CHAT_LIST_ROOMS, IGE_NETWORK_CHAT_MSG, IGE_NETWORK_CHAT_ROOM_CREATED, IGE_NETWORK_CHAT_ROOM_LIST_USERS, IGE_NETWORK_CHAT_ROOM_REMOVED } from "../../../enums/IgeConstants.js";
import { IgeChatComponent } from "../../../engine/network/chat/IgeChatComponent.js";
/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
export class IgeChatServer extends IgeChatComponent {
    constructor() {
        super();
        ige.dependencies.waitFor(["network"], () => {
            // Define the chat system network command listeners
            const network = ige.network;
            network.define(IGE_NETWORK_CHAT_MSG, this._onMessageFromClient);
            network.define(IGE_NETWORK_CHAT_JOIN_ROOM, this._onJoinRoomRequestFromClient);
            network.define(IGE_NETWORK_CHAT_LEAVE_ROOM, this._onLeaveRoomRequestFromClient);
            network.define(IGE_NETWORK_CHAT_LIST_ROOMS, this._onClientWantsRoomList);
            network.define(IGE_NETWORK_CHAT_ROOM_LIST_USERS, this._onClientWantsRoomUserList);
            network.define(IGE_NETWORK_CHAT_ROOM_CREATED);
            network.define(IGE_NETWORK_CHAT_ROOM_REMOVED);
            this.log("Chat server component initiated!");
        });
    }
    /**
     * Creates a new room with the specified room name and options.
     * @param roomName The display name of the room.
     * @param {String=} roomId If specified, becomes the new room's ID.
     * @param options An object containing options key/values.
     * @return {String} The new room's ID.
     */
    createRoom(roomName, roomId, options) {
        const network = ige.network;
        const newRoomId = roomId || newIdHex();
        this._rooms[newRoomId] = {
            id: newRoomId,
            name: roomName,
            users: [],
            options
        };
        // Inform all users that the room was created
        network.send(IGE_NETWORK_CHAT_ROOM_CREATED, newRoomId);
        return roomId;
    }
    /**
     * Removes an existing room with the specified id.
     * @param roomId
     * @return {Boolean}
     */
    removeRoom(roomId) {
        const network = ige.network;
        if (this._rooms[roomId]) {
            // Inform all users that the room was removed
            network.send(IGE_NETWORK_CHAT_ROOM_REMOVED, roomId);
            delete this._rooms[roomId];
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Sends a message to a room.
     * @param {String} roomId The ID of the room to send the message to.
     * @param {String} message The text body of the message to send.
     * @param {String=} to The id of the user to send the message to.
     * @param {String} from The id of the user that sent the message.
     */
    sendToRoom(roomId, message, to, from) {
        const network = ige.network;
        if (this._rooms[roomId]) {
            const room = this._rooms[roomId];
            if (message !== undefined) {
                const msg = {
                    roomId: roomId,
                    text: message,
                    from: from,
                    to: to
                };
                if (to) {
                    // Send message to individual user
                    if (room.users.indexOf(to) > -1) {
                        network.send(IGE_NETWORK_CHAT_MSG, msg, to);
                    }
                    else {
                        this.log('Cannot send to user because specified user is not in room: ' + to);
                    }
                }
                else {
                    // Send this message to all users in the room
                    this.log('Sending to all users...');
                    network.send(IGE_NETWORK_CHAT_MSG, msg, room.users);
                }
            }
            else {
                this.log('Cannot send message to room with blank message!');
            }
        }
        else {
            this.log('Cannot send message to room with id "' + roomId + '" because it does not exist!');
        }
    }
    _onMessageFromClient(msg, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!this.emit('messageFromClient', [msg, clientId])) {
            console.log('Message from client: (' + clientId + ')', msg);
            if (msg.roomId) {
                const room = this._rooms[msg.roomId];
                if (room) {
                    if (room.users.indexOf(clientId) > -1) {
                        if (msg.text) {
                            console.log('Sending message to room...');
                            this.sendToRoom(msg.roomId, msg.text, msg.to, clientId);
                        }
                        else {
                            console.log('Cannot send message because message text is empty!', msg);
                        }
                    }
                    else {
                        // The user is not in the room specified
                        console.log('User tried to send message to room they are not joined in!', msg);
                    }
                }
                else {
                    // Room id specified does not exist
                    console.log('User tried to send message to room that doesn\'t exist!', msg);
                }
            }
            else {
                // No room id in the message
                console.log('User tried to send message to room but didn\'t specify room id!', msg);
            }
        }
    }
    _onJoinRoomRequestFromClient(roomId, clientId) {
        const network = ige.network;
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!this.emit('clientJoinRoomRequest', [roomId, clientId])) {
            const room = this._rooms[roomId];
            this.log('Client wants to join room: (' + clientId + ')', roomId);
            // Check the room exists
            if (room) {
                // Check that the user isn't already part of the room user list
                if (room.users.indexOf(clientId) === -1) {
                    // Add the user to the room
                    room.users.push(clientId);
                    network.send(IGE_NETWORK_CHAT_JOIN_ROOM, { roomId: roomId, joined: true }, clientId);
                    console.log('User "' + clientId + '" joined room ' + roomId);
                }
                else {
                    // User is already in the room!
                }
            }
            else {
                // Room does not exist!
            }
        }
    }
    _onLeaveRoomRequestFromClient(roomId, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!this.emit('clientLeaveRoomRequest', [roomId, clientId])) {
            console.log('Client wants to leave room: (' + clientId + ')', roomId);
        }
    }
    _onClientWantsRoomList(data, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!this.emit('clientRoomListRequest', [data, clientId])) {
            console.log('Client wants the room list: (' + clientId + ')', data);
        }
    }
    _onClientWantsRoomUserList(roomId, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (!this.emit('clientRoomUserListRequest', [roomId, clientId])) {
            console.log('Client wants the room user list: (' + clientId + ')', roomId);
        }
    }
}
