import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { isClient, isServer } from "@/engine/utils/clientServer";
import type { IgeRouteDefinition } from "@/types/IgeRouteDefinition";

const PATH_DELIMITER = "/";

export class IgeRouter extends IgeBaseClass {
	classId = "IgeRouter";
	_routeLoad: Record<string, IgeRouteDefinition> = {};
	_routeUnload: Record<string, any> = {};
	_currentRoutePath: string = "";
	_routeQueue: (() => Promise<boolean | undefined | void>)[] = [];
	_executingSeries: boolean = false;

	/**
	 * Sets or gets the route handler(s) for a given path.
	 *
	 * @param path The path for the route.
	 * @param definition The definition for the route.
	 * @returns Returns this object when setting a route, returns the
	 * definition for a given path when getting a route, or returns all
	 * routes if no arguments are provided.
	 */
	route (path: string, definition: IgeRouteDefinition): this;
	route (path: string): IgeRouteDefinition;
	route (): Record<string, IgeRouteDefinition>;
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

	/**
	 * Navigate to a given path and execute the corresponding route handler(s).
	 *
	 * @param {string} path The path to navigate to.
	 * @param {...any} args Additional arguments to pass to the route handler(s).
	 * @throws {Error} If the route defined for the given path does not exist.
	 */
	async go (path: string, ...args: any[]) {
		// Check for a route definition first
		if (!this._routeLoad[path]) {
			throw new Error("Attempt to navigate to undefined route: " + path);
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
					await routeUnloadHandler(...args);
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
				this._routeUnload[loadRoutePath] = await routeHandlerFunction(...args);
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
