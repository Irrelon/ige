import IgeBaseClass from "./IgeBaseClass";
import IgeRouteController from "./IgeRouteController";
import { IgeRouteDefinition, IgeRouteDefinitionClient, IgeRouteDefinitionServer } from "../../types/IgeRouteDefinition";
import { IgeTextures } from "./IgeTextures";

type IgeRouteQueue = ((onComplete: (err: false | Error, controller: IgeRouteController) => void) => void)[];

export class Ige extends IgeBaseClass {
	isServer: boolean;
	isClient: boolean;
	_currentViewport: IgeViewport | null = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
	_currentCamera: IgeCamera | null = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
	_currentRoutePath: string = "";
	_routeQueue: IgeRouteQueue = [];
	_route: Record<string, IgeRouteDefinition> = {};
	_routeData: Record<string, IgeRouteDefinitionClient | IgeRouteDefinitionServer> = {}; // TODO: Rename to route definition
	textures: IgeTextures;

	constructor () {
		super();

		// Determine the environment we are executing in
		this.isServer = (typeof (module) !== "undefined" && typeof (module.exports) !== "undefined" && typeof window === "undefined");
		this.isClient = !this.isServer;
		this.textures = new IgeTextures(this);
	}

	/**
	 * Creates a new instance of the component argument passing
	 * the options argument to the component as it is initialised.
	 * The new component instance is then added to "this" via
	 * a property name that is defined in the component class as
	 * "componentId".
	 * @param {Function} component The class definition of the component.
	 * @param {Object=} options An options parameter to pass to the component
	 * on init.
	 * @example #Add the velocity component to an entity
	 *     var entity = new IgeEntity();
	 *     entity.addComponent(IgeVelocityComponent);
	 *
	 *     // Now that the component is added, we can access
	 *     // the component via its namespace. Call the
	 *     // "byAngleAndPower" method of the velocity component:
	 *     entity.velocity.byAngleAndPower(Math.radians(20), 0.1);
	 */
	addComponent (component, options) {
		const newComponent = new component(this, options);
		this[newComponent.componentId] = newComponent;

		// Add the component reference to the class component array
		this._components = this._components || [];
		this._components.push(newComponent);

		return this;
	}

	/**
	 * Gets / sets a route for the engine routing system.
	 * @param {String=} path The path for the route being get or set.
	 * @param {Object=} definition The definition to set to the
	 * specified path. If not passed, returns the current definition
	 * for the path.
	 * @returns {*}
	 */
	route (path: string, definition: IgeRouteDefinition) {
		if (path !== undefined) {
			if (definition !== undefined) {
				this._route = this._route || {};
				this._route[path] = definition;

				return this;
			}

			return this._route[path];
		}

		return this._route;
	}

	/**
	 * Gets / sets route data by path.
	 * @param {String} path The path to get / set data for.
	 * @param {*=} data The data to set for the path.
	 * @returns {*}
	 */
	routeData (path: string, data: any) {
		if (path !== undefined) {
			this._routeData = this._routeData || {};

			if (data !== undefined) {
				this._routeData[path] = data;
				return this;
			}

			return this._routeData[path];
		}

		return this._routeData;
	}

