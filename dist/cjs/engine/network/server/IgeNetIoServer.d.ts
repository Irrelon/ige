/// <reference types="node" />
import { IgeNetIoSocket } from "../../../export/exports.js"
import { IgeEventingClass } from "../../../export/exports.js"
import http from "http";
import websocket from "websocket";
export declare class IgeNetIoServer extends IgeEventingClass {
    classId: string;
    _httpServer?: http.Server;
    _socketServer?: websocket.server;
    _port?: number;
    _sockets: IgeNetIoSocket[];
    _socketsById: Record<string, IgeNetIoSocket>;
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
    _sendToEach(recipientArray: IgeNetIoSocket[], encodedData: string): void;
    /**
     * Determines if the origin of a request should be allowed or denied.
     * @param origin
     * @return {boolean}
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
