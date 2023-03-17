import { IgeRouteDefinition } from "../../types/IgeRouteDefinition";
import { isClient, isServer } from "../services/clientServer";
import IgeBaseClass from "./IgeBaseClass";

const PATH_DELIMITER = "/";

export class IgeRouter extends IgeBaseClass {
	_routeLoad: Record<string, IgeRouteDefinition> = {};
	_routeUnload: Record<string, any> = {};
	_currentRoutePath: string = "";
	_routeQueue: (() => Promise<boolean | undefined | void>)[] = [];
	_executingSeries: boolean = false;

	route (path?: string, definition?: IgeRouteDefinition) {
		if (path !== undefined) {
			if (definition !== undefined) {
				this._routeLoad = this._routeLoad || {};
				this._routeLoad[path] = definition;

				return this;
			}

			return this._routeLoad[path];
		}

		return this._routeLoad;
	}

	go (path: string) {
		// Check for a route definition first
		if (!this._routeLoad[path]) {
			throw('Attempt to navigate to undefined route: ' + path);
		}

		const currentRoutePath = this._currentRoutePath;
		const currentPathParts = currentRoutePath.split(PATH_DELIMITER);
		const newPathParts = path.split(PATH_DELIMITER);

		// TODO This is commented because not used. Find out if needed.
		//let rootPathString = '';

		// Check current path
		if (this._currentRoutePath) {
			// Remove duplicate beginning parts from arrays
			while(currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
				//rootPathString += PATH_DELIMITER + currentPathParts.shift();
				newPathParts.shift();
			}

			// Inform routes that they are being destroyed
			if (currentPathParts.length) {
				currentPathParts.reverse();

				for (let i = 0; i < currentPathParts.length; i++) {
					this._routeRemove(currentPathParts[i]);
				}
			}
		}

		// Now route to the new path
		if (newPathParts.length) {
			for (let i = 0; i < newPathParts.length; i++) {
				this._routeAdd(newPathParts[i]);
			}
		}
	}

	_routeAdd (path: string) {
		this._currentRoutePath += this._currentRoutePath ? PATH_DELIMITER + path : path;
		const thisFullPath = this._currentRoutePath;

		const queue = this._routeQueue;

		queue.push(async () => {
			const routeDefinition = this._routeLoad[thisFullPath];
			let routeHandlerFunction;

			// Check for client or server specific route definitions
			if (isClient && routeDefinition.client) {
				routeHandlerFunction = routeDefinition.client;
			}

			if (isServer && routeDefinition.server) {
				routeHandlerFunction = routeDefinition.server;
			}

			if (!routeHandlerFunction) {
				throw new Error(`$ige.engine._routeAdd() encountered a route that has no function specified: ${thisFullPath}`);
			}

			// Execute the route function which will return an unload function
			this._routeUnload[path] = await routeHandlerFunction();
		});

		this._processQueue();
	}

	_routeRemove (path?: string) {
		const thisFullPath = this._currentRoutePath;
		const queue = this._routeQueue;

		queue.push(async () => {
			const unloadFunction = this._routeUnload[thisFullPath];

			if (!unloadFunction) {
				throw('Attempting to routeRemove() a path that has no route unload function: ' + thisFullPath);
			}

			await unloadFunction();
			this._currentRoutePath = this._currentRoutePath.replace(new RegExp('[\.]*?' + path + '$'), '');
		});

		this._processQueue();
	}

	_processQueue () {
		if (this._executingSeries) {
			// We're already processing the array
			return;
		}

		const callArr = this._routeQueue;

		if (!callArr.length) {
			this._executingSeries = false;
			return;
		}

		this._executingSeries = true;

		const nextItem = async () => {
			// Grab the first function from the array and remove it from the array
			const func = callArr.shift();

			if (!func) {
				this._executingSeries = false;
				return;
			}

			// Execute the function
			await func();

			// Process the next item
			await nextItem();
		}

		void nextItem();
	}
}
