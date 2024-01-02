import { IgeNetIoSocket } from "./server/IgeNetIoSocket";
import { IgeEventingClass } from "../core/IgeEventingClass";

export declare class IgeNetIoBaseController extends IgeEventingClass {
	classId: string;
	_networkCommandsIndex: string[];
	_networkCommandsLookup: Record<string, number>;
	_debug: boolean;
	_debugCounter: number;
	_debugMax: number;
	_clientRooms: Record<string, string[]>;
	_socketsByRoomId: Record<string, Record<string, IgeNetIoSocket>>;
	_timeSyncInterval: number;
	_timeSyncLog: Record<string, number>;
	_latency: number;
	_timeSyncStarted: boolean;
	_timeSyncTimer: number;
	_sectionDesignator: string;
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
	timeSyncInterval(val: number): this;
	timeSyncInterval(): number;
	/**
	 * Converts a timestamp on the client to approx. time
	 * on the server using the difference in client/server
	 * clocks and the network latency between this client
	 * and the server.
	 * @param {number} time The client timestamp, usually
	 * the result of new Date().getTime() or ige.currentTime().
	 */
	timeToServerTime(time: number): number;
	timeToServerTime(): number;
	/**
	 * Gets / sets debug flag that determines if debug output
	 * is logged to the console.
	 * @param {boolean=} val
	 * @return {*}
	 */
	debug(val: boolean): this;
	debug(): boolean;
	/**
	 * Gets / sets the maximum number of debug messages that
	 * should be allowed to be output to the console before
	 * debugging is automatically turned off. This is useful
	 * if you want to sample a certain number of outputs and
	 * then automatically disable output so your console is
	 * not flooded.
	 * @param {number=} val Number of debug messages to allow
	 * to be output to the console. Set to zero to allow
	 * infinite amounts.
	 * @return {*}
	 */
	debugMax(val: number): this;
	debugMax(): number;
}
