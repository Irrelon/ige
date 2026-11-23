import type { IgeEntity } from "@/engine/core/IgeEntity";
import { ige } from "@/engine/instance";
import { IgeNetIoClient } from "@/engine/network/client/IgeNetIoClient";
import { IgeNetIoBaseController } from "@/engine/network/IgeNetIoBaseController";
import { newIdHex } from "@/engine/utils/ids";
import { igeClassStore } from "@/engine/utils/igeClassStore";
import {
	IGE_NETWORK_JOIN_ROOM,
	IGE_NETWORK_LEAVE_ROOM,
	IGE_NETWORK_REQUEST,
	IGE_NETWORK_RESPONSE,
	IGE_NETWORK_TIME_SYNC
} from "@/enums";
import { IgeNetworkConnectionState } from "@/enums/IgeNetworkConnectionState";
import type { IgeIsReadyPromise } from "@/types/IgeIsReadyPromise";
import type {
	IgeNetworkClientSideMessageHandler,
	IgeNetworkClientSideResponseHandler,
	IgeNetworkEncodedMessageData,
	IgeNetworkMessageData,
	IgeNetworkMessageStructure,
	IgeNetworkRequestMessageStructure,
	IgeNetworkTimeSyncRequestFromServer, IgeNetworkTimeSyncResponseFromClient
} from "@/types/IgeNetworkMessage";

/**
 * The client-side net.io component. Handles all client-side
 * networking systems.
 */
export class IgeNetIoClientController extends IgeNetIoBaseController implements IgeIsReadyPromise {
	version: string = "1.0.0";
	_networkCommands: Record<string, IgeNetworkClientSideMessageHandler> = {}; // Maps a command name to a command handler function
	_initDone: boolean = false;
	_idCounter: number = 0;
	_requests: Record<string, IgeNetworkRequestMessageStructure<IgeNetworkClientSideResponseHandler>> = {};
	_state: IgeNetworkConnectionState = IgeNetworkConnectionState.disconnected;
	_io?: IgeNetIoClient;
	_id?: string;
	_url?: string;

	isReady () {
		return Promise.resolve();
	}

	/**
	 * Gets the current socket id.
	 * @returns {string} The id of the socket connection to the server.
	 */
	id (): string {
		return this._id || "";
	}

