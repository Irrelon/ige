import { IgeChatComponent, IgeChatRoomOptions } from "./IgeChatComponent";
import { IgeNetworkChatFromClientMessageStructure } from "../../../types/IgeNetworkMessage";
import IgeEntity from "../../core/IgeEntity";
import { IgeNetworkChatFromClientJoinRoomRequestStructure, IgeNetworkChatFromClientLeaveRoomRequestStructure } from "../../../types/IgeNetworkChat";
/**
 * The server-side chat component. Handles all server-side
 * chat methods and events.
 */
export declare class IgeChatServer extends IgeChatComponent {
    constructor(entity: IgeEntity, options?: any);
    /**
     * Creates a new room with the specified room name and options.
     * @param roomName The display name of the room.
     * @param {String=} roomId If specified, becomes the new room's ID.
     * @param options An object containing options key/values.
     * @return {String} The new room's ID.
     */
    createRoom(roomName: string, roomId?: string, options?: IgeChatRoomOptions): string | undefined;
    /**
     * Removes an existing room with the specified id.
     * @param roomId
     * @return {Boolean}
     */
    removeRoom(roomId: string): boolean;
    /**
     * Sends a message to a room.
     * @param {String} roomId The ID of the room to send the message to.
     * @param {String} message The text body of the message to send.
     * @param {String=} to The id of the user to send the message to.
     * @param {String} from The id of the user that sent the message.
     */
    sendToRoom(roomId: string, message: string, to: string, from: string): void;
    _onMessageFromClient(msg: IgeNetworkChatFromClientMessageStructure, clientId: string): void;
    _onJoinRoomRequestFromClient(roomId: IgeNetworkChatFromClientJoinRoomRequestStructure, clientId: string): void;
    _onLeaveRoomRequestFromClient(roomId: IgeNetworkChatFromClientLeaveRoomRequestStructure, clientId: string): void;
    _onClientWantsRoomList(data: any, clientId: string): void;
    _onClientWantsRoomUserList(roomId: string, clientId: string): void;
}
