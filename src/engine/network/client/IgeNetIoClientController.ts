import { ige } from "../../instance";
import { igeClassStore } from "../../igeClassStore";
import { newIdHex } from "../../utils";
import { IgeNetIoBaseController } from "../IgeNetIoBaseController";
import { IgeNetIoClient } from "./IgeNetIoClient";
import {
	IgeNetworkMessageStructure,
	IgeNetworkRequestMessageStructure,
	IgeNetworkMessageData,
	IgeNetworkEncodedMessageData,
	IgeNetworkTimeSyncResponseFromClient,
	IgeNetworkTimeSyncRequestFromServer,
	IgeNetworkClientSideMessageHandler, IgeNetworkClientSideResponseHandler
} from "@/types/IgeNetworkMessage";
import {
	IgeStreamCreateMessageData,
	IgeStreamDestroyMessageData,
	IgeStreamUpdateMessageData
} from "@/types/IgeNetworkStream";
import { IgeEntity } from "../../core/IgeEntity";
import {
	IGE_NETWORK_REQUEST,
	IGE_NETWORK_RESPONSE,
	IGE_NETWORK_STREAM_CREATE,
	IGE_NETWORK_STREAM_DATA,
	IGE_NETWORK_STREAM_DESTROY,
	IGE_NETWORK_STREAM_TIME,
	IGE_NETWORK_TIME_SYNC
} from "@/enums/IgeNetworkConstants";

/**
 * The client-side net.io component. Handles all client-side
 * networking systems.
 */
export class IgeNetIoClientController extends IgeNetIoBaseController {
	version: string = '1.0.0';
	_networkCommands: Record<string, IgeNetworkClientSideMessageHandler> = {}; // Maps a command name to a command handler function
	_initDone: boolean = false;
	_idCounter: number = 0;
	_requests: Record<string, IgeNetworkRequestMessageStructure<IgeNetworkClientSideResponseHandler>> = {};
	_state: number = 0;
	_io?: IgeNetIoClient;
	_id?: string;
	_url?: string;
	_renderLatency: number = 100;
	_streamDataTime: number = 0;

	constructor () {
		super();

		// Define the network stream commands
		this.define(IGE_NETWORK_STREAM_CREATE, this._onStreamCreate);
		this.define(IGE_NETWORK_STREAM_DESTROY, this._onStreamDestroy);
		this.define(IGE_NETWORK_STREAM_DATA, this._onStreamData);
		this.define(IGE_NETWORK_STREAM_TIME, this._onStreamTime);
	}


	/**
	 * Gets the current socket id.
	 * @returns {string} The id of the socket connection to the server.
	 */
	id () {
		return this._id || '';
	}

	/**
	 * Starts the network for the client.
	 * @param {*} url The game server URL.
	 * @param {Function=} callback A callback method to call once the
	 * network has started.
	 */
	start (url?: string, callback?: () => void) {
		return new Promise<void>((resolve) => {
			if (this._state === 3) {
				// We're already connected
				if (callback) {
					callback();
				}

				resolve();
				return;
			}

			if (typeof (url) !== "undefined") {
				this._url = url;
			}

			this.log(`Connecting to net.io server at "${this._url}"...`);

			if (typeof WebSocket === "undefined") {
				return;
			}

			this._io = new IgeNetIoClient(url);
			this._state = 1;

			this._io.on("connect", (clientId) => {
				this._state = 2; // Connected
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
					this._state = 3; // Connected and init done

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
				this._state = 0; // Disconnected
				this._onDisconnectFromServer(data);
			});

			this._io.on("error", this._onError);
		});
	}

	_onRequest = (data: IgeNetworkRequestMessageStructure<IgeNetworkClientSideMessageHandler>) => {
		// Store the network request by its id
		this._requests[data.id] = data;

		if (this.debug()) {
			console.log('onRequest', data);
			this._debugCounter++;
		}

		// The message is a network request so fire the command event
		// with the request id and the request data
		if (this._networkCommands[data.cmd]) {
			this._networkCommands[data.cmd](data.id, data.data);
		}

		this.emit(data.cmd, data.id, data.data);
	};

