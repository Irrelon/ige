"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeChatServer = void 0;
const instance_1 = require("../../instance.js");
const IgeChatComponent_1 = require("./IgeChatComponent.js");
const ids_1 = require("../../utils/ids.js");
const enums_1 = require("../../../enums/index.js");
/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
class IgeChatServer extends IgeChatComponent_1.IgeChatComponent {
    constructor() {
        super();
        instance_1.ige.dependencies.waitFor(["network"], () => {
            // Define the chat system network command listeners
            const network = instance_1.ige.network;
            network.define(enums_1.IGE_NETWORK_CHAT_MSG, this._onMessageFromClient);
            network.define(enums_1.IGE_NETWORK_CHAT_JOIN_ROOM, this._onJoinRoomRequestFromClient);
            network.define(enums_1.IGE_NETWORK_CHAT_LEAVE_ROOM, this._onLeaveRoomRequestFromClient);
            network.define(enums_1.IGE_NETWORK_CHAT_LIST_ROOMS, this._onClientWantsRoomList);
            network.define(enums_1.IGE_NETWORK_CHAT_ROOM_LIST_USERS, this._onClientWantsRoomUserList);
            network.define(enums_1.IGE_NETWORK_CHAT_ROOM_CREATED);
            network.define(enums_1.IGE_NETWORK_CHAT_ROOM_REMOVED);
            this.log("Chat server component initiated!");
        });
    }
    /**
     * Creates a new room with the specified room name and options.
     * @param roomName The display name of the room.
     * @param {string=} roomId If specified, becomes the new room's ID.
     * @param options An object containing options key/values.
     * @return {string} The new room's ID.
     */
    createRoom(roomName, roomId, options) {
        const network = instance_1.ige.network;
        const newRoomId = roomId || (0, ids_1.newIdHex)();
        this._rooms[newRoomId] = {
            id: newRoomId,
            name: roomName,
            users: [],
            options
        };
        // Inform all users that the room was created
        network.send(enums_1.IGE_NETWORK_CHAT_ROOM_CREATED, newRoomId);
        return roomId;
    }
    /**
     * Removes an existing room with the specified id.
     * @param roomId
     * @return {boolean}
     */
    removeRoom(roomId) {
        const network = instance_1.ige.network;
        if (this._rooms[roomId]) {
            // Inform all users that the room was removed
            network.send(enums_1.IGE_NETWORK_CHAT_ROOM_REMOVED, roomId);
            delete this._rooms[roomId];
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Sends a message to a room.
     * @param {string} roomId The ID of the room to send the message to.
     * @param {string} message The text body of the message to send.
     * @param {string=} to The id of the user to send the message to.
     * @param {string} from The id of the user that sent the message.
     */
    sendToRoom(roomId, message, to, from) {
        const network = instance_1.ige.network;
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
                        network.send(enums_1.IGE_NETWORK_CHAT_MSG, msg, to);
                    }
                    else {
                        this.log("Cannot send to user because specified user is not in room: " + to);
                    }
                }
                else {
                    // Send this message to all users in the room
                    this.log("Sending to all users...");
                    network.send(enums_1.IGE_NETWORK_CHAT_MSG, msg, room.users);
                }
            }
            else {
                this.log("Cannot send message to room with blank message!");
            }
        }
        else {
            this.log("Cannot send message to room with id \"" + roomId + "\" because it does not exist!");
        }
    }
    _onMessageFromClient(msg, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("messageFromClient", msg, clientId) !== enums_1.IgeEventReturnFlag.cancel) {
            console.log("Message from client: (" + clientId + ")", msg);
            if (msg.roomId) {
                const room = this._rooms[msg.roomId];
                if (room) {
                    if (room.users.indexOf(clientId) > -1) {
                        if (msg.text) {
                            console.log("Sending message to room...");
                            this.sendToRoom(msg.roomId, msg.text, msg.to, clientId);
                        }
                        else {
                            console.log("Cannot send message because message text is empty!", msg);
                        }
                    }
                    else {
                        // The user is not in the room specified
                        console.log("User tried to send message to room they are not joined in!", msg);
                    }
                }
                else {
                    // Room id specified does not exist
                    console.log("User tried to send message to room that doesn't exist!", msg);
                }
            }
            else {
                // No room id in the message
                console.log("User tried to send message to room but didn't specify room id!", msg);
            }
        }
    }
    _onJoinRoomRequestFromClient(roomId, clientId) {
        const network = instance_1.ige.network;
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("clientJoinRoomRequest", roomId, clientId) !== enums_1.IgeEventReturnFlag.cancel) {
            const room = this._rooms[roomId];
            this.log("Client wants to join room: (" + clientId + ")", roomId);
            // Check the room exists
            if (room) {
                // Check that the user isn't already part of the room user list
                if (room.users.indexOf(clientId) === -1) {
                    // Add the user to the room
                    room.users.push(clientId);
                    network.send(enums_1.IGE_NETWORK_CHAT_JOIN_ROOM, { roomId: roomId, joined: true }, clientId);
                    console.log("User \"" + clientId + "\" joined room " + roomId);
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
        if (this.emit("clientLeaveRoomRequest", roomId, clientId) !== enums_1.IgeEventReturnFlag.cancel) {
            console.log("Client wants to leave room: (" + clientId + ")", roomId);
        }
    }
    _onClientWantsRoomList(data, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("clientRoomListRequest", data, clientId) !== enums_1.IgeEventReturnFlag.cancel) {
            console.log("Client wants the room list: (" + clientId + ")", data);
        }
    }
    _onClientWantsRoomUserList(roomId, clientId) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("clientRoomUserListRequest", roomId, clientId) !== enums_1.IgeEventReturnFlag.cancel) {
            console.log("Client wants the room user list: (" + clientId + ")", roomId);
        }
    }
}
exports.IgeChatServer = IgeChatServer;
