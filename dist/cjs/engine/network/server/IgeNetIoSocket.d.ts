import type websocket from "websocket";
import { IgeEventingClass } from "../../core/IgeEventingClass";

export declare class IgeNetIoSocket extends IgeEventingClass {
	classId: string;
	_id: string;
	_socket: websocket.connection;
	_encode: (data: any) => string;
	_decode: (data: string) => any;
	constructor(
		connection: websocket.connection,
		options: {
			id: string;
			encode: (data: any) => string;
			decode: (data: string) => any;
		}
	);
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
