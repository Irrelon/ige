import { ige } from "../../../instance";
import IgeEventingClass from "../../../core/IgeEventingClass";
import { isClient, isServer } from "../../../services/clientServer";
import type { IgeNetIoServerComponent } from "../net.io/IgeNetIoServerComponent";
import type { IgeNetIoClientComponent } from "../net.io/IgeNetIoClientComponent";
import { igeClassStore } from "../../../services/igeClassStore";
import {
	IgeStreamCreateMessageData,
	IgeStreamDestroyMessageData,
	IgeStreamUpdateMessageData
} from "../../../../types/IgeNetworkStream";
import IgeEntity from "../../../core/IgeEntity";

/**
 * Adds stream capabilities to the network system.
 */
export class IgeStreamComponent extends IgeEventingClass {
	classId = 'IgeStreamComponent';
	_sectionDesignator: string = '¬'; // Set the stream data section designator character
	_renderLatency: number = 100;
	_streamInterval: number = 50;
	_queuedData: Record<string, [string, string]> = {}; // Define the object that will hold the stream data queue
	_streamClientData = {}; // Set some stream data containers
	_streamClientCreated = {}; // Set some stream data containers
	_streamTimer?: number; // The timer / interval handle
	_streamDataTime?: number;

	init () {
		if (isServer) {
			const network = ige.network as IgeNetIoServerComponent;

			// Define the network stream command
			network.define('_igeStreamCreate');
			network.define('_igeStreamDestroy');
			network.define('_igeStreamData');
			network.define('_igeStreamTime');
		}

		if (isClient) {
			const network = ige.network as IgeNetIoClientComponent;

			// Define the network stream command
			network.define('_igeStreamCreate', this._onStreamCreate);
			network.define('_igeStreamDestroy', this._onStreamDestroy);
			network.define('_igeStreamData', this._onStreamData);
			network.define('_igeStreamTime', this._onStreamTime);
		}
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

	/* CEXCLUDE */
	/**
	 * Gets / sets the interval by which updates to the game world are packaged
	 * and transmitted to connected clients. The greater the value, the less
	 * updates are sent per second.
	 * @param {Number=} ms The number of milliseconds between stream messages.
	 */
	sendInterval (ms?: number) {
		if (ms !== undefined) {
			this.log('Setting delta stream interval to ' + (ms / ige.engine._timeScale) + 'ms');
			this._streamInterval = ms / ige.engine._timeScale;
			return this;
		}

		return this._streamInterval;
	}

	/**
	 * Starts the stream of world updates to connected clients.
	 */
	start () {
		this.log('Starting delta stream...');
		this._streamTimer = setInterval(this._sendQueue, this._streamInterval) as unknown as number;

		return this;
	}

	/**
	 * Stops the stream of world updates to connected clients.
	 */
	stop () {
		this.log('Stopping delta stream...');
		clearInterval(this._streamTimer);

		return this;
	}

	/**
	 * Queues stream data to be sent during the next stream data interval.
	 * @param {String} id The id of the entity that this data belongs to.
	 * @param {String} data The data queued for delivery to the client.
	 * @param {String} clientId The client id this data is queued for.
	 * @return {*}
	 */
	queue (id: string, data: string, clientId: string) {
		this._queuedData[id] = [data, clientId];
		return this;
	}

	/**
	 * Asks the server to send the data packets for all the queued stream
	 * data to the specified clients.
	 * @private
	 */
	_sendQueue = () => {
		const st = new Date().getTime();
		const queueObj = this._queuedData;
		const network = (ige.network as IgeNetIoServerComponent);
		const currentTime = ige.engine._currentTime;
		const hasSentTimeDataByClientId: Record<string, boolean> = {};

		// Send the stream data
		for (const queueKey in queueObj) {
			if (queueObj.hasOwnProperty(queueKey)) {
				const item = queueObj[queueKey];

				// Check if we've already sent this client the starting
				// time of the stream data
				if (!hasSentTimeDataByClientId[item[1]]) {
					// Send the stream start time
					network.send('_igeStreamTime', currentTime, item[1]);
					hasSentTimeDataByClientId[item[1]] = true;
				}
				network.send('_igeStreamData', item[0], item[1]);

				delete queueObj[queueKey];
			}

			const ct = new Date().getTime();
			const dt = ct - st;

			if (dt > this._streamInterval) {
				console.log('WARNING, Stream send is taking too long: ' + dt + 'ms');
				break;
			}
		}
	}
	/* CEXCLUDE */

	/**
	 * Handles receiving the start time of the stream data.
	 * @param data
	 * @private
	 */
	_onStreamTime = (data: number) => {
		this._streamDataTime = data;
	}

	_onStreamCreate = (data: IgeStreamCreateMessageData) => {
		const classId = data[0];
		const entityId = data[1];
		const parentId = data[2];
		const transformData = data[3];
		const createData = data[4];
		const parent = ige.$(parentId);

		// Check the required class exists
		if (parent) {
			// Check that the entity doesn't already exist
			if (!ige.$(entityId)) {
				const ClassConstructor = igeClassStore[classId];

				if (ClassConstructor) {
					// The entity does not currently exist so create it!
					const entity = new ClassConstructor(createData)
						.id(entityId)
						.mount(parent) as IgeEntity;

					entity.streamSectionData('transform', transformData, true);

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
					(ige.network as IgeNetIoClientComponent).stop();
					ige.engine.stop();

					this.log(`Network stream cannot create entity with class ${classId} because the class has not been defined! The engine will now stop.`, 'error');
				}
			}
		} else {
			this.log(`Cannot properly handle network streamed entity with id ${entityId} because it's parent with id ${parentId} does not exist on the scenegraph!`, 'warning');
		}
	}

	_onStreamDestroy = (data: IgeStreamDestroyMessageData) => {
		const entity = ige.$(data[1]) as IgeEntity;

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
	}

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
		const sectionDataCount = sectionDataArr.length;

		// We know the first bit of data will always be the
		// target entity's ID
		const entityId = sectionDataArr.shift() as string;

		if (!entityId) return;

		// Check if the entity with this ID currently exists
		const entity = ige.$(entityId) as IgeEntity;

		if (!entity) {
			this.log("+++ Stream: Data received for unknown entity (" + entityId + ")");
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