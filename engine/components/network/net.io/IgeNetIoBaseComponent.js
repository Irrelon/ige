import IgeEventingClass from "../../../core/IgeEventingClass.js";
export class IgeNetIoBaseComponent extends IgeEventingClass {
    constructor() {
        super();
        this.classId = 'IgeNetIoBaseComponent';
        this._networkCommands = {}; // Maps a command name to a command handler function
        this._networkCommandsIndex = []; // Maps a command name to an integer via the array index
        this._networkCommandsLookup = {}; // Maps a command name to its index
        this._port = 8000;
        this._debug = false;
        this._debugCounter = 0;
        this._debugMax = 0;
        this._clientRooms = {};
        this._socketsByRoomId = {}; // Any should be socket, figure out what that is
        this._timeSyncInterval = 10000; // Sync the client/server clocks every ten seconds by default
        this._timeSyncLog = {};
        this._latency = 0;
        this._acceptConnections = false;
        // /* CEXCLUDE */
        // if (ige.isServer) {
        // 	this._netio = require('../../../' + modulePath + 'net.io-server').Server;
        // 	this._acceptConnections = false;
        // }
        // /* CEXCLUDE */
        //
        // if (ige.isClient) {
        // 	this._netio = IgeNetIoClient;
        // 	//this.implement(IgeNetIoClient);
        // }
        //this.log('Network component initiated with Net.IO version: ' + this._netio.version);
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
    /**
     * Gets / sets the maximum number of debug messages that
     * should be allowed to be output to the console before
     * debugging is automatically turned off. This is useful
     * if you want to sample a certain number of outputs and
     * then automatically disable output so your console is
     * not flooded.
     * @param {Number=} val Number of debug messages to allow
     * to be output to the console. Set to zero to allow
     * infinite amounts.
     * @return {*}
     */
    debugMax(val) {
        if (val !== undefined) {
            this._debugMax = val;
            return this;
        }
        return this._debugMax;
    }
}