	/**
	 * Connects to the specified server. The promise this function returns
	 * will only resolve when the connection to the server is ready to use.
	 * @param {*} url The game server URL e.g. `http://localhost:2000`.
	 * @param {Function=} callback A callback method to call once the
	 * network has started, or you can use the returned promise.
	 */
	start (url?: string, callback?: () => void): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this._state === IgeNetworkConnectionState.ready) {
				// We're already connected
				if (callback) {
					callback();
				}

				resolve();
				return;
			}

			if (typeof url !== "undefined") {
				this._url = url;
			}

			this.log(`Connecting to net.io server at "${this._url}"...`);

			if (typeof WebSocket === "undefined") {
				return;
			}

			this._io = new IgeNetIoClient(url);
			this._state = IgeNetworkConnectionState.connecting;

			this._io.on("connect", (clientId) => {
				this._state = IgeNetworkConnectionState.connected; // Connected
				this._id = clientId;
				this._onConnectToServer();
			});

			this._io.on("message", (data) => {
				if (this._initDone) {
					this._onMessageFromServer(data);
					return;
				}

				let commandCount = 0;

				// Check if the data is an init packet
				if (data.cmd === "init") {
					// Set flag to show we've now received an init command
					this._initDone = true;
					this._state = IgeNetworkConnectionState.ready; // Connected and init done

					// Set up the network commands storage
					this._networkCommandsLookup = data.ncmds;

					// Fill the reverse lookup on the commands
					for (const i in this._networkCommandsLookup) {
						if (this._networkCommandsLookup.hasOwnProperty(i)) {
							this._networkCommandsIndex[this._networkCommandsLookup[i]] = i;
							commandCount++;
						}
					}

					// Set up default commands
					this.define(IGE_NETWORK_REQUEST, this._onRequest);
					this.define(IGE_NETWORK_RESPONSE, this._onResponse);
					this.define(IGE_NETWORK_TIME_SYNC, this._onTimeSync);

					this.log("Received network command list with count: " + commandCount);

					// Setup timescale and current time
					ige.engine.timeScale(parseFloat(data.ts));
					ige.engine._currentTime = parseInt(data.ct);

					// Now fire the start() callback
					if (callback) {
						callback();
					}

					resolve();
				}
			});

			this._io.on("disconnect", (data) => {
				this._state = IgeNetworkConnectionState.disconnected; // Disconnected
				this._onDisconnectFromServer(data);
			});

			this._io.on("error", this._onError);
		});
	}

	_onRequest = (data: IgeNetworkRequestMessageStructure<IgeNetworkClientSideMessageHandler>): void => {
		// Store the network request by its id
		this._requests[data.id] = data;

		if (this.debug()) {
			console.log("onRequest", data);
			this._debugCounter++;
		}

		// The message is a network request so fire the command event
		// with the request id and the request data
		if (this._networkCommands[data.cmd]) {
			this._networkCommands[data.cmd](data.id, data.data);
		}

		this.emit(data.cmd, data.id, data.data);
	};

	_onResponse = (responseObj: IgeNetworkMessageStructure): void => {
		// The message is a network response
		// to a request we sent earlier
		const id = responseObj.id;

		// Get the original request object from
		// the request id
		const requestObj = this._requests[id];

		if (this.debug()) {
			console.log("onResponse", responseObj);
			this._debugCounter++;
		}

		if (requestObj) {
			// Fire the request callback!
			requestObj.callback(...responseObj.data);

			// Delete the request from memory
			delete this._requests[id];
		}
	};

	_onTimeSync = (data: IgeNetworkTimeSyncRequestFromServer): void => {
		const localTime = Math.floor(ige.engine._currentTime);
		const serverTime = data[0];

		this._latency = localTime - serverTime;

		/*if (localTime < sendTime) {
			direction = 'behind';
		} else if (localTime > sendTime) {
			direction = 'in front of';
		} else {
			direction = 'same as';
		}

		this.log('Time sync, client clock ' + (localTime - sendTime) + 'ms ' + direction + ' server, send timestamp: ' + sendTime + ', local timestamp: ' + localTime);*/

		// Send a response without current clock time to the server
		this._sendTimeSync([serverTime, localTime]);
	};

	stop (): void {
		// Check we are connected
		if (this._state === IgeNetworkConnectionState.ready) {
			this._io?.disconnect("Client requested disconnect");
		}
	}

	/**
	 * Gets / sets a network command and callback. When a network command
	 * is received by the client, the callback set up for that command will
	 * automatically be called and passed the data from the incoming network
	 * packet.
	 * @param {string} commandName The name of the command to define.
	 * @param {Function} callback A function to call when the defined network
	 * command is received by the network.
	 * @return {*}
	 */
	define (commandName: string, callback: (...args: any[]) => void): this | undefined {
		if (!commandName || !callback) {
			this.log(
				"Cannot define network command either the commandName or callback parameters were undefined!",
				"error"
			);
			return this;
		}

		this._networkCommands[commandName] = callback;
		return this;
	}

	/**
	 * Sends a network message with the given command name
	 * and data.
	 * @param commandName
	 * @param data
	 */
	send<DataType = IgeNetworkMessageData> (
		commandName: string,
		data?: DataType
	) {
		const commandIndex = this._networkCommandsLookup[commandName];

		if (commandIndex !== undefined) {
			if (this.debug()) {
				this.log(`Sending "${commandName}" (index ${commandIndex}) with data:`, data);
				this._debugCounter++;
			}

			const encodedCommandIndex = String.fromCharCode(commandIndex);
			this._io?.send([encodedCommandIndex, data]);
		} else {
			this.log(
				`Cannot send network packet with command "${commandName}" because the command has not been defined!`,
				"error"
			);
		}
	}

	/**
	 * Sends a network request. This is different from a standard
	 * call to send() because the recipient code will be able to
	 * respond by calling ige.network.response(). When the response
	 * is received, the callback method that was passed in the
	 * callback parameter will be fired with the response data.
	 * @param {string} commandName
	 * @param {Object} data
	 * @param {Function=} callback
	 */
	request<RequestDataType = IgeNetworkMessageData, ResultDataType = IgeNetworkMessageData> (
		commandName: string,
		data: RequestDataType,
		callback?: IgeNetworkClientSideMessageHandler<ResultDataType>
	): Promise<ResultDataType> {
		return new Promise<ResultDataType>((resolve) => {
			// Build the request object
			const req: IgeNetworkRequestMessageStructure<IgeNetworkClientSideMessageHandler<ResultDataType>> = {
				id: newIdHex(),
				cmd: commandName,
				data: data,
				callback: (...args: any[]) => {
					if (callback) {
						// @ts-ignore
						callback(...args);
					}

					// @ts-ignore
					resolve(...args);
				},
				timestamp: new Date().getTime()
			};

			// Store the request object
			this._requests[req.id] = req;

			// Send the network request packet
			this.send(IGE_NETWORK_REQUEST, {
				id: req.id,
				cmd: commandName,
				data: req.data
			});
		});
	}

	/**
	 * Sends a response to a network request.
	 * @param {string} requestId
	 * @param {Object} data
	 */
	response<ResultDataType = IgeNetworkMessageData> (requestId: string, data: ResultDataType) {
		// Grab the original request object
		const req = this._requests[requestId];

		if (req) {
			// Send the network response packet
			this.send<IgeNetworkMessageStructure<ResultDataType>>(IGE_NETWORK_RESPONSE, {
				id: requestId,
				cmd: req.cmd,
				data: data
			});

			// Remove the request as we've now responded!
			delete this._requests[requestId];
		}
	}

	/**
	 * Called when the network connects to the server.
	 * @private
	 */
	_onConnectToServer () {
		this.log("Connected to server!");
		this.emit("connected");
	}

	/**
	 * Called when data from the server is received on the client.
	 * @param data
	 * @private
	 */
	_onMessageFromServer (data: IgeNetworkEncodedMessageData) {
		const decodedCommandIndex = data[0].charCodeAt(0);
		const commandName = this._networkCommandsIndex[decodedCommandIndex];

		if (this._networkCommands[commandName]) {
			if (this.debug()) {
				this.log(`Received "${commandName}" (index ${decodedCommandIndex}) with data:`, data[1]);
				this._debugCounter++;
			}

			this._networkCommands[commandName](data[1]);
		}

		this.emit(commandName, data[1]);
	}

	/**
	 * Called when the client is disconnected from the server.
	 * @param data
	 * @private
	 */
	_onDisconnectFromServer (data: string) {
		if (data === "booted") {
			this.log("Server rejected our connection because it is not accepting connections at this time!", "warning");
		} else {
			this.log("Disconnected from server!");
		}
		this.emit("disconnected");
	}

	/**
	 * Called when the client has an error with the connection.
	 * @param {Object} data
	 * @private
	 */
	// TODO: Make an error message interface and apply it here
	_onError = (data: any) => {
		this.log(`Error with connection: ${data.reason}`, "error");
	};

	_sendTimeSync (data: IgeNetworkTimeSyncResponseFromClient) {
		// Send the time sync command
		this.send(IGE_NETWORK_TIME_SYNC, data);
	}

	/**
	 * Asks the server to assign us to a room by the room
	 * id.
	 *
	 * A client can be joined to multiple rooms. If you want
	 * to join a room without leaving the others the client
	 * is already part of, set the leaveAllOthers flag to
	 * false.
	 * @param roomId
	 * @param leaveAllOthers
	 */
	joinRoom (roomId: string, leaveAllOthers: boolean = true) {
		this.send(IGE_NETWORK_JOIN_ROOM, [roomId, leaveAllOthers]);
	}

	leaveRoom (roomId: string) {
		this.send(IGE_NETWORK_LEAVE_ROOM, roomId);
	}

	leaveAllRooms () {
		this.send(IGE_NETWORK_LEAVE_ROOM, "");
	}
}
