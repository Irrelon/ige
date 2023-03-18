/// <reference types="node" />
import http from "http";
import websocket from "websocket";
import IgeEventingClass from "../../../../core/IgeEventingClass";
export declare class NetIoSocket extends IgeEventingClass {
    classId: string;
    _id: string;
    _socket: websocket.connection;
    _encode: (data: any) => string;
    _decode: (data: string) => any;
    constructor(connection: websocket.connection, options: {
        id: string;
        encode: (data: any) => string;
        decode: (data: string) => any;
    });
    /**
     * Encodes the passed JSON data and sends it.
     * @param data
     */
    send(data: any): void;
    /**
     * Sends pre-encoded data without encoding it.
     * @param data
     * @private
     */
    _send(data: string): void;
    /**
     * Closes the socket.
     * @param reason
     */
    close(reason?: string): void;
}
export declare class NetIoServer extends IgeEventingClass {
    classId: string;
    _httpServer?: http.Server;
    _socketServer?: websocket.server;
    _port?: number;
    _sockets: NetIoSocket[];
    _socketsById: Record<string, NetIoSocket>;
    constructor(port: number, callback?: () => void);
    start(port: number, callback?: () => void): void;
    /**
     * Sends a message. If the client id is not specified
     * the message will be sent to all connected clients.
     *
     * @param {Object} data The JSON data to send.
     * @param {*=} clientIdOrArrayOfIds The id of the client to send to, or an array of id's to send to.
     */
    send(data: any, clientIdOrArrayOfIds?: string | string[]): void;
    /**
     * Sends an encoded data string to an array of client sockets.
     * @param recipientArray An array of client sockets.
     * @param encodedData The string encoded data to send each client.
     */
    _sendToEach(recipientArray: NetIoSocket[], encodedData: string): void;
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {Boolean}
     * @private
     */
    _originIsAllowed(origin?: string): boolean;
    /**
     * Encodes the passed JSON data into a data packet.
     * @param data
     * @return {*}
     * @private
     */
    _encode(data: any): string;
    /**
     * Decodes a data packet back into JSON data.
     * @param data
     * @return {*}
     * @private
     */
    _decode(data: string): any;
}
