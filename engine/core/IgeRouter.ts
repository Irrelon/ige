import { isClient, isServer } from "../services/clientServer";
import { IgeRouteDefinition } from "../../types/IgeRouteDefinition";
import { IgeBaseClass } from "./IgeBaseClass";

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

	async go (path: string) {
		// Check for a route definition first
		if (!this._routeLoad[path]) {
			throw('Attempt to navigate to undefined route: ' + path);
		}

		if (path === this._currentRoutePath) return;

		this.log(`Router navigating to: ${path}`);

		const currentRoutePath = this._currentRoutePath;
		const currentPathParts: string[] = currentRoutePath.split(PATH_DELIMITER);
		const newPathParts: string[] = path.split(PATH_DELIMITER);
		const commonPathParts: string[] = [];

		// Remove the common path parts from both arrays
		while (currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
			const part = currentPathParts.shift();
			newPathParts.shift();

			if (!part) continue;
			commonPathParts.push(part);
		}

		const rootPath = commonPathParts.join(PATH_DELIMITER);

		if (currentRoutePath) {
			// Word backwards and call the unload function for each existing path
			while (currentPathParts.length) {
				const unloadRoutePath = this._pathJoin(rootPath, currentPathParts.join(PATH_DELIMITER));

				this.logIndent();
				this.log(`Unloading route: "${unloadRoutePath}"`);
				this.logIndent();
				const routeUnloadHandler = this._routeUnload[unloadRoutePath];
				if (routeUnloadHandler) {
					await routeUnloadHandler();
				}
				this.logOutdent();
				this.logOutdent();

				currentPathParts.pop();
			}
		}

		// Now work forwards on the new path parts and mount each route
		// handler
		const newPartsAggregate: string[] = [];

		for (let i = 0; i < newPathParts.length; i++) {
			newPartsAggregate.push(newPathParts[i]);
			const loadRoutePath = this._pathJoin(rootPath, newPartsAggregate.join(PATH_DELIMITER));

			const routeHandlerDefinition = this._routeLoad[loadRoutePath];

			if (!routeHandlerDefinition) {
				continue;
			}

			let routeHandlerFunction;

			if (isClient && routeHandlerDefinition.client) {
				routeHandlerFunction = routeHandlerDefinition.client;
			}

			if (isServer && routeHandlerDefinition.server) {
				routeHandlerFunction = routeHandlerDefinition.server;
			}

			if (routeHandlerFunction) {
				this.logIndent();
				this.log(`Loading route: "${loadRoutePath}"`);
				this.logIndent();
				this._routeUnload[loadRoutePath] = await routeHandlerFunction();
				this.logOutdent();
				this.logOutdent();
			}
		}

		this._currentRoutePath = path;
	}

	_pathJoin (path1?: string, path2?: string): string {
		if (!path1 && !path2) return "";
		if (path1 && !path2) return path1;
		if (path2 && !path1) return path2;

		return path1 + PATH_DELIMITER + path2;
	}

	_routeAdd (path: string) {

	}

	_routeRemove (path?: string) {

	}

	_processQueue () {

	}
}
