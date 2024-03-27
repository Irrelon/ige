import { IgeNetIoBaseController } from "../IgeNetIoBaseController.js"
import { IgeNetIoServer } from "./IgeNetIoServer.js";
import type { IgeNetIoSocket } from "./IgeNetIoSocket.js"
import type { IgeIsReadyPromise } from "../../../types/IgeIsReadyPromise.js";
import type { IgeNetworkMessageData, IgeNetworkMessageStructure, IgeNetworkRequestMessageStructure, IgeNetworkServerSideMessageHandler, IgeNetworkServerSideRequestHandler, IgeNetworkServerSideResponseData } from "../../../types/IgeNetworkMessage.js"
export declare class IgeNetIoServerController extends IgeNetIoBaseController implements IgeIsReadyPromise {
    _idCounter: number;
    _networkCommands: Record<string, IgeNetworkServerSideMessageHandler | IgeNetworkServerSideRequestHandler | undefined>;
    _requests: Record<string, IgeNetworkRequestMessageStructure<IgeNetworkServerSideRequestHandler>>;
    _socketById: Record<string, IgeNetIoSocket>;
    _port: number;
    _acceptConnections: boolean;
    _io?: IgeNetIoServer;
    _streamTimer?: number;
    _streamInterval: number;
    _queuedData: Record<string, [string, string[]]>;
    _streamClientData: Record<string, Record<string, string>>;
    _streamClientCreated: Record<string, Record<string, boolean>>;
    _streamPropertyChange: Record<string, Record<string, boolean>>;
    constructor();
    isReady(): Promise<void>;
    /**
     * Starts the network for the server.
     * @param {*} port The port to listen on.
     * @param {Function=} callback A callback method to call once the
     * network has started.
     */
    start(port?: number, callback?: () => void): Promise<void>;
    _onJoinRoom: (data: [string, boolean], clientId: string) => void;
    _onLeaveRoom: (data: string, clientId: string) => void;
    /**
     * Called on receipt of a request message from a client.
     * @param data The data the client sent with the request.
     * @param clientId The id of the client that sent the request.
     */
    _onRequest: (data: IgeNetworkRequestMessageStructure<IgeNetworkServerSideMessageHandler>, clientId: string) => void;
    _onResponse: (data: IgeNetworkMessageStructure, clientId?: string) => void;
    _onTimeSync: (data: IgeNetworkMessageData, clientId?: string) => void;
    timeSyncStart(): this;
    timeSyncStop(): this;
    /**
     * Sets a network command and optional callback. When a network command
     * is received by the server, the callback set up for that command will
     * automatically be called and passed the data from the incoming network
     * packet.
     * @param {string} commandName The name of the command to define.
     * @param {Function=} callback A function to call when the defined network
     * command is received by the network.
     * @return {*}
     */
    define(commandName: string, callback?: IgeNetworkServerSideMessageHandler | IgeNetworkServerSideRequestHandler): this;
    /**
     * Adds a client to a room by id. All clients are added to room id
     * "ige" by default when they connect to the server.
     * @param {string} clientId The id of the client to add to the room.
     * @param {string} roomId The id of the room to add the client to.
     * @returns {*}
     */
    clientJoinRoom(clientId: string, roomId: string): this;
    /**
     * Removes a client from a room by id. All clients are added to room id
     * "ige" by default when they connect to the server and you can remove
     * them from it if your game defines custom rooms etc.
     * @param {string} clientId The id of the client to remove from the room.
     * @param {string} roomId The id of the room to remove the client from.
     * @returns {*}
     */
    clientLeaveRoom(clientId: string, roomId: string): this;
    /**
     * Removes a client from all rooms that it is a member of.
     * @param {string} clientId The client id to remove from all rooms.
     * @returns {*}
     */
    clientLeaveAllRooms(clientId: string): this;
    /**
     * Gets the array of room ids that the client has joined.
     * @param clientId
     * @returns {Array} An array of string ids for each room the client has joined.
     */
    clientRooms(clientId: string): string[];
    /**
     * Returns an associative array of all connected clients
     * by their ID.
     * @param {string=} roomId Optional, if provided will only return clients
     * that have joined room specified by the passed roomId.
     * @return
     */
    clients(roomId?: string): Record<string, IgeNetIoSocket>;
    /**
     * Returns the socket associated with the specified client id.
     * @param {string=} clientId
     * @return {*}
     */
    socket(clientId: string): IgeNetIoSocket;
    /**
     * Gets / sets the current flag that determines if client connections
     * should be allowed to connect (true) or dropped instantly (false).
     * @param {boolean} val Set to true to allow connections or false
     * to drop any incoming connections.
     * @return {*}
     */
    acceptConnections(val?: boolean): boolean | this;
    /**
     * Sends a message over the network.
     * @param {string} commandName
     * @param {Object} data
     * @param {*=} clientIdOrArrayOfIds If specified, sets the recipient socket id or
     * an array of socket ids to send to.
     * @param callback
     */
    send<DataType = IgeNetworkMessageData>(commandName: string, data: DataType, clientIdOrArrayOfIds?: string | string[], callback?: IgeNetworkServerSideMessageHandler | IgeNetworkServerSideRequestHandler): this | undefined;
    /**
     * Sends a network request. This is different from a standard
     * call to send() because the recipient code will be able to
     * respond by calling ige.network.response(). When the response
     * is received, the callback method that was passed in the
     * callback parameter will be fired with the response data.
     * @param {string} commandName
     * @param {Object} data
     * @param clientIdOrArrayOfIds
     * @param {Function} callback
     */
    request<DataType extends IgeNetworkMessageData = IgeNetworkMessageData>(cmd: string, data: DataType, clientIdOrArrayOfIds: string | string[], callback: IgeNetworkServerSideRequestHandler): void;
    /**
     * Sends a response to a network request.
     * @param {string} requestId
     * @param {Object} data
     */
    response(requestId: string, data: IgeNetworkServerSideResponseData): void;
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {boolean}
     * @private
     */
    _originIsAllowed(origin: string): boolean;
    /**
     * Called when the server receives a client connection request. Sets
     * up event listeners on the socket and sends the client the initial
     * networking data required to allow network commands to operate
     * correctly over the connection.
     * @param {Object} socket The client socket object.
     * @private
     */
    _onClientConnect: (socket: IgeNetIoSocket) => void;
    _sendTimeSync(clientId?: string): void;
    /**
     * Called when the server receives a network message from a client.
     * @param {Object} data The data sent by the client.
     * @param {string} clientId The client socket id.
     * @private
     */
    _onClientMessage(data: IgeNetworkMessageData, clientId: string): void;
    /**
     * Called when a client disconnects from the server.
     * @param {Object} data Any data sent along with the disconnect.
     * @param {Object} socket The client socket object.
     * @private
     */
    _onClientDisconnect(data: IgeNetworkMessageData, socket: IgeNetIoSocket): void;
    /**
     * Gets / sets the interval by which updates to the game world are packaged
     * and transmitted to connected clients. The greater the value, the less
     * updates are sent per second.
     * @param {number=} ms The number of milliseconds between stream messages.
     */
    sendInterval(ms?: number): number | this;
    /**
     * Stops the stream of world updates to connected clients.
     */
    stop(): this;
    /**
     * Queues stream data to be sent during the next stream data interval.
     * @param {string} entityId The id of the entity that this data belongs to.
     * @param {string} data The data queued for delivery to the client.
     * @param {string} clientId The client id this data is queued for.
     * @return {*}
     */
    queue(entityId: string, data: string, clientId: string[]): this;
    /**
     * Asks the server to send the data packets for all the queued stream
     * data to the specified clients.
     * @private
     */
    _sendQueue: () => void;
}
