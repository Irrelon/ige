import { ige } from "../../../instance.js";
import { IgeNetIoBaseComponent } from "./IgeNetIoBaseComponent.js";
import { arrPull, newIdHex } from "../../../services/utils.js";
import { NetIoServer } from "./server/socketServer.js";
import { isServer } from "../../../services/clientServer.js";
export class IgeNetIoServerComponent extends IgeNetIoBaseComponent {
    constructor() {
        super(...arguments);
        this._idCounter = 0;
        this._requests = {};
        this._socketById = {};
        this._port = 8000;
        this._acceptConnections = false;
        /**
         * Called on receipt of a request message from a client.
         * @param data The data the client sent with the request.
         * @param clientId The id of the client that sent the request.
         */
        this._onRequest = (data, clientId) => {
            if (!clientId)
                return;
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
            if (this._networkCommands[data.cmd]) {
                this._networkCommands[data.cmd](data.data, clientId, data.id);
            }
            this.emit(data.cmd, [data.id, data.data, clientId]);
        };
        this._onResponse = (data, clientId) => {
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
                req.callback(req.cmd, [data.data, clientId]);
                // Delete the request from memory
                delete this._requests[id];
            }
        };
        this._onTimeSync = (data, clientId) => {
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
        /**
         * Called when the server receives a client connection request. Sets
         * up event listeners on the socket and sends the client the initial
         * networking data required to allow network commands to operate
         * correctly over the connection.
         * @param {Object} socket The client socket object.
         * @private
         */
        this._onClientConnect = (socket) => {
            if (!this._acceptConnections) {
                this.log(`Rejecting connection with id ${socket._id} - we are not accepting connections at the moment!`);
                socket.close();
                return;
            }
            // Check if any listener cancels this
            if (!this.emit("connect", socket)) {
                this.log("Accepted connection with id " + socket._id);
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
            }
            else {
                // Reject the connection
                socket.close();
            }
        };
    }
    /**
     * Starts the network for the server.
     * @param {*} port The port to listen on.
     * @param {Function=} callback A callback method to call once the
     * network has started.
     */
    start(port, callback) {
        this._socketById = {};
        this._socketsByRoomId = {};
        if (typeof (port) !== "undefined") {
            this._port = port;
        }
        // Start net.io
        this.log("Starting net.io listener on port " + this._port);
        this._io = new NetIoServer(this._port, callback);
        // Setup listeners
        this._io.on("connection", this._onClientConnect);
        // Set up default commands
        this.define("_igeRequest", this._onRequest);
        this.define("_igeResponse", this._onResponse);
        this.define("_igeNetTimeSync", this._onTimeSync);
        // Start network sync
        this.timeSyncStart();
        return this;
    }
    timeSyncStart() {
        if (!isServer) {
            return this;
        }
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
     * @param {String} commandName The name of the command to define.
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
     * @param {String} clientId The id of the client to add to the room.
     * @param {String} roomId The id of the room to add the client to.
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
     * @param {String} clientId The id of the client to remove from the room.
     * @param {String} roomId The id of the room to remove the client from.
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
     * @param {String} clientId The client id to remove from all rooms.
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
     * @param {String=} roomId Optional, if provided will only return clients
     * that have joined room specified by the passed roomId.
     * @return {Array}
     */
    clients(roomId) {
        return this._socketsByRoomId[roomId];
    }
    /**
     * Returns the socket associated with the specified client id.
     * @param {String=} clientId
     * @return {*}
     */
    socket(clientId) {
        return this._socketById[clientId];
    }
    /**
     * Gets / sets the current flag that determines if client connections
     * should be allowed to connect (true) or dropped instantly (false).
     * @param {Boolean} val Set to true to allow connections or false
     * to drop any incoming connections.
     * @return {*}
     */
    acceptConnections(val) {
        if (typeof (val) === "undefined") {
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
     * @param {String} commandName
     * @param {Object} data
     * @param {*=} clientId If specified, sets the recipient socket id or
     * an array of socket ids to send to.
     */
    send(commandName, data, clientId, callback) {
        var _a;
        if (callback) {
            this.request(commandName, data, clientId, callback);
            return;
        }
        const commandIndex = this._networkCommandsLookup[commandName];
        if (commandIndex !== undefined) {
            const encodedCommandIndex = String.fromCharCode(commandIndex);
            (_a = this._io) === null || _a === void 0 ? void 0 : _a.send([encodedCommandIndex, data], clientId);
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
     * @param {String} commandName
     * @param {Object} data
     * @param clientId
     * @param {Function} callback
     */
    request(commandName, data, clientId, callback) {
        // Build the request object
        const req = {
            id: newIdHex(),
            cmd: commandName,
            data: data.data,
            callback: callback,
            timestamp: new Date().getTime()
        };
        // Store the request object
        this._requests[req.id] = req;
        // Send the network request packet
        this.send("_igeRequest", {
            id: req.id,
            cmd: commandName,
            data: req.data
        });
    }
    /**
     * Sends a response to a network request.
     * @param {String} requestId
     * @param {Object} data
     */
    response(requestId, data) {
        // Grab the original request object
        const req = this._requests[requestId];
        if (!req) {
            return;
        }
        this.send("_igeResponse", {
            id: requestId,
            cmd: req.cmd,
            data: data
        }, req.clientId);
        delete this._requests[requestId];
    }
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {Boolean}
     * @private
     */
    _originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }
    _sendTimeSync(clientId) {
        // Send the time sync command
        const data = [ige.engine._currentTime];
        this.send("_igeNetTimeSync", data, clientId);
    }
    /**
     * Called when the server receives a network message from a client.
     * @param {Object} data The data sent by the client.
     * @param {String} clientId The client socket id.
     * @private
     */
    _onClientMessage(data, clientId) {
        const ciDecoded = data[0].charCodeAt(0), commandName = this._networkCommandsIndex[ciDecoded];
        if (this._networkCommands[commandName]) {
            this._networkCommands[commandName](data[1], clientId);
        }
        this.emit(commandName, [data[1], clientId]);
    }
    /**
     * Called when a client disconnects from the server.
     * @param {Object} data Any data sent along with the disconnect.
     * @param {Object} socket The client socket object.
     * @private
     */
    _onClientDisconnect(data, socket) {
        this.log("Client disconnected with id " + socket._id);
        this.emit("disconnect", socket._id);
        // Remove them from all rooms
        this.clientLeaveAllRooms(socket._id);
        delete this._socketById[socket._id];
    }
}
