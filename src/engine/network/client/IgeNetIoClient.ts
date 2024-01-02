import { IgeEventingClass } from "../../core/IgeEventingClass";

// /**
//  * Define the debug options object.
//  * @type {Object}
//  * @private
//  */
// NetIo._debug = {
// 	_enabled: true,
// 	_node: typeof (module) !== "undefined" && typeof (module.exports) !== "undefined",
// 	_level: ["log", "warning", "error"],
// 	_stacks: false,
// 	_throwErrors: true,
// 	_trace: {
// 		setup: false,
// 		enabled: false,
// 		match: ""
// 	},
// 	enabled: function (val) {
// 		if (val !== undefined) {
// 			this._enabled = val;
// 			return this;
// 		}
//
// 		return this._enabled;
// 	}
// };

export interface IgeNetIoClientOptions {
	connectionRetry?: boolean;
	connectionRetryMax?: number;
	reconnect?: boolean;
}

export class IgeNetIoClient extends IgeEventingClass {
	classId = "IgeNetIoClient";
	_networkId?: string;
	_options?: IgeNetIoClientOptions = {
		connectionRetry: true,
		connectionRetryMax: 10,
		reconnect: true
	};
	_state: number = 0;
	_debug: boolean = false;
	_connectionAttempts: number = 0;
	_socket: WebSocket | null;
	_disconnectReason?: string;

	constructor (
		url?: string,
		options: IgeNetIoClientOptions = {
			connectionRetry: true,
			connectionRetryMax: 10,
			reconnect: true
		}
	) {
		super();
		this.log("Net.io client starting...");
		this._options = options || {};
		this._socket = null;
		this._state = 0;
		this._debug = false;
		this._connectionAttempts = 0;

		// Set some default options
		if (this._options.connectionRetry === undefined) {
			this._options.connectionRetry = true;
		}
		if (this._options.connectionRetryMax === undefined) {
			this._options.connectionRetryMax = 10;
		}
		if (this._options.reconnect === undefined) {
			this._options.reconnect = true;
		}

		// If we were passed a server url, connect to it
		if (url !== undefined) {
			this.connect(url);
		}
	}

	/**
	 * Gets / sets the debug flag. If set to true, net.io
	 * will output debug data about every network event as
	 * it occurs to the console.
	 * @param {boolean=} val
	 * @return {*}
	 */
	debug (val?: boolean) {
		if (val !== undefined) {
			this._debug = val;
			return this;
		}

		return this._debug;
	}

	connect (url: string) {
		this.log(`Connecting to server at ${url}`);

		// Set the state to connecting
		this._state = 1;

		// Replace http:// with ws://
		url = url.replace("http://", "ws://");

		// Create new websocket to the url
		this._socket = new WebSocket(url, "netio1");

		// Setup event listeners
		this._socket.onopen = this._onOpen;
		this._socket.onmessage = this._onData;
		this._socket.onclose = this._onClose;
		this._socket.onerror = this._onError;
	}

	disconnect (reason?: string) {
		if (!this._socket) {
			this.log("Cannot disconnect(), no socket defined!", "warning");
			return;
		}

		this._socket.close(1000, reason);
	}

	send (data: any) {
		if (!this._socket) {
			this.log("Cannot send(), no socket defined!", "warning");
			return;
		}

		this._socket.send(this._encode(data));
	}

	_onOpen = () => {
		this._state = 2;
	};

	_onData = (evt: MessageEvent<any>) => {
		// Decode packet and emit message event
		const packet = this._decode(evt.data);

		// Output debug if required
		if (this._debug) {
			console.log("Incoming data (event, decoded data):", evt, packet);
		}

		if (packet._netioCmd) {
			// The packet is a netio command
			switch (packet._netioCmd) {
			case "id":
				// Store the new id in the socket
				this._networkId = packet.data;

				// Now we have an id, set the state to connected
				this._state = 3;

				// Emit the connect event
				this.emit("connect", this._networkId);
				break;

			case "close":
				// The server told us our connection has been closed
				// so store the reason the server gave us!
				this._disconnectReason = packet.data;
				break;
			}
		} else {
			// The packet is normal data
			this.emit("message", packet);
		}
	};

	_onClose = (evt: CloseEvent) => {
		const { code, reason, wasClean } = evt;

		// If we are already connected and have an id...
		if (this._state === 3) {
			this._state = 0;
			this.emit("disconnect", { reason: this._disconnectReason || reason, wasClean: wasClean, code: code });
		}

		// If we are connected but have no id...
		if (this._state === 2) {
			this._state = 0;
			this.emit("disconnect", { reason: this._disconnectReason || reason, wasClean: wasClean, code: code });
		}

		// If we were trying to connect...
		if (this._state === 1) {
			this._state = 0;
			this.emit("error", { reason: `Cannot establish connection, is server running? ${reason}` });
		}

		// Remove the last disconnect reason
		delete this._disconnectReason;
	};

	_onError = (evt: Event) => {
		this.log("An error occurred with the net.io socket!", "error", evt);
		this.emit("error", { reason: "Unknown error occurred" });
	};

	_encode (data: any) {
		return JSON.stringify(data);
	}

	_decode (data: string) {
		return JSON.parse(data);
	}
}