	_onResponse = (responseObj: IgeNetworkMessageStructure) => {
		// The message is a network response
		// to a request we sent earlier
		const id = responseObj.id;

		// Get the original request object from
		// the request id
		const requestObj = this._requests[id];

		if (this.debug()) {
			console.log('onResponse', responseObj);
			this._debugCounter++;
		}

		if (requestObj) {
			// Fire the request callback!
			requestObj.callback(...responseObj.data);

			// Delete the request from memory
			delete this._requests[id];
		}
	};

	_onTimeSync = (data: IgeNetworkTimeSyncRequestFromServer) => {
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

	stop () {
		// Check we are connected
		if (this._state === 3) {
			this._io?.disconnect('Client requested disconnect');
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
	define (commandName: string, callback: (...args: any[]) => void) {
		if (commandName !== undefined && callback !== undefined) {
			// Check if this command has been defined by the server
			//if (this._networkCommandsLookup[commandName] !== undefined) {
			this._networkCommands[commandName] = callback;
			//} else {
			//	this.log(`Cannot define network command "${commandName}" because it does not exist on the server. Please edit your server code and define the network command there before trying to define it on the client!`, 'error');
			//}

			return this;
		} else {
			this.log('Cannot define network command either the commandName or callback parameters were undefined!', 'error');
		}
	}

	/**
	 * Sends a network message with the given command name
	 * and data.
	 * @param commandName
	 * @param data
	 * @param callback
	 */
	send<DataType = IgeNetworkMessageData> (commandName: string, data?: DataType, callback?: IgeNetworkClientSideResponseHandler) {
		if (callback) {
			this.request(commandName, data, callback);
			return;
		}

		const commandIndex = this._networkCommandsLookup[commandName];

		if (commandIndex !== undefined) {
			if (this.debug()) {
				this.log(`Sending "${commandName}" (index ${commandIndex}) with data:`, data);
				this._debugCounter++;
			}

			const encodedCommandIndex = String.fromCharCode(commandIndex);
			this._io?.send([encodedCommandIndex, data]);
		} else {
			this.log(`Cannot send network packet with command "${commandName}" because the command has not been defined!`, 'error');
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
	request <ResultType = any> (commandName: string, data: IgeNetworkMessageData, callback?: IgeNetworkClientSideMessageHandler): Promise<ResultType> {
		return new Promise<ResultType>((resolve) => {
			// Build the request object
			const req: IgeNetworkRequestMessageStructure<IgeNetworkClientSideMessageHandler> = {
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
			this.send(
				IGE_NETWORK_REQUEST,
				{
					id: req.id,
					cmd: commandName,
					data: req.data
				}
			);
		});
	}

	/**
	 * Sends a response to a network request.
	 * @param {string} requestId
	 * @param {Object} data
	 */
	response (requestId: string, data: IgeNetworkMessageData) {
		// Grab the original request object
		const req = this._requests[requestId];

		if (req) {
			// Send the network response packet
			this.send(
				IGE_NETWORK_RESPONSE,
				{
					id: requestId,
					cmd: req.cmd,
					data: data
				}
			);

			// Remove the request as we've now responded!
			delete this._requests[requestId];
		}
	}

	/**
	 * Called when the network connects to the server.
	 * @private
	 */
	_onConnectToServer () {
		this.log('Connected to server!');
		this.emit('connected');
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
		if (data === 'booted') {
			this.log('Server rejected our connection because it is not accepting connections at this time!', 'warning');
		} else {
			this.log('Disconnected from server!');
		}
		this.emit('disconnected');
	}

	/**
	 * Called when the client has an error with the connection.
	 * @param {Object} data
	 * @private
	 */
	// TODO: Make an error message interface and apply it here
	_onError = (data: any) => {
		this.log(`Error with connection: ${data.reason}`, 'error');
	};

	_sendTimeSync (data: IgeNetworkTimeSyncResponseFromClient) {
		// Send the time sync command
		this.send(IGE_NETWORK_TIME_SYNC, data);
	}

	/**
	 * Gets /Sets the amount of milliseconds in the past that the renderer will
	 * show updates from the stream. This allows us to interpolate from a previous
	 * position to the next position in the stream update. Updates come in and
	 * are already in the past when they are received so we need to set this
	 * latency value to something greater than the highest level of acceptable
	 * network latency. Usually this is a value between 100 and 200ms. If your
	 * game requires much tighter latency you will have to reduce the number of
	 * players / network updates / data size in order to compensate. A value of
	 * 100 in this call is the standard that most triple-A FPS games accept as
	 * normal render latency and should be OK for your game.
	 *
	 * @param latency
	 */
	renderLatency (latency?: number) {
		if (latency !== undefined) {
			this._renderLatency = latency;
			return this;
		}

		return this._renderLatency;
	}

	/**
	 * Handles receiving the start time of the stream data.
	 * @param data
	 * @private
	 */
	_onStreamTime = (data: number) => {
		this._streamDataTime = data;
	};

	_onStreamCreate = (data: IgeStreamCreateMessageData) => {
		const classId = data[0];
		const entityId = data[1];
		const parentId = data[2];
		const createDataArgs = data[3] || [];
		const transformData = data[4];
		const initialData = data[5];
		const parent = ige.$(parentId);

		// Check the required class exists
		if (parent) {
			// Check that the entity doesn't already exist
			if (!ige.$(entityId)) {
				const ClassConstructor = igeClassStore[classId];

				if (ClassConstructor) {
					console.log("Creating ", classId, createDataArgs);
					// The entity does not currently exist so create it!
					const entity = new ClassConstructor(...createDataArgs)
						.id(entityId)
						.mount(parent) as IgeEntity;

					entity.streamSectionData('transform', transformData, true);
					entity.onStreamCreateInitialData(initialData);

					// Set the just created flag which will stop the renderer
					// from handling this entity until after the first stream
					// data has been received for it
					entity._streamJustCreated = true;

					if (entity._streamEmitCreated) {
						entity.emit('streamCreated');
					}

					// Since we just created an entity through receiving stream
					// data, inform any interested listeners
					this.emit('entityCreated', entity);
				} else {
					(ige.network as IgeNetIoClientController).stop();
					ige.engine.stop();

					this.log(`Network stream cannot create entity with class "${classId}" because the class has not been defined! The engine will now stop.`, 'error');
				}
			} else {
				this.log(`Network stream received "create entity" with class "${classId}" and id "${entityId}" but an entity with that id already exists in the scenegraph!`, 'warning');
			}
		} else {
			(ige.network as IgeNetIoClientController).stop();
			ige.engine.stop();

			this.log(`Cannot properly handle network streamed entity with id "${entityId}" because it's parent with id "${parentId}" does not exist on the scenegraph!`, 'warning');
		}
	};

	_onStreamDestroy = (data: IgeStreamDestroyMessageData) => {
		const entity = ige.$(data[1]) as IgeEntity;
		console.log("Stream destroy", data);
		if (!entity) {
			return;
		}

		const destroyDelta = this._renderLatency + (ige.engine._currentTime - data[0]);

		if (destroyDelta > 0) {
			// Give the entity a lifespan to destroy it in x ms
			entity.lifeSpan(destroyDelta, () => {
				this.emit("entityDestroyed", entity);
			});

			return;
		}

		// Destroy immediately
		this.emit("entityDestroyed", entity);
		entity.destroy();
	};

	/**
	 * Called when the client receives data from the stream system.
	 * Handles decoding the data and calling the relevant entity
	 * _onStreamData() methods.
	 * @param data
	 * @private
	 */
	_onStreamData = (data: string) => {
		// Read the packet data into variables
		const sectionDataArr = data.split(this._sectionDesignator) as IgeStreamUpdateMessageData;
		const sectionDataCount = sectionDataArr.length - 1;

		// We know the first bit of data will always be the
		// target entity's ID
		const entityId = sectionDataArr.shift() as string;

		if (!entityId) return;

		// Check if the entity with this ID currently exists
		const entity = ige.$(entityId) as IgeEntity;

		if (!entity) {
			//this.log("+++ Stream: Data received for unknown entity (" + entityId + ")");
			//this.stop();
			//ige.engine.stop();
			return;
		}

		// Hold the entity's just created flag
		const justCreated = entity._streamJustCreated;

		// Get the entity stream section array
		const sectionArr = entity._streamSections;

		// Now loop the data sections array and compile the rest of the
		// data string from the data section return data
		for (let sectionIndex = 0; sectionIndex < sectionDataCount; sectionIndex++) {
			// Tell the entity to handle this section's data
			entity.streamSectionData(sectionArr[sectionIndex], sectionDataArr[sectionIndex], justCreated);
		}

		// Now that the entity has had it's first bit of data
		// reset the just created flag
		delete entity._streamJustCreated;
	}
}