import IgeEventingClass from "../../../core/IgeEventingClass";
import {
	IgeNetworkMessageData
} from "../../../../types/IgeNetworkMessage";
import { NetIoSocket } from "./server/socketServer";

export class IgeNetIoBaseComponent extends IgeEventingClass {
	classId = 'IgeNetIoBaseComponent';
	_networkCommandsIndex: string[] = []; // Maps a command name to an integer via the array index
	_networkCommandsLookup: Record<string, number> = {}; // Maps a command name to its index
	_debug: boolean = true;
	_debugCounter: number = 0;
	_debugMax: number = 0;
	_clientRooms: Record<string, string[]> = {};
	_socketsByRoomId: Record<string, Record<string, NetIoSocket>> = {}; // Any should be socket, figure out what that is
	_timeSyncInterval: number = 10000; // Sync the client/server clocks every ten seconds by default
	_timeSyncLog: Record<string, number> = {};
	_latency: number = 0;
	_timeSyncStarted: boolean = false;
	_timeSyncTimer: number = 0;
	_sectionDesignator: string = '¬'; // Set the stream data section designator character

	constructor () {
		super();

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
	timeSyncInterval (val: number): this;
	timeSyncInterval (): number;
	timeSyncInterval (val?: number) {
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
	timeToServerTime (time?: number) {
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
	debug (val?: boolean) {
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
	debugMax (val: number): this;
	debugMax (): number;
	debugMax (val?: number) {
		if (val !== undefined) {
			this._debugMax = val;
			return this;
		}

		return this._debugMax;
	}

	send (command: string, data: IgeNetworkMessageData) {}
}
