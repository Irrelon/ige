"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeChatClient = void 0;
const exports_1 = require("../../../export/exports.js");
const exports_2 = require("../../../export/exports.js");
const exports_3 = require("../../../export/exports.js");
const exports_4 = require("../../../export/exports.js");
/**
 * The client-side chat component. Handles all client-side
 * chat methods and events.
 */
class IgeChatClient extends exports_1.IgeChatComponent {
    constructor() {
        super();
        exports_2.ige.dependencies.waitFor(["network"], () => {
            // Define the chat system network command listeners
            const network = exports_2.ige.network;
            network.define(exports_4.IGE_NETWORK_CHAT_MSG, this._onMessageFromServer);
            network.define(exports_4.IGE_NETWORK_CHAT_JOIN_ROOM, this._onJoinedRoom);
            network.define(exports_4.IGE_NETWORK_CHAT_LEAVE_ROOM, this._onLeftRoom);
            network.define(exports_4.IGE_NETWORK_CHAT_LIST_ROOMS, this._onServerSentRoomList);
            network.define(exports_4.IGE_NETWORK_CHAT_ROOM_LIST_USERS, this._onServerSentRoomUserList);
            network.define(exports_4.IGE_NETWORK_CHAT_ROOM_CREATED, this._onRoomCreated);
            network.define(exports_4.IGE_NETWORK_CHAT_ROOM_REMOVED, this._onRoomRemoved);
            this.log("Chat client component initiated!");
        });
    }
    /**
     * Asks the serve to let us join the room specified.
     * @param {string} roomId The room id of the room to join.
     */
    joinRoom(roomId) {
        const network = exports_2.ige.network;
        network.send(exports_4.IGE_NETWORK_CHAT_JOIN_ROOM, roomId);
    }
    sendToRoom(roomId, message, to) {
        const network = exports_2.ige.network;
        if (roomId !== undefined && message !== undefined) {
            const msg = {
                roomId: roomId,
                text: message,
                to: to
            };
            network.send(exports_4.IGE_NETWORK_CHAT_MSG, msg);
        }
    }
    _onMessageFromServer(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("messageFromServer", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log('Server sent us a message in the room "' + data.roomId + '" from the user id "' + data.from + '":', data.text);
        }
    }
    _onJoinedRoom(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("joinedRoom", data) !== exports_3.IgeEventReturnFlag.cancel) {
            if (data.joined) {
                console.log("Server says we have joined room:", data.roomId);
            }
            else {
                console.log("Server says we failed to join room:", data.roomId);
            }
        }
    }
    _onLeftRoom(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("leftRoom", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log("We have left room:", data);
        }
    }
    _onServerSentRoomList(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("roomList", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log("Server sent room list:", data);
        }
    }
    _onServerSentRoomUserList(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("roomUserList", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log("Server sent room user list:", data);
        }
    }
    _onRoomCreated(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("roomCreated", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log("Server told us room was created:", data);
        }
    }
    _onRoomRemoved(data) {
        // Emit the event and if it wasn't cancelled (by returning true) then
        // process this ourselves
        if (this.emit("roomRemoved", data) !== exports_3.IgeEventReturnFlag.cancel) {
            console.log("Server told us room was removed:", data);
        }
    }
}
exports.IgeChatClient = IgeChatClient;
