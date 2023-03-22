export declare class StationServer {
    constructor();
    /**
     * Is called when the network tells us a new client has connected
     * to the server. This is the point we can return true to reject
     * the client connection if we wanted to.
     * @param socket The client socket object.
     * @private
     */
    _onPlayerConnect: (socket: any) => boolean;
    /**
     * Called when a client disconnects.
     * @param {String} clientId The client network id.
     * @private
     */
    _onPlayerDisconnect: (clientId: any) => void;
    /**
     * Is called when a network packet with the "playerEntity" command
     * is received by the server or client.
     *
     * @client This is the server telling us which entity is our player entity
     * so that we can track it with the main camera!
     * @server This is the client asking for a player entity.
     * @param {Object} data The data object that contains any data sent from the server.
     * @param {String=} clientId The id of the client that sent the command.
     * @private
     */
    _onPlayerEntity: (data: any, clientId: any) => void;
    _onMiningRequest: (data: any, clientId: any, callback: any) => void;
    generateAsteroidBelt: (beltX: any, beltY: any) => void;
}
