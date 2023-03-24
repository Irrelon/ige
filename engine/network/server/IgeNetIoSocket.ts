import { IgeEventingClass } from "../../core/IgeEventingClass";
import type websocket from "websocket";

export class IgeNetIoSocket extends IgeEventingClass {
	classId = "IgeNetIoSocket";
	_id: string;
	_socket: websocket.connection;
	_encode: (data: any) => string;
	_decode: (data: string) => any;

	constructor (connection: websocket.connection, options: {
		id: string;
		encode: (data: any) => string;
		decode: (data: string) => any;
	}) {
		super();

		this._id = options.id;
		this._encode = options.encode;
		this._decode = options.decode;

		this._socket = connection;
		this._socket.on("message", (message) => {
			if (message.type === "utf8") {
				this.emit("message", [this._decode(message.utf8Data)]);
				//socket.sendUTF(message.utf8Data);
			} else if (message.type === "binary") {
				console.log("Binary data received, no support yet!");
				//socket.sendBytes(message.binaryData);
			}
		});

		this._socket.on("close", (reasonCode, description) => {
			this.emit("disconnect", {
				socket: this._socket,
				reason: description,
				code: reasonCode
			});
		});
	}

	/**
	 * Encodes the passed JSON data and sends it.
	 * @param data
	 */
	send (data: any) {
		this._socket.sendUTF(this._encode(data));
	}

	/**
	 * Sends pre-encoded data without encoding it.
	 * @param data
	 * @private
	 */
	_send (data: string) {
		this._socket.sendUTF(data);
	}

	/**
	 * Closes the socket.
	 * @param reason
	 */
	close (reason?: string) {
		this.send({
			_netioCmd: "close",
			data: reason
		});

		this._socket.close();
	}
}
