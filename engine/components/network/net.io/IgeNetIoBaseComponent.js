import IgeEventingClass from "../../../core/IgeEventingClass.js";
export class IgeNetIoBaseComponent extends IgeEventingClass {
    constructor() {
        super();
        this.classId = 'IgeNetIoBaseComponent';
        this._networkCommands = {}; // Maps a command name to a command handler function
        this._networkCommandsIndex = []; // Maps a command name to an integer via the array index
        this._networkCommandsLookup = {}; // Maps a command name to its index
        this._debug = false;
        this._debugCounter = 0;
        this._debugMax = 0;
        this._clientRooms = {};
        this._socketsByRoomId = {}; // Any should be socket, figure out what that is
        this._timeSyncInterval = 10000; // Sync the client/server clocks every ten seconds by default
        this._timeSyncLog = {};
        this._latency = 0;
        this._timeSyncStarted = false;
        this._timeSyncTimer = 0;
        // /* CEXCLUDE */
        // if (isServer) {
        // 	this._netio = require('../../../' + modulePath + 'net.io-server').Server;
        // 	this._acceptConnections = false;
        // }
        // /* CEXCLUDE */
        //
        // if (isClient) {
        // 	this._netio = IgeNetIoClient;
        // 	//this.implement(IgeNetIoClient);
        // }
        //this.log('Network component initiated with Net.IO version: ' + this._netio.version);
    }
    timeSyncInterval(val) {
        if (val !== undefined) {
            this._timeSyncInterval = val;
            return this;
        }
        return this._timeSyncInterval;
    }
    /**
     * Converts a timestamp on the client to approx. time
     * on the server using the difference in client/server
     * clocks and the network latency between this client
     * and the server.
     * @param {Number} time The client timestamp, usually
     * the result of new Date().getTime() or ige.currentTime().
     */
    timeToServerTime(time) {
        if (time !== undefined) {
            return time + this._latency;
        }
        return this._latency;
    }
    /**
     * Gets / sets debug flag that determines if debug output
     * is logged to the console.
     * @param {Boolean=} val
     * @return {*}
     */
    debug(val) {
        if (val !== undefined) {
            this._debug = val;
            return this;
        }
        // Check the debug counter settings
        if (this._debugMax > 0 && this._debugCounter >= this._debugMax) {
            this._debug = false;
            this._debugCounter = 0;
        }
        return this._debug;
    }
    debugMax(val) {
        if (val !== undefined) {
            this._debugMax = val;
            return this;
        }
        return this._debugMax;
    }
    send(command, data) { }
}