	/**
	 * Tells the engine to navigate to the passed path. The current
	 * path will be exited before the new path is navigated to.
	 * @param {String} path The new path to navigate to.
	 */
	go (path: string) {
		// Check for a route definition first
		if (!this._route[path]) {
			throw("Attempt to navigate to undefined route: " + path);
		}

		const currentRoutePath = this._currentRoutePath;
		const currentPathParts = currentRoutePath.split(".");
		const newPathParts = path.split(".");
		let rootPathString = "";

		// Check current path
		if (this._currentRoutePath) {
			// Remove duplicate beginning parts from arrays
			while (currentPathParts.length && newPathParts.length && currentPathParts[0] === newPathParts[0]) {
				rootPathString += "." + currentPathParts.shift();
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

	/**
	 * Adds a path section to the current path and executes the
	 * various parts of the path definition such as the designated
	 * scene graph, textures and controller.
	 * @param {String} path The path section to navigate to.
	 * @private
	 */
	_routeAdd (path: string) {
		this._currentRoutePath += this._currentRoutePath ? "." + path : path;
		const thisFullPath = this._currentRoutePath;

		const queue = this._routeQueue;

		queue.push((queueItemFinished) => {
			const routeClientServerDefinition: IgeRouteDefinition = this._route[thisFullPath];
			const routeSteps: IgeRouteQueue = [];
			const routeDefinition: IgeRouteDefinitionClient | IgeRouteDefinitionServer = this.isServer ? routeClientServerDefinition.server : routeClientServerDefinition.client;

			if (!routeDefinition.controller) {
				throw new Error(`$ige.engine._routeAdd() encountered a route that has no controller specified: ${thisFullPath}`);
			}

			this.routeData(thisFullPath, routeDefinition);

			if (this.isClient && "textures" in routeDefinition) {
				routeSteps.push((finished) => {
					//this.textures.emit("loading");
					if (!this.textures.texturesLoaded()) {
						this.textures.on("texturesLoaded", () => {
							routeDefinition.texturesModule.emit("loaded");
							finished(false);
						});
						return;
					}

					routeDefinition.texturesModule.emit("loaded");
					return finished(false);
				});
			}

			routeSteps.push((finished) => {
				routeDefinition.controllerModule.emit("loading");
				appCore.run([routeDefinition.controller, (Controller) => {
					const controller = new Controller();

					this.routeDefinition(thisFullPath).controllerModuleInstance = controller;
					routeDefinition.controllerModule.emit("loaded");
					finished(false, controller);
				}]);
			});

			if (routeDefinition.sceneGraph) {
				routeSteps.push((controller, finished) => {
					appCore.module("$controller", () => {
						return controller;
					});

					appCore
						.module(routeDefinition.sceneGraph)
						.$controller = controller;

					routeDefinition.sceneGraphModule.emit("loading");
					appCore.run([routeDefinition.sceneGraph, (sceneGraph) => {
						this.engine.addGraph(routeDefinition.sceneGraph);

						routeDefinition.sceneGraphModule.emit("loaded");
						finished(false);
					}]);
				});
			}

			routeSteps.waterfall(() => {
				if (routeDefinition.texturesModule) {
					routeDefinition.texturesModule.emit("ready");
				}
				routeDefinition.controllerModule.emit("ready");
				if (routeDefinition.sceneGraphModule) {
					routeDefinition.sceneGraphModule.emit("ready");
				}

				queueItemFinished();
			});
		});

		queue.series(() => {
		}, true);
	}

	/**
	 * Removes a path section from the current path and fires the
	 * "destroying" and finally "destroyed" events for any textures,
	 * scene graph and controller.
	 * @param {String} path The path section to navigate from.
	 * @private
	 */
	_routeRemove (path) {
		let
			routeData,
			thisFullPath,
			definition,
			queue;

		thisFullPath = this._currentRoutePath;
		queue = this._routeQueue;

		queue.push(function (finished) {
			routeData = this.routeData(thisFullPath);
			definition = this._route[thisFullPath];

			if (!routeData) {
				throw("Attempting to routeRemove() a path that has no routeData: " + thisFullPath);
			}

			if (routeData.sceneGraphModule) {
				routeData.sceneGraphModule.emit("destroying");
				this.engine.removeGraph(definition.sceneGraph);
			}

			if (routeData.texturesModule) {
				routeData.texturesModule.emit("destroying");
			}
			routeData.controllerModule.emit("destroying");

			if (routeData.sceneGraphModule) {
				routeData.sceneGraphModule.emit("destroyed");
			}

			if (routeData.texturesModule) {
				routeData.texturesModule.emit("destroyed");
			}
			routeData.controllerModule.emit("destroyed");

			this._currentRoutePath = this._currentRoutePath.replace(new RegExp("[\.]*?" + path + "$"), "");

			finished();
		});

		queue.series(function () {
		}, true);
	}
}

export const ige = new Ige();