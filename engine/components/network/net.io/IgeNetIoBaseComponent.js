import { IgeEventingClass } from "../../../core/IgeEventingClass";
export class IgeNetIoBaseComponent extends IgeEventingClass {
    constructor() {
        super(...arguments);
        this.classId = 'IgeNetIoBaseComponent';
        this._networkCommandsIndex = []; // Maps a command name to an integer via the array index
        this._networkCommandsLookup = {}; // Maps a command name to its index
        this._debug = false;
        this._debugCounter = 0;
        this._debugMax = 100;
        this._clientRooms = {};
        this._socketsByRoomId = {}; // Any should be socket, figure out what that is
        this._timeSyncInterval = 10000; // Sync the client/server clocks every ten seconds by default
        this._timeSyncLog = {};
        this._latency = 0;
        this._timeSyncStarted = false;
        this._timeSyncTimer = 0;
        this._sectionDesignator = '¬'; // Set the stream data section designator character
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
            this.log(`Discontinuing further debug messages because we reached the maximum message count of ${this._debugMax}. Re-enable by running ige.network.debug(true);`);
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
