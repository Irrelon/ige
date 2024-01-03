import { IgeChatComponent } from "../../../export/exports.js"
import type { IgeNetworkChatFromServerJoinRoomResponseStructure, IgeNetworkChatFromServerLeaveRoomResponseStructure, IgeNetworkChatFromServerRoomStructure } from "../../../export/exports.js"
import type { IgeNetworkChatFromServerMessageStructure } from "../../../export/exports.js"
/**
 * The client-side chat component. Handles all client-side
 * chat methods and events.
 */
export declare class IgeChatClient extends IgeChatComponent {
    constructor();
    /**
     * Asks the serve to let us join the room specified.
     * @param {string} roomId The room id of the room to join.
     */
    joinRoom(roomId: string): void;
    sendToRoom(roomId: string, message: string, to: string): void;
    _onMessageFromServer(data: IgeNetworkChatFromServerMessageStructure): void;
    _onJoinedRoom(data: IgeNetworkChatFromServerJoinRoomResponseStructure): void;
    _onLeftRoom(data: IgeNetworkChatFromServerLeaveRoomResponseStructure): void;
    _onServerSentRoomList(data: IgeNetworkChatFromServerRoomStructure[]): void;
    _onServerSentRoomUserList(data: any): void;
    _onRoomCreated(data: IgeNetworkChatFromServerRoomStructure): void;
    _onRoomRemoved(data: string): void;
}
