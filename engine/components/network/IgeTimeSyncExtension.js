import { ige } from "../../instance.js";
/**
 * Adds client/server time sync capabilities to the network system.
 * This handles calculating the time difference between the clock
 * on the server and the clock on connected clients.
 */
export class IgeTimeSyncExtension {
    constructor() {
        this._timeSyncInterval = 0;
        this._timeSyncStarted = false;
        this._timeSyncTimer = 0;
        this._latency = 0;
        this._timeSyncLog = {};
    }
    /**
     * Gets / sets the number of milliseconds between client/server
     * clock sync events. The shorter the time, the more accurate the
     * client simulation will be but the more network traffic you
     * will transceive. Default value of ten seconds (10000) is usually
     * enough to provide very accurate results without over-using the
     * bandwidth.
     * @param val
     * @return {*}
     */
    timeSyncInterval(val) {
        if (val !== undefined) {
            this._timeSyncInterval = val;
            return this._entity;
        }
        return this._timeSyncInterval;
    }
    /* CEXCLUDE */
    timeSyncStart() {
        if (ige.isServer) {
            this._timeSyncStarted = true;
            // Send a time sync request now, so we
            // have a starting value to work with
            this._sendTimeSync();
            this.log("Starting client/server clock sync...");
            this._timeSyncTimer = setInterval(() => {
                this._sendTimeSync();
            }, this._timeSyncInterval);
        }
        return this._entity;
    }
    timeSyncStop() {
        this.log("Stopping client/server clock sync...");
        clearInterval(this._timeSyncTimer);
        this._timeSyncStarted = false;
        return this._entity;
    }
    /* CEXCLUDE */
    _sendTimeSync(data, clientId) {
        if (!data) {
            data = [ige.engine._currentTime];
        }
        // Send the time sync command
        this.send("_igeNetTimeSync", data, clientId);
    }
    /**
     * Converts a timestamp on the client to approx. time
     * on the server using the difference in client/server
     * clocks and the network latency between this client
     * and the server.
     * @param {Number} time The client timestamp (usually
     * the result of new Date().getTime() or
     * ige.currentTime()).
     */
    timeToServerTime(time) {
        if (time !== undefined) {
            return time + this._latency;
        }
        return this._latency;
    }
    _onTimeSync(data, clientId) {
        const localTime = Math.floor(ige.engine._currentTime);
        let sendTime, roundTrip, direction;
        if (ige.isClient) {
            sendTime = parseInt(data[0], 10);
            this._latency = localTime - sendTime;
            /*if (localTime < sendTime) {
                direction = 'behind';
            } else if (localTime > sendTime) {
                direction = 'in front of';
            } else {
                direction = 'same as';
            }

            this.log('Time sync, client clock ' + (localTime - sendTime) + 'ms ' + direction + ' server, send timestamp: ' + sendTime + ', local timestamp: ' + localTime);*/
            // Send a response without current clock time to the server
            this._sendTimeSync([data, localTime]);
        }
        /* CEXCLUDE */
        if (ige.isServer) {
            sendTime = parseInt(data[1], 10);
            roundTrip = (localTime - parseInt(data[0], 10));
            /*if (localTime < sendTime) {
                direction = 'behind';
            } else if (localTime > sendTime) {
                direction = 'in front of';
            } else {
                direction = 'same as';
            }

            this.log('Time sync, server clock ' + (localTime - sendTime) + 'ms ' + direction + ' client, roundtrip: ' + roundTrip + 'ms, send timestamp: ' + parseInt(data[0], 10) + ', local timestamp: ' + localTime);*/
            this._timeSyncLog[clientId] = localTime - sendTime;
        }
        /* CEXCLUDE */
    }
}
