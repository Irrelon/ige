import { IgeEventingClass } from "../core/IgeEventingClass";
export class IgeNetIoBaseController extends IgeEventingClass {
    classId = 'IgeNetIoBaseController';
    _networkCommandsIndex = []; // Maps a command name to an integer via the array index
    _networkCommandsLookup = {}; // Maps a command name to its index
    _debug = false;
    _debugCounter = 0;
    _debugMax = 100;
    _clientRooms = {};
    _socketsByRoomId = {}; // Any should be socket, figure out what that is
    _timeSyncInterval = 10000; // Sync the client/server clocks every ten seconds by default
    _timeSyncLog = {};
    _latency = 0;
    _timeSyncStarted = false;
    _timeSyncTimer = 0;
    _sectionDesignator = '¬'; // Set the stream data section designator character
    timeSyncInterval(val) {
        if (val !== undefined) {
            this._timeSyncInterval = val;
            return this;
        }
        return this._timeSyncInterval;
    }
    timeToServerTime(time) {
        if (time !== undefined) {
            return time + this._latency;
        }
        return this._latency;
    }
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
}
