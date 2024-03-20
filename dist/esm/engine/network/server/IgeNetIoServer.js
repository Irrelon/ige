import { IgeEventingClass } from "../../core/IgeEventingClass.js"
import { IgeNetIoSocket } from "./IgeNetIoSocket.js"
import { arrClone } from "../../utils/arrays.js"
import { newIdHex } from "../../utils/ids.js"
import http from "http";
import websocket from "websocket";
// /**
//  * Define the debug options object.
//  * @type {Object}
//  * @private
//  */
// NetIo._debug = {
// 	node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
// 	level: ['log', 'warning', 'error'],
// 	stacks: false,
// 	throwErrors: true,
// 	trace: {
// 		setup: false,
// 		enabled: false,
// 		match: ''
// 	}
// };
export class IgeNetIoServer extends IgeEventingClass {
    classId = "IgeNetIoServer";
    _httpServer;
    _socketServer;
    _port;
    _sockets;
    _socketsById;
    constructor(port, callback) {
        super();
        this._sockets = [];
        this._socketsById = {};
        if (port === undefined)
            return;
        this.start(port, callback);
    }
    start(port, callback) {
        this._port = port;
        this._httpServer = http.createServer(function (request, response) {
            response.writeHead(404);
            response.end();
        });
        this._socketServer = new websocket.server({
            httpServer: this._httpServer,
            // You should not use autoAcceptConnections for production
            // applications, as it defeats all standard cross-origin protection
            // facilities built into the protocol and the browser.  You should
            // *always* verify the connection's origin and decide whether
            // to accept it.
            autoAcceptConnections: false
        });
        // Setup listeners
        this._socketServer.on("request", (request) => {
            // Make sure we only accept requests from an allowed origin
            if (!this._originIsAllowed(request.origin)) {
                request.reject();
                this.log("Connection from origin " + request.origin + " rejected by origin check!");
                return;
            }
            this.log("Client connecting...");
            const connection = request.accept("netio1", request.origin);
            // Give the socket a unique ID
            const id = newIdHex();
            const socket = new IgeNetIoSocket(connection, {
                id,
                encode: this._encode,
                decode: this._decode
            });
            // Add the socket to the internal lookups
            this._sockets.push(socket);
            this._socketsById[id] = socket;
            // Register a listener so that if the socket disconnects,
            // we can remove it from the active socket lookups
            socket.on("disconnect", () => {
                const index = this._sockets.indexOf(socket);
                if (index > -1) {
                    // Remove the socket from the array
                    this._sockets.splice(index, 1);
                }
                delete this._socketsById[id];
            });
            // Tell the client their new ID
            socket.send({
                _netioCmd: "id",
                data: id
            });
            this.emit("connection", socket);
        });
        this._httpServer.on("error", (err) => {
            switch (err.code) {
                // TODO: Add all the error codes and human readable error here!
                case "EADDRINUSE":
                    this.log("Cannot start server on port " +
                        this._port +
                        " because the port is already in use by another application!", "error");
                    break;
                default:
                    this.log("Cannot start server, error code: " + err.code);
                    break;
            }
        });
        this._httpServer.listen(this._port, () => {
            this.log("Server is listening on port " + this._port);
            if (typeof callback === "function") {
                callback();
            }
        });
    }
    /**
     * Sends a message. If the client id is not specified
     * the message will be sent to all connected clients.
     *
     * @param {Object} data The JSON data to send.
     * @param {*=} clientIdOrArrayOfIds The id of the client to send to, or an array of id's to send to.
     */
    send(data, clientIdOrArrayOfIds) {
        // Pre-encode the data and then use _send to send raw
        // instead of encoding for every socket
        const encodedData = this._encode(data);
        if (clientIdOrArrayOfIds === undefined) {
            // No client id provided, send to all connected clients
            this._sendToEach(arrClone(this._sockets), encodedData);
            return;
        }
        if (typeof clientIdOrArrayOfIds === "string") {
            // There is only one recipient
            if (this._socketsById[clientIdOrArrayOfIds]) {
                this._sendToEach([this._socketsById[clientIdOrArrayOfIds]], encodedData);
                return;
            }
            this.log(`Cannot send data to socket "${clientIdOrArrayOfIds}", client disconnect before data could be processed?`, "info");
            return;
        }
        // There is an array of recipients
        const recipientArray = clientIdOrArrayOfIds.reduce((finalArr, clientId) => {
            const clientSocket = this._socketsById[clientId];
            if (clientSocket)
                finalArr.push(clientSocket);
            return finalArr;
        }, []);
        this._sendToEach(recipientArray, encodedData);
    }
    /**
     * Sends an encoded data string to an array of client sockets.
     * @param recipientArray An array of client sockets.
     * @param encodedData The string encoded data to send each client.
     */
    _sendToEach(recipientArray, encodedData) {
        let arrCount = recipientArray.length;
        while (arrCount--) {
            if (!recipientArray[arrCount])
                continue;
            recipientArray[arrCount]._send(encodedData);
        }
    }
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {boolean}
     * @private
     */
    _originIsAllowed(origin) {
        // TODO: Allow origins to be specified on startup and checked against here!
        // put logic here to detect whether the specified origin is allowed.
        return true;
    }
    /**
     * Encodes the passed JSON data into a data packet.
     * @param data
     * @return {*}
     * @private
     */
    _encode(data) {
        return JSON.stringify(data);
    }
    /**
     * Decodes a data packet back into JSON data.
     * @param data
     * @return {*}
     * @private
     */
    _decode(data) {
        return JSON.parse(data);
    }
}
