import { IgeNetIoClient } from "./IgeNetIoClient.js"
import { IgeNetIoBaseController } from "../IgeNetIoBaseController.js"
import type { IgeNetworkMessageStructure, IgeNetworkRequestMessageStructure, IgeNetworkMessageData, IgeNetworkEncodedMessageData, IgeNetworkTimeSyncResponseFromClient, IgeNetworkTimeSyncRequestFromServer, IgeNetworkClientSideMessageHandler, IgeNetworkClientSideResponseHandler } from "../../../types/IgeNetworkMessage.js"
import type { IgeStreamCreateMessageData, IgeStreamDestroyMessageData } from "../../../types/IgeNetworkStream.js"
/**
 * The client-side net.io component. Handles all client-side
 * networking systems.
 */
export declare class IgeNetIoClientController extends IgeNetIoBaseController {
    version: string;
    _networkCommands: Record<string, IgeNetworkClientSideMessageHandler>;
    _initDone: boolean;
    _idCounter: number;
    _requests: Record<string, IgeNetworkRequestMessageStructure<IgeNetworkClientSideResponseHandler>>;
    _state: number;
    _io?: IgeNetIoClient;
    _id?: string;
    _url?: string;
    _renderLatency: number;
    _streamDataTime: number;
    constructor();
    /**
     * Gets the current socket id.
     * @returns {string} The id of the socket connection to the server.
     */
    id(): string;
    /**
     * Starts the network for the client.
     * @param {*} url The game server URL.
     * @param {Function=} callback A callback method to call once the
     * network has started.
     */
    start(url?: string, callback?: () => void): Promise<void>;
    _onRequest: (data: IgeNetworkRequestMessageStructure<IgeNetworkClientSideMessageHandler>) => void;
    _onResponse: (responseObj: IgeNetworkMessageStructure) => void;
    _onTimeSync: (data: IgeNetworkTimeSyncRequestFromServer) => void;
    stop(): void;
    /**
     * Gets / sets a network command and callback. When a network command
     * is received by the client, the callback set up for that command will
     * automatically be called and passed the data from the incoming network
     * packet.
     * @param {string} commandName The name of the command to define.
     * @param {Function} callback A function to call when the defined network
     * command is received by the network.
     * @return {*}
     */
    define(commandName: string, callback: (...args: any[]) => void): this | undefined;
    /**
     * Sends a network message with the given command name
     * and data.
     * @param commandName
     * @param data
     * @param callback
     */
    send<DataType = IgeNetworkMessageData>(commandName: string, data?: DataType, callback?: IgeNetworkClientSideResponseHandler): void;
    /**
     * Sends a network request. This is different from a standard
     * call to send() because the recipient code will be able to
     * respond by calling ige.network.response(). When the response
     * is received, the callback method that was passed in the
     * callback parameter will be fired with the response data.
     * @param {string} commandName
     * @param {Object} data
     * @param {Function=} callback
     */
    request<ResultType = any>(commandName: string, data: IgeNetworkMessageData, callback?: IgeNetworkClientSideMessageHandler): Promise<ResultType>;
    /**
     * Sends a response to a network request.
     * @param {string} requestId
     * @param {Object} data
     */
    response(requestId: string, data: IgeNetworkMessageData): void;
    /**
     * Called when the network connects to the server.
     * @private
     */
    _onConnectToServer(): void;
    /**
     * Called when data from the server is received on the client.
     * @param data
     * @private
     */
    _onMessageFromServer(data: IgeNetworkEncodedMessageData): void;
    /**
     * Called when the client is disconnected from the server.
     * @param data
     * @private
     */
    _onDisconnectFromServer(data: string): void;
    /**
     * Called when the client has an error with the connection.
     * @param {Object} data
     * @private
     */
    _onError: (data: any) => void;
    _sendTimeSync(data: IgeNetworkTimeSyncResponseFromClient): void;
    /**
     * Gets /Sets the amount of milliseconds in the past that the renderer will
     * show updates from the stream. This allows us to interpolate from a previous
     * position to the next position in the stream update. Updates come in and
     * are already in the past when they are received so we need to set this
     * latency value to something greater than the highest level of acceptable
     * network latency. Usually this is a value between 100 and 200ms. If your
     * game requires much tighter latency you will have to reduce the number of
     * players / network updates / data size in order to compensate. A value of
     * 100 in this call is the standard that most triple-A FPS games accept as
     * normal render latency and should be OK for your game.
     *
     * @param latency
     */
    renderLatency(latency?: number): number | this;
    /**
     * Handles receiving the start time of the stream data.
     * @param data
     * @private
     */
    _onStreamTime: (data: number) => void;
    _onStreamCreate: (data: IgeStreamCreateMessageData) => void;
    _onStreamDestroy: (data: IgeStreamDestroyMessageData) => void;
    /**
     * Called when the client receives data from the stream system.
     * Handles decoding the data and calling the relevant entity
     * _onStreamData() methods.
     * @param data
     * @private
     */
    _onStreamData: (data: string) => void;
}
