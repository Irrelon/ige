import { ige } from "@/engine/instance";
import type { IgeChatRoomOptions } from "@/engine/network/chat/IgeChatComponent";
import { IgeChatComponent } from "@/engine/network/chat/IgeChatComponent";
import type { IgeNetIoServerController } from "@/engine/network/server/IgeNetIoServerController";
import { newIdHex } from "@/engine/utils/ids";
import {
	IGE_NETWORK_CHAT_JOIN_ROOM,
	IGE_NETWORK_CHAT_LEAVE_ROOM,
	IGE_NETWORK_CHAT_LIST_ROOMS,
	IGE_NETWORK_CHAT_MSG,
	IGE_NETWORK_CHAT_ROOM_CREATED,
	IGE_NETWORK_CHAT_ROOM_LIST_USERS,
	IGE_NETWORK_CHAT_ROOM_REMOVED,
	IgeEventReturnFlag
} from "@/enums";
import type {
	IgeNetworkChatFromClientJoinRoomRequestStructure, IgeNetworkChatFromClientLeaveRoomRequestStructure,
	IgeNetworkChatFromClientMessageStructure, IgeNetworkChatFromServerJoinRoomResponseStructure,
	IgeNetworkChatFromServerMessageStructure,
	IgeNetworkChatRoomCreatedMessageStructure,
	IgeNetworkChatRoomRemovedMessageStructure
} from "@/types/IgeNetworkChat";

/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
export class IgeChatServer extends IgeChatComponent {
	constructor () {
		super();

		ige.dependencies.waitFor(["network"], () => {
			// Define the chat system network command listeners
			const network = ige.network as IgeNetIoServerController;

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
	 * @param {string=} roomId If specified, becomes the new room's ID.
	 * @param options An object containing options key/values.
	 * @return {string} The new room's ID.
	 */
	createRoom (roomName: string, roomId?: string, options?: IgeChatRoomOptions) {
		const network = ige.network as IgeNetIoServerController;
		const newRoomId = roomId || newIdHex();

		this._rooms[newRoomId] = {
			id: newRoomId,
			name: roomName,
			users: [],
			options
		};

		// Inform all users that the room was created
		network.send<IgeNetworkChatRoomCreatedMessageStructure>(IGE_NETWORK_CHAT_ROOM_CREATED, newRoomId);

		return roomId;
	}

	/**
	 * Removes an existing room with the specified id.
	 * @param roomId
	 * @return {boolean}
	 */
	removeRoom (roomId: string) {
		const network = ige.network as IgeNetIoServerController;

		if (this._rooms[roomId]) {
			// Inform all users that the room was removed
			network.send<IgeNetworkChatRoomRemovedMessageStructure>(IGE_NETWORK_CHAT_ROOM_REMOVED, roomId);

			delete this._rooms[roomId];
			return true;
		} else {
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
	sendToRoom (roomId: string, message: string, to: string, from: string) {
		const network = ige.network as IgeNetIoServerController;

		if (this._rooms[roomId]) {
			const room = this._rooms[roomId];

			if (message !== undefined) {
				const msg: IgeNetworkChatFromServerMessageStructure = {
					roomId: roomId,
					text: message,
					from: from,
					to: to
				};

				if (to) {
					// Send message to individual user
					if (room.users.indexOf(to) > -1) {
						network.send<IgeNetworkChatFromServerMessageStructure>(IGE_NETWORK_CHAT_MSG, msg, to);
					} else {
						this.log("Cannot send to user because specified user is not in room: " + to);
					}
				} else {
					// Send this message to all users in the room
					this.log("Sending to all users...");
					network.send<IgeNetworkChatFromServerMessageStructure>(IGE_NETWORK_CHAT_MSG, msg, room.users);
				}
			} else {
				this.log("Cannot send message to room with blank message!");
			}
		} else {
			this.log("Cannot send message to room with id \"" + roomId + "\" because it does not exist!");
		}
	}

	_onMessageFromClient (msg: IgeNetworkChatFromClientMessageStructure, clientId: string) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (this.emit("messageFromClient", msg, clientId) !== IgeEventReturnFlag.cancel) {
			console.log("Message from client: (" + clientId + ")", msg);

			if (msg.roomId) {
				const room = this._rooms[msg.roomId];

				if (room) {
					if (room.users.indexOf(clientId) > -1) {
						if (msg.text) {
							console.log("Sending message to room...");
							this.sendToRoom(msg.roomId, msg.text, msg.to, clientId);
						} else {
							console.log("Cannot send message because message text is empty!", msg);
						}
					} else {
						// The user is not in the room specified
						console.log("User tried to send message to room they are not joined in!", msg);
					}
				} else {
					// Room id specified does not exist
					console.log("User tried to send message to room that doesn't exist!", msg);
				}
			} else {
				// No room id in the message
				console.log("User tried to send message to room but didn't specify room id!", msg);
			}
		}
	}

	_onJoinRoomRequestFromClient (roomId: IgeNetworkChatFromClientJoinRoomRequestStructure, clientId: string) {
		const network = ige.network as IgeNetIoServerController;

		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (this.emit("clientJoinRoomRequest", roomId, clientId) !== IgeEventReturnFlag.cancel) {
			const room = this._rooms[roomId];

			this.log("Client wants to join room: (" + clientId + ")", roomId);

			// Check the room exists
			if (room) {
				// Check that the user isn't already part of the room user list
				if (room.users.indexOf(clientId) === -1) {
					// Add the user to the room
					room.users.push(clientId);
					network.send<IgeNetworkChatFromServerJoinRoomResponseStructure>(
						IGE_NETWORK_CHAT_JOIN_ROOM,
						{ roomId: roomId, joined: true },
						clientId
					);
					console.log("User \"" + clientId + "\" joined room " + roomId);
				} else {
					// User is already in the room!
				}
			} else {
				// Room does not exist!
			}
		}
	}

	_onLeaveRoomRequestFromClient (roomId: IgeNetworkChatFromClientLeaveRoomRequestStructure, clientId: string) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (this.emit("clientLeaveRoomRequest", roomId, clientId) !== IgeEventReturnFlag.cancel) {
			console.log("Client wants to leave room: (" + clientId + ")", roomId);
		}
	}

	_onClientWantsRoomList (data: any, clientId: string) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (this.emit("clientRoomListRequest", data, clientId) !== IgeEventReturnFlag.cancel) {
			console.log("Client wants the room list: (" + clientId + ")", data);
		}
	}

	_onClientWantsRoomUserList (roomId: string, clientId: string) {
		// Emit the event and if it wasn't cancelled (by returning true) then
		// process this ourselves
		if (this.emit("clientRoomUserListRequest", roomId, clientId) !== IgeEventReturnFlag.cancel) {
			console.log("Client wants the room user list: (" + clientId + ")", roomId);
		}
	}
}
