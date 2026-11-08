import type { IgeChatRoomOptions } from "./IgeChatComponent.js"
import { IgeChatComponent } from "./IgeChatComponent.js"
import type { IgeNetworkChatFromClientJoinRoomRequestStructure, IgeNetworkChatFromClientLeaveRoomRequestStructure, IgeNetworkChatFromClientMessageStructure } from "../../../types/IgeNetworkChat.js"
/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
export declare class IgeChatServer extends IgeChatComponent {
    constructor();
    /**
     * Creates a new room with the specified room name and options.
     * @param roomName The display name of the room.
     * @param {string=} roomId If specified, becomes the new room's ID.
     * @param options An object containing options key/values.
     * @return {string} The new room's ID.
     */
    createRoom(roomName: string, roomId?: string, options?: IgeChatRoomOptions): string | undefined;
    /**
     * Removes an existing room with the specified id.
     * @param roomId
     * @return {boolean}
     */
    removeRoom(roomId: string): boolean;
    /**
     * Sends a message to a room.
     * @param {string} roomId The ID of the room to send the message to.
     * @param {string} message The text body of the message to send.
     * @param {string=} to The id of the user to send the message to.
     * @param {string} from The id of the user that sent the message.
     */
    sendToRoom(roomId: string, message: string, to: string, from: string): void;
    _onMessageFromClient(msg: IgeNetworkChatFromClientMessageStructure, clientId: string): void;
    _onJoinRoomRequestFromClient(roomId: IgeNetworkChatFromClientJoinRoomRequestStructure, clientId: string): void;
    _onLeaveRoomRequestFromClient(roomId: IgeNetworkChatFromClientLeaveRoomRequestStructure, clientId: string): void;
    _onClientWantsRoomList(data: any, clientId: string): void;
    _onClientWantsRoomUserList(roomId: string, clientId: string): void;
}
