"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeNetIoSocket = void 0;
const IgeEventingClass_1 = require("../../core/IgeEventingClass");
class IgeNetIoSocket extends IgeEventingClass_1.IgeEventingClass {
	constructor(connection, options) {
		super();
		this.classId = "IgeNetIoSocket";
		this._id = options.id;
		this._encode = options.encode;
		this._decode = options.decode;
		this._socket = connection;
		this._socket.on("message", (message) => {
			if (message.type === "utf8") {
				this.emit("message", this._decode(message.utf8Data));
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
	send(data) {
		this._socket.sendUTF(this._encode(data));
	}
	/**
	 * Sends pre-encoded data without encoding it.
	 * @param data
	 * @private
	 */
	_send(data) {
		this._socket.sendUTF(data);
	}
	/**
	 * Closes the socket.
	 * @param reason
	 */
	close(reason) {
		this.send({
			_netioCmd: "close",
			data: reason
		});
		this._socket.close();
	}
}
exports.IgeNetIoSocket = IgeNetIoSocket;
