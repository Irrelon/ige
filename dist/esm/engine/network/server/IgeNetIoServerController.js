import { ige } from "../../instance.js"
import { IgeNetIoBaseController } from "../IgeNetIoBaseController.js"
import { IgeNetIoServer } from "./IgeNetIoServer.js";
import { arrPull } from "../../utils/arrays.js"
import { newIdHex } from "../../utils/ids.js"
import { IGE_NETWORK_JOIN_ROOM, IGE_NETWORK_LEAVE_ROOM, IGE_NETWORK_REQUEST, IGE_NETWORK_RESPONSE, IGE_NETWORK_STREAM_CREATE, IGE_NETWORK_STREAM_DATA, IGE_NETWORK_STREAM_DESTROY, IGE_NETWORK_STREAM_TIME, IGE_NETWORK_TIME_SYNC, IgeEventReturnFlag } from "../../../enums/index.js";
export class IgeNetIoServerController extends IgeNetIoBaseController {
    _idCounter = 0;
    _networkCommands = {}; // Maps a command name to a command handler function
    _requests = {};
    _socketById = {};
    _port = 8000;
    _acceptConnections = false;
    _io;
    _streamTimer; // The timer / interval handle
    _streamInterval = 50;
    _queuedData = {}; // Define the object that will hold the stream data queue
    _streamClientData = {}; // Set some stream data containers
    _streamClientCreated = {}; // Set some stream data containers
    _streamPropertyChange = {}; // Keep track of changes that need to be sent to clients
    constructor() {
        super();
        // Define the network stream commands
        this.define(IGE_NETWORK_STREAM_CREATE);
        this.define(IGE_NETWORK_STREAM_DESTROY);
        this.define(IGE_NETWORK_STREAM_DATA);
        this.define(IGE_NETWORK_STREAM_TIME);
    }
    isReady() {
        return Promise.resolve();
    }
    /**
     * Starts the network for the server.
     * @param {*} port The port to listen on.
     * @param {Function=} callback A callback method to call once the
     * network has started.
     */
    start(port, callback) {
        return new Promise((resolve) => {
            this._socketById = {};
            this._socketsByRoomId = {};
            if (typeof port !== "undefined") {
                this._port = port;
            }
            // Start net.io
            this.log("Starting net.io listener on port " + this._port);
            this._io = new IgeNetIoServer(this._port, () => {
                if (callback) {
                    callback();
                }
                resolve();
            });
            // Setup listeners
            this._io.on("connection", this._onClientConnect);
            // Set up default commands
            this.define(IGE_NETWORK_REQUEST, this._onRequest);
            this.define(IGE_NETWORK_RESPONSE, this._onResponse);
            this.define(IGE_NETWORK_TIME_SYNC, this._onTimeSync);
            this.define(IGE_NETWORK_JOIN_ROOM, this._onJoinRoom);
            this.define(IGE_NETWORK_LEAVE_ROOM, this._onLeaveRoom);
            // Start network sync
            this.timeSyncStart();
            this.log("Starting delta stream...");
            this._streamTimer = setInterval(this._sendQueue, this._streamInterval);
        });
    }
    _onJoinRoom = (data, clientId) => {
        if (data[1]) {
            // Remove client from all rooms first
            this.clientLeaveAllRooms(clientId);
        }
        this.clientJoinRoom(clientId, data[0]);
        console.log("Client requested to join room with data", data);
    };
    _onLeaveRoom = (data, clientId) => {
        if (data) {
            this.clientLeaveRoom(clientId, data[0]);
        }
        else {
            this.clientLeaveAllRooms(clientId);
        }
        console.log("Client requested to leave room with data", data);
    };
    /**
     * Called on receipt of a request message from a client.
     * @param data The data the client sent with the request.
     * @param clientId The id of the client that sent the request.
     */
    _onRequest = (data, clientId) => {
        if (!clientId)
            return;
        const responseCallback = (...args) => {
            this.response(data.id, args);
        };
        // The message is a network request so fire
        // the command event with the request id and
        // the request data
        data.clientId = clientId;
        this._requests[data.id] = data;
        if (this.debug()) {
            this.log("onRequest", data);
            this.log("emitting", data.cmd, [data.id, data.data]);
            this._debugCounter++;
        }
        const commandHandler = this._networkCommands[data.cmd];
        if (commandHandler) {
            commandHandler(data.data, clientId, responseCallback);
        }
        this.emit(data.cmd, data.data, clientId, responseCallback);
    };
    _onResponse = (data, clientId) => {
        if (!clientId)
            return;
        // The message is a network response
        // to a request we sent earlier
        const id = data.id;
        // Get the original request object from
        // the request id
        const req = this._requests[id];
        if (this.debug()) {
            console.log("onResponse", data);
            this._debugCounter++;
        }
        if (req) {
            // Fire the request callback!
            req.callback(data.data.err, clientId, data.data.data);
            // Delete the request from memory
            delete this._requests[id];
        }
    };
    _onTimeSync = (data, clientId) => {
        if (!clientId)
            return;
        const localTime = Math.floor(ige.engine._currentTime);
        const sendTime = parseInt(data[1], 10);
        //const roundTrip = (localTime - parseInt(data[0], 10));
        /*if (localTime < sendTime) {
            direction = 'behind';
        } else if (localTime > sendTime) {
            direction = 'in front of';
        } else {
            direction = 'same as';
        }

        this.log('Time sync, server clock ' + (localTime - sendTime) + 'ms ' + direction + ' client, roundtrip: ' + roundTrip + 'ms, send timestamp: ' + parseInt(data[0], 10) + ', local timestamp: ' + localTime);*/
        this._timeSyncLog[clientId] = localTime - sendTime;
    };
    timeSyncStart() {
        this._timeSyncStarted = true;
        // Send a time sync request now, so we
        // have a starting value to work with
        this._sendTimeSync();
        this.log("Starting client/server clock sync...");
        this._timeSyncTimer = setInterval(() => {
            this._sendTimeSync();
        }, this._timeSyncInterval);
        return this;
    }
    timeSyncStop() {
        this.log("Stopping client/server clock sync...");
        clearInterval(this._timeSyncTimer);
        this._timeSyncStarted = false;
        return this;
    }
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
    define(commandName, callback) {
        this._networkCommands[commandName] = callback;
        // Record reverse lookups
        const index = this._networkCommandsIndex.length;
        this._networkCommandsIndex[index] = commandName;
        this._networkCommandsLookup[commandName] = index;
        return this;
    }
    /**
     * Adds a client to a room by id. All clients are added to room id
     * "ige" by default when they connect to the server.
     * @param {string} clientId The id of the client to add to the room.
     * @param {string} roomId The id of the room to add the client to.
     * @returns {*}
     */
    clientJoinRoom(clientId, roomId) {
        this._clientRooms[clientId] = this._clientRooms[clientId] || [];
        this._clientRooms[clientId].push(roomId);
        this._socketsByRoomId[roomId] = this._socketsByRoomId[roomId] || {};
        this._socketsByRoomId[roomId][clientId] = this._socketById[clientId];
        if (this.debug()) {
            this.log("Client " + clientId + " joined room " + roomId);
        }
        return this;
    }
    /**
     * Removes a client from a room by id. All clients are added to room id
     * "ige" by default when they connect to the server and you can remove
     * them from it if your game defines custom rooms etc.
     * @param {string} clientId The id of the client to remove from the room.
     * @param {string} roomId The id of the room to remove the client from.
     * @returns {*}
     */
    clientLeaveRoom(clientId, roomId) {
        if (this._clientRooms[clientId]) {
            arrPull(this._clientRooms[clientId], roomId);
            delete this._socketsByRoomId[roomId][clientId];
        }
        return this;
    }
    /**
     * Removes a client from all rooms that it is a member of.
     * @param {string} clientId The client id to remove from all rooms.
     * @returns {*}
     */
    clientLeaveAllRooms(clientId) {
        const arr = this._clientRooms[clientId];
        let arrCount = arr.length;
        while (arrCount--) {
            this.clientLeaveRoom(clientId, arr[arrCount]);
        }
        delete this._clientRooms[clientId];
        return this;
    }
    /**
     * Gets the array of room ids that the client has joined.
     * @param clientId
     * @returns {Array} An array of string ids for each room the client has joined.
     */
    clientRooms(clientId) {
        return this._clientRooms[clientId] || [];
    }
    /**
     * Returns an associative array of all connected clients
     * by their ID.
     * @param {string=} roomId Optional, if provided will only return clients
     * that have joined room specified by the passed roomId.
     * @return
     */
    clients(roomId) {
        if (!roomId)
            return this._socketById;
        return this._socketsByRoomId[roomId] || {};
    }
    /**
     * Returns the socket associated with the specified client id.
     * @param {string=} clientId
     * @return {*}
     */
    socket(clientId) {
        return this._socketById[clientId];
    }
    /**
     * Gets / sets the current flag that determines if client connections
     * should be allowed to connect (true) or dropped instantly (false).
     * @param {boolean} val Set to true to allow connections or false
     * to drop any incoming connections.
     * @return {*}
     */
    acceptConnections(val) {
        if (typeof val === "undefined") {
            return this._acceptConnections;
        }
        this._acceptConnections = val;
        if (val) {
            this.log("Server now accepting connections!");
        }
        else {
            this.log("Server no longer accepting connections!");
        }
        return this;
    }
    /**
     * Sends a message over the network.
     * @param {string} commandName
     * @param {Object} data
     * @param {*=} clientIdOrArrayOfIds If specified, sets the recipient socket id or
     * an array of socket ids to send to.
     * @param callback
     */
    send(commandName, data, clientIdOrArrayOfIds, callback) {
        if (callback) {
            if (!clientIdOrArrayOfIds) {
                this.log("Attempted to send a request command without specifying the recipient clientId!", "error");
                return;
            }
            this.request(commandName, data, clientIdOrArrayOfIds, callback);
            return;
        }
        const commandIndex = this._networkCommandsLookup[commandName];
        if (commandIndex !== undefined) {
            const encodedCommandIndex = String.fromCharCode(commandIndex);
            this._io?.send([encodedCommandIndex, data], clientIdOrArrayOfIds);
            return this;
        }
        this.log(`Cannot send network packet with command "${commandName}" because the command has not been defined!`, "error");
        return this;
    }
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
    request(cmd, data, clientIdOrArrayOfIds, callback) {
        // Build the request object
        const req = {
            id: newIdHex(),
            cmd,
            data,
            callback,
            timestamp: new Date().getTime()
        };
        // Store the request object
        this._requests[req.id] = req;
        // Send the network request packet
        this.send(IGE_NETWORK_REQUEST, {
            id: req.id,
            cmd,
            data: req.data
        }, clientIdOrArrayOfIds);
    }
    /**
     * Sends a response to a network request.
     * @param {string} requestId
     * @param {Object} data
     */
    response(requestId, data) {
        // Grab the original request object
        const req = this._requests[requestId];
        if (!req) {
            return;
        }
        this.send(IGE_NETWORK_RESPONSE, {
            id: requestId,
            cmd: req.cmd,
            data
        }, req.clientId);
        delete this._requests[requestId];
    }
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {boolean}
     * @private
     */
    _originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }
    /**
     * Called when the server receives a client connection request. Sets
     * up event listeners on the socket and sends the client the initial
     * networking data required to allow network commands to operate
     * correctly over the connection.
     * @param {Object} socket The client socket object.
     * @private
     */
    _onClientConnect = (socket) => {
        if (!this._acceptConnections) {
            this.log(`Rejecting connection with id "${socket._id}": We are not accepting connections at the moment!`);
            socket.close();
            return;
        }
        // Check if any listener cancels this
        if (this.emit("connect", socket) === IgeEventReturnFlag.cancel) {
            // Reject the connection
            socket.close();
            return;
        }
        this.log(`Accepted connection with id "${socket._id}"`);
        this._socketById[socket._id] = socket;
        // Store a rooms array for this client
        this._clientRooms[socket._id] = this._clientRooms[socket._id] || [];
        socket.on("message", (data) => {
            this._onClientMessage(data, socket._id);
        });
        socket.on("disconnect", (data) => {
            this._onClientDisconnect(data, socket);
        });
        // Send an init message to the client
        socket.send({
            cmd: "init",
            ncmds: this._networkCommandsLookup,
            ts: ige.engine._timeScale,
            ct: ige.engine._currentTime
        });
        // Send a clock sync command
        this._sendTimeSync(socket._id);
    };
    _sendTimeSync(clientId) {
        // Send the time sync command
        const data = [ige.engine._currentTime];
        this.send(IGE_NETWORK_TIME_SYNC, data, clientId);
    }
    /**
     * Called when the server receives a network message from a client.
     * @param {Object} data The data sent by the client.
     * @param {string} clientId The client socket id.
     * @private
     */
    _onClientMessage(data, clientId) {
        const ciDecoded = data[0].charCodeAt(0), commandName = this._networkCommandsIndex[ciDecoded];
        const commandHandler = this._networkCommands[commandName];
        if (commandHandler) {
            commandHandler(data[1], clientId);
        }
        this.emit(commandName, data[1], clientId);
    }
    /**
     * Called when a client disconnects from the server.
     * @param {Object} data Any data sent along with the disconnect.
     * @param {Object} socket The client socket object.
     * @private
     */
    _onClientDisconnect(data, socket) {
        this.log(`Client disconnected with id "${socket._id}"`);
        this.emit("disconnect", socket._id);
        // Remove them from all rooms
        this.clientLeaveAllRooms(socket._id);
        delete this._socketById[socket._id];
    }
    /**
     * Gets / sets the interval by which updates to the game world are packaged
     * and transmitted to connected clients. The greater the value, the less
     * updates are sent per second.
     * @param {number=} ms The number of milliseconds between stream messages.
     */
    sendInterval(ms) {
        if (ms !== undefined) {
            this.log("Setting delta stream interval to " + ms / ige.engine._timeScale + "ms");
            this._streamInterval = ms / ige.engine._timeScale;
            return this;
        }
        return this._streamInterval;
    }
    /**
     * Stops the stream of world updates to connected clients.
     */
    stop() {
        this.log("Stopping delta stream...");
        clearInterval(this._streamTimer);
        return this;
    }
    /**
     * Queues stream data to be sent during the next stream data interval.
     * @param {string} entityId The id of the entity that this data belongs to.
     * @param {string} data The data queued for delivery to the client.
     * @param {string} clientId The client id this data is queued for.
     * @return {*}
     */
    queue(entityId, data, clientId) {
        this._queuedData[entityId] = [data, clientId];
        return this;
    }
    /**
     * Asks the server to send the data packets for all the queued stream
     * data to the specified clients.
     * @private
     */
    _sendQueue = () => {
        const st = new Date().getTime();
        const queueObj = this._queuedData;
        const network = ige.network;
        const currentTime = ige.engine._currentTime;
        const hasSentTimeDataByClientId = {};
        // Send the stream data
        for (const entityId in queueObj) {
            const item = queueObj[entityId];
            item[1].forEach((clientId) => {
                // Check if we've already sent this client the starting
                // time of the stream data
                // TODO: Commented this because the receiving client never uses this data at all!
                if (!hasSentTimeDataByClientId[clientId]) {
                    // Send the stream start time
                    network.send(IGE_NETWORK_STREAM_TIME, currentTime, clientId);
                    hasSentTimeDataByClientId[clientId] = true;
                }
                network.send(IGE_NETWORK_STREAM_DATA, item[0], clientId);
                // Store the new data for later comparison
                this._streamClientData[entityId][clientId] = item[0];
            });
            delete queueObj[entityId];
            if (this._streamPropertyChange) {
                delete this._streamPropertyChange[entityId];
            }
            const ct = new Date().getTime();
            const dt = ct - st;
            if (dt > this._streamInterval) {
                console.log("WARNING, Stream send is taking too long: " + dt + "ms");
                break;
            }
        }
    };
}
